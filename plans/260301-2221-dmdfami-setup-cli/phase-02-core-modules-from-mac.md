# Phase 2: Core Modules (from dmdfami/mac)

## Overview
- **Priority**: P1
- **Status**: ✅ COMPLETE
- **Effort**: 3h
- **Completed**: 2026-03-02
- **Depends on**: Phase 1

Port `dmdfami/mac` setup.sh into 3 modular files + move configs. Each module follows interface from Phase 1.

## Completion Status

Core modules implemented and tested. Refactored to delegation pattern: `remote.mjs` delegates SSH+tunnel setup to `npx dmdfami/mac` for independence.

## Context
- Source: [dmdfami/mac setup.sh](https://github.com/dmdfami/mac) — 6-step monolithic bash
- Existing CF Worker: `mac-nodes.dmd-fami.workers.dev`

## Source → Module Mapping

| setup.sh step | Target module | Notes |
|---------------|---------------|-------|
| [1/6] Homebrew | modules/homebrew.mjs | + Brewfile support |
| [2/6] Node.js | modules/homebrew.mjs | Part of homebrew (brew install node) |
| [3/6] SSH + key | modules/remote.mjs | SSH enable + authorized_keys |
| [4/6] cloudflared | modules/remote.mjs | Part of remote |
| [5/6] Tunnel wrapper + LaunchAgent | modules/remote.mjs | tunnel-wrapper.sh + plist |
| [6/6] Claude CLI | modules/claude-cli.mjs | Install + credential export |

## Files to Create

| File | Purpose |
|------|---------|
| `modules/homebrew.mjs` | Homebrew install + node via brew |
| `modules/remote.mjs` | SSH + cloudflared + tunnel + worker registration |
| `modules/claude-cli.mjs` | Claude Code install + credentials export |
| `configs/ssh-key.pub` | Public SSH key (from setup.sh) |

## Implementation Steps

### 1. modules/homebrew.mjs (~60 lines)
```javascript
export default {
  name: 'homebrew',
  description: 'Homebrew + Node.js',
  dependencies: [],

  async detect() {
    const brew = hasCommand('brew');
    const node = hasCommand('node');
    return {
      installed: brew && node,
      details: `brew: ${brew ? 'OK' : 'missing'}, node: ${node ? 'OK' : 'missing'}`
    };
  },

  async install() {
    if (!hasCommand('brew')) {
      // NONINTERACTIVE=1 /bin/bash -c "$(curl ...)"
      // Add to .zprofile: eval "$(/opt/homebrew/bin/brew shellenv)"
    }
    if (!hasCommand('node')) {
      // brew install node
    }
    // Ensure PATH in .zshenv
  },

  async verify() {
    return hasCommand('brew') && hasCommand('node');
  }
};
```
- `hasCommand()` helper: `execSync('command -v X')` wrapped in try/catch

### 2. modules/remote.mjs (~120 lines)
Most complex module. Port from setup.sh steps 3-5:

**detect():**
- Check SSH enabled: `systemsetup -getremotelogin`
- Check authorized_keys contains our public key
- Check cloudflared installed
- Check LaunchAgent exists + tunnel running

**install():**
1. `sudo systemsetup -setremotelogin on`
2. Append SSH public key from `configs/ssh-key.pub`
3. `brew install cloudflared` if missing
4. Write `~/tunnel-wrapper.sh` (inline or from template)
5. Write LaunchAgent plist (replace USERPLACEHOLDER)
6. Load LaunchAgent
7. Wait for tunnel URL, register with CF Worker

**verify():**
- SSH accessible, tunnel URL registered

### 3. modules/claude-cli.mjs (~50 lines)

**detect():**
- Check `claude` command exists
- Check `~/.claude/.credentials.json` exists

**install():**
1. `npm install -g @anthropic-ai/claude-code` if missing
2. Export credentials from Keychain if available
3. Fallback: check `.credentials` → rename to `.credentials.json`

**verify():**
- `claude --version` succeeds

### 4. configs/ssh-key.pub
Extract from setup.sh:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFi38QEU6BlyGvfozRqZh9VKynr51NwUMjUHMOdmM5Gj export@vietnam-plywood.com
```

### 5. Shared helper: lib/shell.mjs (~30 lines)
```javascript
import { execSync } from 'node:child_process';

export function hasCommand(cmd) {
  try { execSync(`command -v ${cmd}`, { stdio: 'pipe' }); return true; }
  catch { return false; }
}

export function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
}

export function runVisible(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}
```

## Todo List
- [x] Create lib/shell.mjs (hasCommand, run, runVisible helpers)
- [x] Implement modules/homebrew.mjs (detect/install/verify)
- [x] Implement modules/remote.mjs (delegates to dmdfami/mac)
- [x] Implement modules/claude-cli.mjs (install + creds)
- [x] Create configs/ssh-key.pub
- [x] Test each module individually
- [x] Test full flow: `node bin/cli.mjs` with real modules

## Success Criteria
- [x] `homebrew.mjs`: detects brew+node, installs if missing, idempotent
- [x] `remote.mjs`: delegates to independent dmdfami/mac module
- [x] `claude-cli.mjs`: installs Claude CLI, exports credentials
- [x] All modules idempotent — re-run changes nothing if already configured

## Risk Assessment
- **sudo required**: `systemsetup -setremotelogin on` needs sudo. Mitigation: prompt user, explain why.
- **Tunnel URL timing**: tunnel-wrapper.sh needs time to get URL. Mitigation: poll log file with timeout (existing pattern from setup.sh works).
- **Keychain access**: `security find-generic-password` may prompt for permission. Mitigation: fallback to file check.

## Security Considerations
- SSH public key already public in repo — acceptable
- Private keys never touched by this tool
- Credentials export: only from local Keychain to local file (no network)

## Next Steps
- Phase 3: Port skills module
