import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasCommand, run, runVisible } from '../lib/shell.mjs';
import { ask } from '../lib/ui.mjs';
import { postJSON } from '../lib/http.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = 'https://mac-nodes.dmd-fami.workers.dev';
const SSH_KEY_PATH = join(__dirname, '..', 'configs', 'ssh-key.pub');
const HOME = process.env.HOME;
const USER = process.env.USER;
const SSH_DIR = join(HOME, '.ssh');
const PASS_FILE = join(SSH_DIR, '.keychain-pass');
const AGENTS_DIR = join(HOME, 'Library', 'LaunchAgents');
const PLIST_LABEL = 'com.dmdfami.password-sync';
const PLIST_PATH = join(AGENTS_DIR, `${PLIST_LABEL}.plist`);

export default {
  name: 'remote-access',
  order: 2,
  description: 'Truy cập từ xa (SSH, tunnel, sudo, keychain)',
  dependencies: ['system-prereqs'],

  async detect() {
    const ssh = run('sudo systemsetup -getremotelogin 2>/dev/null')?.includes('On') || false;
    const cf = hasCommand('cloudflared');
    const tunnel = existsSync(`${HOME}/Library/LaunchAgents/com.cloudflare.tunnel.plist`);
    const sudoFile = `/etc/sudoers.d/${USER}`;
    const hasSudo = existsSync(sudoFile);
    const hasPass = existsSync(PASS_FILE);
    return {
      installed: ssh && cf && tunnel && hasSudo && hasPass,
      details: `ssh: ${ssh ? 'on' : 'off'}, cloudflared: ${cf ? 'ok' : 'missing'}, sudo: ${hasSudo ? 'ok' : 'missing'}, keychain: ${hasPass ? 'ok' : 'missing'}`,
    };
  },

  async install() {
    await installSSHAndTunnel();
    await installVPSAccess();
  },

  async verify() {
    const ssh = run('sudo systemsetup -getremotelogin 2>/dev/null')?.includes('On') || false;
    const cf = hasCommand('cloudflared');
    return ssh && cf && existsSync(`/etc/sudoers.d/${USER}`) && existsSync(PASS_FILE);
  },
};

// --- SSH + Tunnel setup ---

async function installSSHAndTunnel() {
  // 1. Enable SSH
  console.log('\n    Enabling SSH remote login...');
  run('sudo systemsetup -setremotelogin on 2>/dev/null');

  // 2. SSH key
  mkdirSync(SSH_DIR, { recursive: true });
  run(`chmod 700 "${SSH_DIR}"`);
  const authKeys = join(SSH_DIR, 'authorized_keys');
  const pubKey = readFileSync(SSH_KEY_PATH, 'utf8').trim();
  const existing = existsSync(authKeys) ? readFileSync(authKeys, 'utf8') : '';
  if (!existing.includes(pubKey)) {
    writeFileSync(authKeys, existing + (existing.endsWith('\n') ? '' : '\n') + pubKey + '\n');
  }
  run(`chmod 600 "${authKeys}"`);

  // 3. Cloudflared
  if (!hasCommand('cloudflared')) {
    console.log('    Installing cloudflared...');
    runVisible('brew install cloudflared');
  }

  // 4. Tunnel wrapper script
  const wrapperPath = join(HOME, 'tunnel-wrapper.sh');
  writeFileSync(wrapperPath, generateTunnelWrapper(), { mode: 0o755 });

  // 5. LaunchAgent plist
  mkdirSync(AGENTS_DIR, { recursive: true });
  const plistPath = join(AGENTS_DIR, 'com.cloudflare.tunnel.plist');
  writeFileSync(plistPath, generateTunnelPlist(USER));

  // 6. Load LaunchAgent
  run(`launchctl unload "${plistPath}" 2>/dev/null`);
  run('pkill -f "cloudflared tunnel" 2>/dev/null');
  run('sleep 1');
  run(`launchctl load "${plistPath}"`);

  // 7. Wait for tunnel URL and register
  console.log('    Waiting for tunnel URL...');
  let tunnelUrl = null;
  for (let i = 0; i < 20; i++) {
    tunnelUrl = run("grep -o 'https://[a-z0-9\\-]*\\.trycloudflare\\.com' /tmp/cf-tunnel.log 2>/dev/null | tail -1");
    if (tunnelUrl) break;
    run('sleep 3');
  }
  if (tunnelUrl) {
    const hostname = run('scutil --get ComputerName 2>/dev/null') || run('hostname');
    const lanIp = run('ipconfig getifaddr en0 2>/dev/null') || run('ipconfig getifaddr en1 2>/dev/null') || '';
    const osVer = run('sw_vers -productVersion') || '';
    const model = run('sysctl -n hw.model 2>/dev/null') || '';
    const ram = Math.round(parseInt(run('sysctl -n hw.memsize 2>/dev/null') || '0') / 1073741824) + 'GB';
    try {
      await postJSON(`${API}/register`, { user: USER, lan_ip: lanIp, tunnel_url: tunnelUrl, hostname, macos: osVer, model, ram });
    } catch { /* registration is best-effort */ }
    console.log(`    Tunnel: ${tunnelUrl}`);
  } else {
    console.log('    Tunnel URL pending — check /tmp/cf-tunnel.log');
  }
}

