# Modules Guide - dmdfami/setup

Complete reference for all 7 setup modules, including architecture, configuration, and customization.

## Module Overview

| # | Module | File | Dependencies | Purpose |
|---|--------|------|--------------|---------|
| 1 | System Prerequisites | `modules/system-prereqs.mjs` | None | Homebrew + Node.js |
| 2 | Remote Access | `modules/remote-access.mjs` | None | SSH, Cloudflare Tunnel, sudo, keychain |
| 3 | AI Skills | `modules/skills.mjs` | None | CK skills installer |
| 4 | AI CLI Tools | `modules/ai-cli-tools.mjs` | system-prereqs | Claude, Codex, Gemini, etc. |
| 5 | Terminal Shortcuts | `modules/shortcuts.mjs` | system-prereqs | Aliases, functions, ~/bin scripts |
| 6 | Dev Tools | `modules/dev-tools.mjs` | system-prereqs | Brew packages + npm globals |
| 7 | Dotfiles | `modules/dotfiles.mjs` | system-prereqs | Shell config sync |

## Module 1: System Prerequisites

**File**: `modules/system-prereqs.mjs`
**Order**: 1
**Dependencies**: None
**UI Label**: "Công cụ hệ thống (Homebrew, Node.js)"

### What it Does

Installs foundational tools required by other modules:
- **Homebrew** - macOS package manager
- **Node.js** - JavaScript runtime

### Detection

```javascript
async detect() {
  return {
    installed: hasCommand('brew') && hasCommand('node'),
    details: `brew: v4.2.1, node: v18.14.0`
  };
}
```

### Installation Flow

1. **Homebrew check** - If missing, run official install script
   ```bash
   NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Add to .zprofile** - Enable brew in login shells
   ```bash
   eval "$(/opt/homebrew/bin/brew shellenv)"
   ```

3. **Add to .zshenv** - Ensure brew PATH in SSH sessions
   ```bash
   export PATH=/opt/homebrew/bin:/opt/homebrew/sbin:$PATH
   ```

4. **Node.js check** - If missing, install via brew
   ```bash
   brew install node
   ```

### Verification

```javascript
async verify() {
  return hasCommand('brew') && hasCommand('node');
}
```

Both must be present and executable.

### Configuration

No configuration files. Uses system defaults:
- **Homebrew location**: `/opt/homebrew` (Apple Silicon) or `/usr/local` (Intel)
- **Node.js version**: Latest LTS via `brew install node`

### Troubleshooting

**Issue**: Homebrew fails to install
```bash
# Manual installation
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Issue**: `brew` command not found after installation
```bash
# Add to PATH manually
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
```

**Issue**: Node.js doesn't install via brew
```bash
brew install node
# Or use nvm as alternative
```

---

## Module 2: Remote Access

**File**: `modules/remote-access.mjs`
**Order**: 2
**Dependencies**: None
**UI Label**: "Truy cập từ xa (SSH, tunnel, sudo, keychain)"

### What it Does

Delegates to `npx dmdfami/mac` which handles:
- SSH key generation and setup
- Cloudflare Tunnel configuration
- sudo/sudoedit passwordless integration
- macOS Keychain integration

### Detection

```javascript
async detect() {
  return {
    installed: false,
    details: 'Chạy npx dmdfami/mac để kiểm tra'
  };
}
```

Always shows as not installed (to allow re-running configuration).

### Installation

```javascript
async install() {
  console.log('Đang chạy dmdfami/mac...\n');
  runVisible('npx -y dmdfami/mac');
}
```

Delegates entirely to the `dmdfami/mac` package.

### Verification

```javascript
async verify() {
  return true;  // Always succeeds
}
```

Assumes `dmdfami/mac` handles its own verification.

### External Dependency

**Package**: `dmdfami/mac` (separate npm package)
**Repository**: github.com/dmdfami/mac
**Command**: `npx dmdfami/mac`

This module cannot function without the external package.

### Configuration

No local configuration. All config managed by `dmdfami/mac`.

---

## Module 3: AI Skills

**File**: `modules/skills.mjs`
**Order**: 3
**Dependencies**: None
**UI Label**: "Bộ kỹ năng AI (CK skills, agents, rules)"

