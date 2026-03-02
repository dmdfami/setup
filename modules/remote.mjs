import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasCommand, run, runVisible } from '../lib/shell.mjs';
import { postJSON } from '../lib/http.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = 'https://mac-nodes.dmd-fami.workers.dev';
const SSH_KEY_PATH = join(__dirname, '..', 'configs', 'ssh-key.pub');

export default {
  name: 'remote',
  order: 2,
  description: 'SSH Remote access + Cloudflare Tunnel',
  dependencies: ['system-prereqs'],

  async detect() {
    const ssh = run('sudo systemsetup -getremotelogin 2>/dev/null')?.includes('On') || false;
    const cf = hasCommand('cloudflared');
    const tunnel = existsSync(`${process.env.HOME}/Library/LaunchAgents/com.cloudflare.tunnel.plist`);
    return {
      installed: ssh && cf && tunnel,
      details: `ssh: ${ssh ? 'on' : 'off'}, cloudflared: ${cf ? 'ok' : 'missing'}, tunnel: ${tunnel ? 'ok' : 'missing'}`,
    };
  },

  async install() {
    const home = process.env.HOME;
    const user = process.env.USER;

    // 1. Enable SSH
    console.log('\n    Enabling SSH remote login...');
    run('sudo systemsetup -setremotelogin on 2>/dev/null');

    // 2. SSH key
    const sshDir = join(home, '.ssh');
    mkdirSync(sshDir, { recursive: true });
    run(`chmod 700 "${sshDir}"`);
    const authKeys = join(sshDir, 'authorized_keys');
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
    const wrapperPath = join(home, 'tunnel-wrapper.sh');
    writeFileSync(wrapperPath, generateTunnelWrapper(), { mode: 0o755 });

    // 5. LaunchAgent plist
    const agentsDir = join(home, 'Library', 'LaunchAgents');
    mkdirSync(agentsDir, { recursive: true });
    const plistPath = join(agentsDir, 'com.cloudflare.tunnel.plist');
    writeFileSync(plistPath, generatePlist(user));

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
        await postJSON(`${API}/register`, { user, lan_ip: lanIp, tunnel_url: tunnelUrl, hostname, macos: osVer, model, ram });
      } catch { /* registration is best-effort */ }
      console.log(`    Tunnel: ${tunnelUrl}`);
    } else {
      console.log('    Tunnel URL pending — check /tmp/cf-tunnel.log');
    }
  },

  async verify() {
    const ssh = run('sudo systemsetup -getremotelogin 2>/dev/null')?.includes('On') || false;
    const cf = hasCommand('cloudflared');
    return ssh && cf;
  },
};

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

function generatePlist(user) {
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