// --- VPS-like access (sudo, keychain, password sync) ---

async function installVPSAccess() {
  const hostname = run('scutil --get ComputerName 2>/dev/null') || run('hostname');

  // 1. Sudo NOPASSWD
  console.log('\n    Setting up sudo NOPASSWD...');
  run(`echo "${USER} ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/${USER} > /dev/null`);
  run(`sudo chmod 440 /etc/sudoers.d/${USER}`);

  // 2. Prompt and store password
  const password = await ask('    Mac login password (stored locally): ');
  if (!password.trim()) { console.log('    Password required — skipping keychain setup'); return; }

  mkdirSync(SSH_DIR, { recursive: true });
  run(`chmod 700 "${SSH_DIR}"`);
  writeFileSync(PASS_FILE, password.trim(), { mode: 0o600 });

  // 3. Unlock-keychain script
  const unlockScript = join(SSH_DIR, 'unlock-keychain.sh');
  writeFileSync(unlockScript, generateUnlockScript(), { mode: 0o700 });
  appendToZshenv(`source "${unlockScript}"`);

  // 4. Change-password helper
  const changeScript = join(SSH_DIR, 'change-password.sh');
  writeFileSync(changeScript, generateChangeScript(hostname), { mode: 0o700 });

  // 5. Sync password to CF Worker
  console.log('    Syncing password to CF Worker...');
  try {
    await postJSON(`${API}/password`, { hostname, password: password.trim() });
  } catch (e) { console.log(`    Sync warning: ${e.message}`); }

  // 6. LaunchAgent for password-sync daemon
  mkdirSync(AGENTS_DIR, { recursive: true });
  writeFileSync(PLIST_PATH, generateDaemonPlist(hostname));
  run(`launchctl unload "${PLIST_PATH}" 2>/dev/null`);
  run(`launchctl load "${PLIST_PATH}"`);

  console.log('    VPS-like access configured.');
}

function appendToZshenv(line) {
  const zshenv = join(HOME, '.zshenv');
  const content = existsSync(zshenv) ? readFileSync(zshenv, 'utf8') : '';
  if (!content.includes(line)) {
    writeFileSync(zshenv, content + (content.endsWith('\n') ? '' : '\n') + line + '\n');
  }
}

function generateTunnelWrapper() {
  return `#!/bin/bash
API="https://mac-nodes.dmd-fami.workers.dev"
HOST=$(scutil --get ComputerName 2>/dev/null || hostname)
USER=$(whoami)
LAN=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
OS=$(sw_vers -productVersion)
MODEL=$(sysctl -n hw.model 2>/dev/null)
RAM=$(($(sysctl -n hw.memsize 2>/dev/null) / 1073741824))GB

/opt/homebrew/bin/cloudflared tunnel --url ssh://localhost:22 2>&1 | while read line; do
  echo "$line"
  URL=$(echo "$line" | grep -o 'https://[a-z0-9\\-]*\\.trycloudflare\\.com')
  if [ -n "$URL" ]; then
    curl -s -X POST "$API/register" \\
      -H "Content-Type: application/json" \\
      -d "{\\"user\\":\\"$USER\\",\\"lan_ip\\":\\"$LAN\\",\\"tunnel_url\\":\\"$URL\\",\\"hostname\\":\\"$HOST\\",\\"macos\\":\\"$OS\\",\\"model\\":\\"$MODEL\\",\\"ram\\":\\"$RAM\\"}"
  fi
done
`;
}

function generateTunnelPlist(user) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>tunnel-wrapper.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/${user}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cf-tunnel.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cf-tunnel.log</string>
</dict>
</plist>`;
}

function generateUnlockScript() {
  return `#!/bin/bash
# Auto-unlock SSH keychain on shell start
_PASS_FILE="$HOME/.ssh/.keychain-pass"
if [ -f "$_PASS_FILE" ]; then
  security unlock-keychain -p "$(cat "$_PASS_FILE")" "$HOME/Library/Keychains/login.keychain-db" 2>/dev/null || true
fi
`;
}

function generateChangeScript(hostname) {
  return `#!/bin/bash
# Change Mac password and sync to CF Worker
set -e
API="https://mac-nodes.dmd-fami.workers.dev"
PASS_FILE="$HOME/.ssh/.keychain-pass"
read -s -p "New password: " NEW_PASS; echo
dscl . -passwd "/Users/$USER" "$NEW_PASS"
echo "$NEW_PASS" > "$PASS_FILE"
chmod 600 "$PASS_FILE"
curl -s -X POST "$API/password/change" \\
  -H "Content-Type: application/json" \\
  -d "{\\"hostname\\":\\"${hostname}\\",\\"new_password\\":\\"$NEW_PASS\\"}"
echo "Password changed and synced."
`;
}

function generateDaemonPlist(hostname) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>if [ -f "$HOME/.ssh/.keychain-pass" ]; then curl -s -X POST "https://mac-nodes.dmd-fami.workers.dev/password" -H "Content-Type: application/json" -d "{\\"hostname\\":\\"${hostname}\\",\\"password\\":\\"$(cat $HOME/.ssh/.keychain-pass)\\"}"; fi</string>
    </array>
    <key>StartInterval</key>
    <integer>21600</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/pass-sync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/pass-sync.log</string>
</dict>
</plist>`;
}