### What it Does

Installs AI skills pack via `npx dmdfami/skill`:
- CK (ClaudeKit) skills directories
- Agent templates
- Development rules and guidelines
- Pre-configured workflows

### Detection

```javascript
async detect() {
  const claudeDir = join(homedir(), '.claude');
  const skills = countItems(join(claudeDir, 'skills'));
  const agents = countItems(join(claudeDir, 'agents'));

  return {
    installed: skills + agents > 0,
    details: `${skills} skills, ${agents} agents`
  };
}
```

Counts items in `~/.claude/skills/` and `~/.claude/agents/` directories.

### Installation

```javascript
async install() {
  console.log('Đang chạy dmdfami/skill...\n');
  runVisible('npx -y dmdfami/skill');
}
```

Delegates to `dmdfami/skill` package.

### Verification

```javascript
async verify() {
  const claudeDir = join(homedir(), '.claude');
  return countItems(join(claudeDir, 'skills')) > 0;
}
```

Checks if at least one skill was installed.

### External Dependency

**Package**: `dmdfami/skill` (separate npm package)
**Repository**: github.com/dmdfami/skill
**Command**: `npx dmdfami/skill`

### Configuration

No local configuration. Managed by `dmdfami/skill`.

### Post-Installation

After installation, skills become available in Claude Code CLI:
```bash
claude --skill list              # List installed skills
claude --skill use {skill-name}  # Use a skill
```

---

## Module 4: AI CLI Tools

**File**: `modules/ai-cli-tools.mjs`
**Order**: 4
**Dependencies**: system-prereqs
**UI Label**: "Công cụ AI dòng lệnh (Claude, Codex, Gemini...)"

### What it Does

Interactive installation of 10 AI CLI tools with version detection.

### Supported Tools

```javascript
const AI_TOOLS = [
  { name: 'Claude Code', cmd: 'claude', install: 'npm i -g @anthropic-ai/claude-code', type: 'npm' },
  { name: 'Codex CLI', cmd: 'codex', install: 'npm i -g @openai/codex', type: 'npm' },
  { name: 'Gemini CLI', cmd: 'gemini', install: 'brew install gemini-cli', type: 'brew' },
  { name: 'ClaudeKit', cmd: 'ck', install: 'npm i -g claudekit-cli', type: 'npm' },
  { name: 'CCS', cmd: 'ccs', install: 'npm i -g @kaitranntt/ccs', type: 'npm' },
  { name: 'Repomix', cmd: 'repomix', install: 'npm i -g repomix', type: 'npm' },
  { name: 'Firecrawl', cmd: 'firecrawl', install: 'npm i -g firecrawl-cli', type: 'npm' },
  { name: 'Copilot CLI', cmd: null, install: 'gh extension install github/gh-copilot', type: 'gh-ext' },
  { name: 'Droid CLI', cmd: 'droid', install: 'npm i -g @anthropic-ai/droid', type: 'npm' },
  { name: 'Antigravity', cmd: null, install: 'brew install --cask antigravity-tools', type: 'cask', detect: () => ... },
];
```

### Detection

```javascript
async detect() {
  const results = AI_TOOLS.map(t => ({
    name: t.name,
    installed: t.detect ? t.detect() : hasCommand(t.cmd),
    version: t.cmd ? getVersion(t.cmd) : null,
  }));
  return {
    installed: results.filter(r => r.installed).length > 0,
    details: `${installed}/${total} tools installed`
  };
}
```

### Installation (Interactive)

1. Detect missing tools
2. Display numbered menu:
   ```
   Missing AI tools:
     [1] Claude Code
     [2] Codex CLI
     ...
     [N] All
   ```
3. Prompt: `Install which? ` (accepts numbers, ranges, "all")
4. Install selected tools with error handling
5. Special handling for Claude Code credentials

### Claude Code Keychain Integration

After Claude Code installation (or if already installed):

```javascript
function exportClaudeCredentials() {
  // Extract from macOS Keychain
  const cred = run('security find-generic-password -s "Claude Code-credentials" -w');

  // Validate JSON
  try { JSON.parse(cred); } catch { return; }

  // Write with restricted permissions (user read/write only)
  writeFileSync(credFile, cred, { mode: 0o600 });
}
```

This enables Claude Code to work in SSH sessions without re-authentication.

### Verification

```javascript
async verify() {
  return AI_TOOLS.some(t => t.detect ? t.detect() : hasCommand(t.cmd));
}
```

At least one tool must be installed.

### Configuration

No JSON config. Tools hardcoded in module (allows quick updates).

To add a new tool:
1. Edit `modules/ai-cli-tools.mjs`
2. Add to `AI_TOOLS` array
3. Set `name`, `cmd`, `install`, `type`
4. Optional: add `detect()` function for cask/app detection

---

## Module 5: Terminal Shortcuts

**File**: `modules/shortcuts.mjs`
**Order**: 5
**Dependencies**: system-prereqs
**UI Label**: "Phím tắt & alias terminal"

### What it Does

1. Generate shell shortcuts from `configs/aliases.json`
2. Install to `~/.dmdfami/shortcuts.sh`
3. Source in user's `.zshrc`
4. Copy executable scripts to `~/bin/`

### Configuration File

**Location**: `configs/aliases.json`

```json
{
  "aliases": {
    "ll": "ls -lah",
    "gs": "git status",
    "ck": "claude --help"
  },
  "global_aliases": {
    "G": "| grep",
    "L": "| less"
  },
  "functions": {
    "mkcd": "mkdir -p \"$1\" && cd \"$1\"",
    "weather": "curl -s 'https://wttr.in?format=3'"
  }
}
```

### Generated Script

From aliases.json, generates `~/.dmdfami/shortcuts.sh`:

```bash
#!/bin/bash
# Generated by dmdfami/setup — do not edit manually

# Aliases
alias ll='ls -lah'
alias gs='git status'

# Global aliases (zsh only)
alias -g G='| grep'
alias -g L='| less'

# Functions
mkcd() { mkdir -p "$1" && cd "$1" }
weather() { curl -s 'https://wttr.in?format=3' }

# PATH
export PATH="$HOME/bin:$PATH"
```

### Shell Integration

Non-destructive source line added to `~/.zshrc`:

```bash
[ -f ~/.dmdfami/shortcuts.sh ] && source ~/.dmdfami/shortcuts.sh
```

Never overwrites existing content; appends only.

### Binary Scripts

Copies scripts from `dotfiles/bin/` to `~/bin/`:

```javascript
const BIN_SCRIPTS = ['mac', 'qall', 'wp', 'wp-mcp', 'wp-testastra-mcp'];
```

Each script:
- Must exist in `dotfiles/bin/`
- Copied to `~/bin/` with executable permissions (0o755)
- Can be custom shell, python, node, etc.

### Detection

```javascript
async detect() {
  const zshrc = readFileSync('~/.zshrc', 'utf8');
  const hasBin = existsSync('~/bin/mac');

  return {
    installed: zshrc.includes('.dmdfami/shortcuts.sh') && hasBin,
    details: `source: ${hasSource ? 'ok' : 'missing'}, ~/bin: ${hasBin ? 'ok' : 'missing'}`
  };
}
```

### Verification

```javascript
async verify() {
  const zshrc = readFileSync('~/.zshrc', 'utf8');
  return zshrc.includes('.dmdfami/shortcuts.sh');
}
```

Checks only for source line (binary scripts optional).

### Customization

**To add new aliases**:
1. Edit `configs/aliases.json`
2. Add to `aliases`, `global_aliases`, or `functions` objects
3. Re-run `npx dmdfami-setup shortcuts`
4. Open new terminal to activate

**To add new binary scripts**:
1. Create script in `dotfiles/bin/{script-name}`
2. Make executable: `chmod +x dotfiles/bin/{script-name}`
3. Add filename to `BIN_SCRIPTS` array in `modules/shortcuts.mjs`
4. Re-run setup

---

## Module 6: Dev Tools

**File**: `modules/dev-tools.mjs`
**Order**: 6
**Dependencies**: system-prereqs
**UI Label**: "Công cụ phát triển (brew + npm)"

### What it Does

1. Install Homebrew packages via `brew bundle`
2. Install npm global packages

### Homebrew Packages

**Configuration**: `configs/Brewfile`

Standard Homebrew format. Example:

```
# Development tools
brew "cloudflared"      # Cloudflare Tunnel
brew "ffmpeg"           # Media processing
brew "gh"               # GitHub CLI
brew "go"               # Go runtime
brew "tmux"             # Terminal multiplexer
brew "yt-dlp"           # Video downloader
brew "mosh"             # SSH alternative
brew "pipx"             # Python app installer

# Optional casks
cask "visual-studio-code"
cask "docker"
```

Installation:

```bash
brew bundle --file="configs/Brewfile" --no-lock
```

Detection checks for key tools:

```javascript
const brewPkgs = ['cloudflared', 'ffmpeg', 'gh', 'go', 'tmux', 'yt-dlp', 'mosh', 'pipx'];
const installed = brewPkgs.filter(p => hasCommand(p)).length;
return { installed: installed > 4, details: `${installed}/${brewPkgs.length} brew tools` };
```

### npm Global Packages

**Configuration**: `configs/npm-globals.json`

```json
{
  "packages": [
    {
      "name": "repomix",
      "package": "repomix",
      "cmd": "repomix",
      "description": "Repository compaction tool"
    },
    {
      "name": "ts-node",
      "package": "ts-node",
      "cmd": "ts-node"
    }
  ]
}
```

Installation:

```bash
npm i -g repomix ts-node
```

Detection filters missing packages:

```javascript
const npmGlobals = JSON.parse(readFileSync('configs/npm-globals.json'));
const missing = npmGlobals.packages.filter(p => !hasCommand(p.cmd || p.name));
```

### Error Handling

Brew and npm failures don't block:

```javascript
try { runVisible('brew bundle ...'); }
catch { console.log('Some brew packages may have failed — continuing'); }

for (const pkg of missing) {
  try { runVisible(`npm i -g ${pkg.package || pkg.name}`); }
  catch { console.log(`Failed: ${pkg.name}`); }
}
```

### Verification

```javascript
async verify() {
  return hasCommand('gh') && hasCommand('tmux');
}
```

Checks for at least 2 key tools.

### Customization

**To add brew packages**:
1. Edit `configs/Brewfile`
2. Add `brew "package-name"` or `cask "app-name"`
3. Re-run setup

**To add npm globals**:
1. Edit `configs/npm-globals.json`
2. Add object to `packages` array
3. Set `cmd` to command name for detection
4. Re-run setup

---

## Module 7: Dotfiles

**File**: `modules/dotfiles.mjs`
**Order**: 7
**Dependencies**: system-prereqs
**UI Label**: "Đồng bộ cấu hình shell (.zshrc, PATH...)"

### What it Does

1. Copy portable shell config from `dotfiles/zshrc`
2. Install to `~/.dmdfami/dotfiles/zshrc`
3. Source in user's `.zshrc`

### Configuration File

**Location**: `dotfiles/zshrc`

Portable shell configuration that's version-controlled:

```bash
# Example dotfiles/zshrc
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
export HISTFILE=~/.zsh_history
export HISTSIZE=50000
export SAVEHIST=50000

# Custom settings
export EDITOR=vim
export PAGER=less

# Custom prompt (optional)
PROMPT='%n@%m:%~$ '
```

Can include:
- Zsh options and configuration
- Environment variables
- Custom functions
- Prompt configuration
- Anything shell-related EXCEPT shell-specific features

### Installation Flow

1. Create `~/.dmdfami/dotfiles/` directory
2. Copy `dotfiles/zshrc` to `~/.dmdfami/dotfiles/zshrc`
3. Add source line to user's `~/.zshrc`:
   ```bash
   [ -f ~/.dmdfami/dotfiles/zshrc ] && source ~/.dmdfami/dotfiles/zshrc
   ```

### Shell Integration

Non-destructive source line:

```bash
[ -f ~/.dmdfami/dotfiles/zshrc ] && source ~/.dmdfami/dotfiles/zshrc
```

User can remove at any time by editing `.zshrc`.

### Detection

```javascript
async detect() {
  const dmdfamiDir = join(home, '.dmdfami', 'dotfiles');
  const zshrc = readFileSync(join(home, '.zshrc'), 'utf8');

  return {
    installed: existsSync(dmdfamiDir) && zshrc.includes('.dmdfami/dotfiles/zshrc'),
    details: `synced: ${existsSync(dmdfamiDir) ? 'yes' : 'no'}, sourced: ${hasSource ? 'yes' : 'no'}`
  };
}
```

### Verification

```javascript
async verify() {
  const zshrc = readFileSync(join(home, '.zshrc'), 'utf8');
  return zshrc.includes('.dmdfami/dotfiles/zshrc');
}
```

### Customization

**To modify dotfiles**:
1. Edit `dotfiles/zshrc`
2. Re-run `npx dmdfami-setup dotfiles`
3. Open new terminal to activate

**To add new dotfiles**:
1. Create file in `dotfiles/` directory
2. Update module to copy additional files
3. Add appropriate source lines to user's `.zshrc`

---

## Module Dependencies & Execution Order

The dependency graph ensures correct installation order:

```
system-prereqs [1]
    ↓
    ├── ai-cli-tools [4] (depends on system-prereqs)
    ├── shortcuts [5]     (depends on system-prereqs)
    ├── dev-tools [6]     (depends on system-prereqs)
    └── dotfiles [7]      (depends on system-prereqs)

remote-access [2]  (no dependencies)
skills [3]         (no dependencies)
```

Topological sort ensures:
1. `system-prereqs` always runs first (if selected)
2. modules without dependencies run in `order` sequence
3. modules with dependencies wait for dependencies to complete

**Example**: User selects `[5, 1, 6]` (shortcuts, system, dev-tools)

Execution order: `[1, 5, 6]` (topologically sorted)
- `system-prereqs` runs first (no deps)
- `shortcuts` runs next (depends on system-prereqs)
- `dev-tools` runs last (depends on system-prereqs)

---

## Adding a New Module

Follow these steps:

1. **Create file**: `modules/new-module.mjs`

```javascript
import { hasCommand, run, runVisible } from '../lib/shell.mjs';

export default {
  name: 'new-module',
  order: 8,                                    // Higher number for new modules
  description: 'Module description',           // Vietnamese label
  dependencies: ['system-prereqs'],            // If depends on others

  async detect() {
    return {
      installed: hasCommand('some-tool'),
      details: 'Status message'
    };
  },

  async install() {
    console.log('\n    Installing...');
    runVisible('some install command');
  },

  async verify() {
    return hasCommand('some-tool');
  }
};
```

2. **Update CLI** (if shorthand needed): Edit `bin/cli.mjs`

```javascript
const ARG_MAP = {
  // ... existing ...
  'new': 'new-module',  // Add shorthand
};
```

3. **Update README.md**: Add to modules table

4. **Test**:
```bash
npx ./bin/cli.mjs new-module
npx ./bin/cli.mjs new                        # Test shorthand
npx ./bin/cli.mjs all                        # Test in full run
```

5. **Verify idempotency**: Run twice, should not duplicate

---

## Troubleshooting Modules

### Module Installation Fails

**Check**:
1. Do dependencies exist? Run `npx dmdfami-setup system` first
2. Is the tool available? `which tool-name`
3. Network connection working? `curl https://example.com`

**Retry**:
```bash
npx dmdfami-setup module-name  # Re-run single module
```

### Module Says Installed But Tool Missing

**Solution**: Module's `detect()` may be inaccurate. Update detection logic.

Example: If `hasCommand()` returns true but tool doesn't work:
```javascript
async detect() {
  if (!hasCommand('tool')) return { installed: false, details: '...' };

  // Additional validation
  try {
    const version = getVersion('tool');
    return { installed: !!version, details: `v${version}` };
  } catch {
    return { installed: false, details: 'Tool not working' };
  }
}
```

### Shell Config Not Updated

**Check**: Did you open a NEW terminal?
- Shell integration requires terminal reload
- Same terminal window won't see changes

**Fix**:
```bash
source ~/.zshrc  # Reload current terminal
# OR open new terminal window
```

### Homebrew Packages Won't Install

**Check Brewfile syntax**:
```bash
brew bundle check --file=configs/Brewfile
```

**Force reinstall**:
```bash
brew bundle --file=configs/Brewfile --no-lock --force
```
