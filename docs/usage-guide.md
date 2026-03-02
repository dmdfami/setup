# Usage Guide - dmdfami/setup

Complete guide for using the dmdfami/setup CLI, from first-time setup to advanced customization.

## Quick Start

### Installation

For a fresh Mac with no prerequisites:

```bash
curl -fsSL https://setup.dmd-fami.com | bash
```

This runs `bootstrap.sh`, which:
1. Installs Node.js via Homebrew
2. Runs `npx dmdfami-setup all`

### For Existing Setup

If you already have Node.js 18+:

```bash
npx dmdfami-setup
```

Shows interactive menu to select modules.

## CLI Commands

### Interactive Menu (Default)

```bash
npx dmdfami-setup
```

**Output**:
```
  dmdfami/setup v1.0.0
  ====================

  Quét máy...

  ── System Tools ──────────────────────
  ✓ Homebrew (4.2.1)     ✓ Node.js (18.14.0)
  ✗ Python/pipx           ✓ Git + gh CLI
  ✗ Go                    ✗ tmux

  ── AI CLI Tools ──────────────────────
  ✓ Claude Code           ✗ Codex
  ✗ Gemini CLI            ✗ ClaudeKit
  ✓ CCS                   ✗ Repomix

  ── Setup Modules ──────────────────────
  [1] 🔧 Công cụ hệ thống (Homebrew, Node.js)
  [2] 🔑 Truy cập từ xa (SSH, tunnel, sudo, keychain)
  [3] 🧠 Bộ kỹ năng AI (CK skills, agents, rules)
  [4] 🤖 Công cụ AI dòng lệnh (Claude, Codex, Gemini...)
  [5] ⌨️  Phím tắt & alias terminal
  [6] 📦 Công cụ phát triển (brew + npm)
  [7] 📁 Đồng bộ cấu hình shell (.zshrc, PATH...)

  Chọn [1-7, all]:
```

**Input options**:
- `1` - Install module 1 only
- `1,3,5` - Install modules 1, 3, 5
- `1 3 5` - Also valid (space-separated)
- `all` - Install all 7 modules
- (empty) - Cancel

### Run Specific Module

```bash
npx dmdfami-setup mac
npx dmdfami-setup skill
npx dmdfami-setup ai
npx dmdfami-setup dev
npx dmdfami-setup all
npx dmdfami-setup system
npx dmdfami-setup dotfiles
npx dmdfami-setup shortcuts
```

**Module shortcuts**:

| Command | Module | Short | Module |
|---------|--------|-------|--------|
| `mac` / `remote` | remote-access | `skill` / `skills` | skills |
| `ai` / `tools` | ai-cli-tools | `dev` / `dev-tools` | dev-tools |
| `system` | system-prereqs | `dotfiles` | dotfiles |
| `shortcuts` | shortcuts | — | — |

All shortcuts are case-insensitive.

### Run All Modules

```bash
npx dmdfami-setup all
```

Installs all 7 modules in dependency order:
1. system-prereqs
2. remote-access
3. skills
4. ai-cli-tools
5. shortcuts
6. dev-tools
7. dotfiles

### Display Help

```bash
npx dmdfami-setup --help
npx dmdfami-setup -h
```

Shows usage summary and available modules.

## Use Cases

### Fresh Mac Setup

```bash
# Option 1: One-command full setup
curl -fsSL https://setup.dmd-fami.com | bash

# Option 2: Already have Node.js
npx dmdfami-setup all
```

Installs everything: Homebrew, Node.js, SSH, AI tools, shell config, dev tools.

### Development Environment Only

```bash
npx dmdfami-setup
# Select: 1 (system), 6 (dev-tools), 5 (shortcuts)
```

Installs prerequisites, dev tools, and shell aliases. Skips AI tools and remote access.

### Remote Work Setup

```bash
npx dmdfami-setup
# Select: 1 (system), 2 (remote-access), 4 (ai-cli-tools)
```

Sets up SSH/Tunnel for remote access and AI CLI tools for development from anywhere.

### AI Tools Only

```bash
npx dmdfami-setup ai
```

Interactive menu to select which AI tools to install:
```
Missing AI tools:
  [1] Claude Code
  [2] Codex CLI
  [3] Gemini CLI
  ...
  [11] All

Install which? 1,3,5
```

### Re-run After Network Failure

```bash
npx dmdfami-setup
# Select same modules as before
```

Safe to re-run anytime. Skips already-installed items.

## Output & Progress

### Scan Results

On startup, CLI scans your system and displays two tables:

**System Tools** (2-column):
```
✓ Homebrew (4.2.1)     ✓ Node.js (18.14.0)
✗ Python/pipx           ✓ Git + gh CLI
✗ Go                    ✓ tmux
```

**AI CLI Tools** (2-column):
```
✓ Claude Code (0.5.2)   ✗ Codex
✗ Gemini CLI            ✓ ClaudeKit (2.0.0)
✓ CCS (1.1.0)           ✗ Repomix
```

Symbols:
- ✓ = Installed (green)
- ✗ = Missing (red)

### Installation Progress

During execution:

```
  [1/3] Installing system-prereqs... ✓
  [2/3] Installing shortcuts... ✓
  [3/3] Installing dev-tools... ✗
    Error: Some brew packages may have failed — continuing
```

Format: `[current/total] Module name... [status]`

Status codes:
- ✓ = Completed successfully (green)
- ✗ = Failed (red)
- (skipped) = Not selected

### Completion

```
  Done!
```

All modules finished.

## Interactive Prompts

### Module Selection Menu

```
Chọn [1-7, all]:
```

Format: `[number, numbers, range, or 'all']`

Examples:
- `1` → Module 1 only
- `1,3` → Modules 1 and 3
- `2 4 6` → Modules 2, 4, 6 (space-separated)
- `all` → All modules
- (empty) → Cancel

### AI Tools Selection

```
Missing AI tools:
  [1] Claude Code
  [2] Codex CLI
  [3] Gemini CLI
  [4] ClaudeKit
  [5] CCS
  [6] Repomix
  [7] Firecrawl
  [8] Copilot CLI
  [9] Droid CLI
  [10] Antigravity
  [11] All

Install which?
```

Same input format as module selection.

## Environment Variables

### System Environment

The CLI uses standard environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `HOME` | User home directory | `/Users/david` |
| `PATH` | Executable search path | Updated by Homebrew |
| `SHELL` | Current shell | `/bin/zsh` |

### Setup Environment

Special variables set during installation:

| Variable | Set by | Purpose |
|----------|--------|---------|
| `NONINTERACTIVE=1` | system-prereqs | Skip brew prompts |

## Configuration Files

### System-Level Config

**Location**: `configs/` directory (version-controlled)

| File | Purpose | Format |
|------|---------|--------|
| `Brewfile` | Homebrew packages | Standard Homebrew |
| `aliases.json` | Shell aliases & functions | JSON |
| `npm-globals.json` | npm global packages | JSON |
| `ssh-key.pub` | SSH public key | PEM format |

### User-Level Installation

**Location**: `~/.dmdfami/` directory (created by setup)

| File | Created by | Purpose |
|------|------------|---------|
| `shortcuts.sh` | shortcuts module | Generated shell aliases |
| `dotfiles/zshrc` | dotfiles module | Portable shell config |

### User Shell Config

**Files modified** (never overwritten, only appended):

| File | Modified by | Change |
|------|-------------|--------|
| `~/.zshrc` | shortcuts, dotfiles | Source lines appended |
| `~/.zshenv` | system-prereqs | PATH additions |
| `~/.zprofile` | system-prereqs | Homebrew initialization |

All changes use "source line" pattern:
```bash
[ -f ~/.dmdfami/shortcuts.sh ] && source ~/.dmdfami/shortcuts.sh
```

User can remove by editing file (no uninstall script needed).

## Troubleshooting

### Module Installation Fails

**Symptom**: ✗ mark with error message

**Cause**: Dependency missing, network issue, or permission problem

**Solution**:
1. Check dependencies are installed:
   ```bash
   npx dmdfami-setup system  # Install prerequisites
   ```

2. Check network:
   ```bash
   curl https://github.com  # Verify internet
   ```

3. Check permissions:
   ```bash
   sudo -v  # Refresh sudo credentials
   ```

4. Re-run:
   ```bash
   npx dmdfami-setup module-name  # Retry single module
   ```

### `npx` Takes Too Long

**Cause**: npm package resolution

**Solution**:
```bash
# Use npm cache
npx --prefer-offline dmdfami-setup

# Or install globally
npm i -g dmdfami-setup
dmdfami-setup
```

### Shell Aliases Not Working

**Symptom**: Aliases defined but `alias ll` shows nothing

**Cause**: Current terminal doesn't have changes loaded

**Solution**:
```bash
# Reload current terminal
source ~/.zshrc

# OR open a new terminal window
```

### Homebrew Path Issues

**Symptom**: `brew: command not found` after installation

**Cause**: PATH not updated in current shell session

**Solution**:
```bash
# Option 1: Start new terminal
# Option 2: Load shell config manually
eval "$(/opt/homebrew/bin/brew shellenv)"

# Option 3: Check .zprofile
cat ~/.zprofile | grep homebrew
```

### Node.js Installation Fails

**Symptom**: `brew install node` fails or hangs

**Cause**: Conflicting Node installation or network issue

**Solution**:
```bash
# Check existing Node.js
which node
node --version

# If Node exists, skip system-prereqs:
npx dmdfami-setup ai  # Or other module
```

### Git/gh CLI Not Found

**Symptom**: `git` or `gh` command not found

**Cause**: Homebrew not in PATH

**Solution**:
```bash
# Install manually
brew install git gh

# Or ensure Homebrew PATH:
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### AI Tools Installation Hangs

**Symptom**: Installation stops without progress

**Cause**: npm registry timeout or large package

**Solution**:
```bash
# Increase npm timeout
npm i -g claude-code --legacy-peer-deps

# Or try mirror registry
npm config set registry https://registry.npmmirror.com
```

### Claude Code Credentials Not Exported

**Symptom**: Claude Code works locally but fails in SSH

**Cause**: Keychain not accessible or credentials format issue

**Solution**:
```bash
# Check Keychain
security find-generic-password -s "Claude Code-credentials"

# Verify credentials JSON
cat ~/.claude/.credentials.json | jq .

# Re-export manually
security find-generic-password -s "Claude Code-credentials" -w > ~/.claude/.credentials.json
chmod 600 ~/.claude/.credentials.json
```

### Multiple Selection Fails

**Symptom**: Input like `1,3,5` doesn't work

**Solution**:
```bash
# Try space-separated instead
1 3 5

# Or retry one by one
npx dmdfami-setup shortcuts
npx dmdfami-setup ai
npx dmdfami-setup dev
```

## Advanced Usage

### Scripting / Automation

Use CLI in scripts:

```bash
#!/bin/bash
# Auto-setup script
npx dmdfami-setup system
npx dmdfami-setup ai
npx dmdfami-setup dev
npx dmdfami-setup dotfiles
```

Or with `all`:
```bash
npx dmdfami-setup all
```

### Integrating into CI/CD

For macOS CI runners:

```yaml
- name: Setup Mac environment
  run: npx dmdfami-setup system dev
```

### Custom Module Testing

Test a module before committing:

```bash
# Run from project directory
npx ./bin/cli.mjs system
npx ./bin/cli.mjs all
```

### Debugging Module Execution

Add logging to modules temporarily:

```javascript
async install() {
  console.log('DEBUG: Starting install...');
  console.log('DEBUG: Checking brew...');
  // ... rest of install
}
```

Re-run to see logs:
```bash
npx ./bin/cli.mjs module-name
```

## Configuration Examples

### Adding Aliases

Edit `configs/aliases.json`:

```json
{
  "aliases": {
    "ll": "ls -lah",
    "gs": "git status",
    "gc": "git commit",
    "gp": "git push",
    "grh": "git reset --hard",
    "todo": "grep -r 'TODO' ."
  }
}
```

Re-run:
```bash
npx dmdfami-setup shortcuts
source ~/.zshrc  # Or open new terminal
```

### Adding Brew Packages

Edit `configs/Brewfile`:

```
# Development
brew "python"
brew "ruby"
brew "postgresql"
brew "redis"

# Utilities
brew "wget"
brew "curl"
brew "jq"

# Media
brew "ffmpeg"
brew "imagemagick"
```

Re-run:
```bash
npx dmdfami-setup dev-tools
```

### Adding npm Globals

Edit `configs/npm-globals.json`:

```json
{
  "packages": [
    { "name": "typescript", "package": "typescript", "cmd": "tsc" },
    { "name": "eslint", "package": "eslint", "cmd": "eslint" },
    { "name": "prettier", "package": "prettier", "cmd": "prettier" },
    { "name": "webpack", "package": "webpack", "cmd": "webpack" }
  ]
}
```

Re-run:
```bash
npx dmdfami-setup dev-tools
```

### Customizing Shell Config

Edit `dotfiles/zshrc`:

```bash
# Custom settings
export EDITOR=vim
export HISTSIZE=10000

# Prompt customization
PROMPT='%F{blue}%n@%m%f:%F{green}%~%f$ '

# Custom aliases
alias python=python3
alias pip=pip3

# Functions
function mkcd() {
  mkdir -p "$1" && cd "$1"
}
```

Re-run:
```bash
npx dmdfami-setup dotfiles
source ~/.zshrc  # Or open new terminal
```

## Performance Tips

### Speed Up npm Installs

Use npm cache and offline mode:

```bash
npm config set prefer-offline true
npx dmdfami-setup ai
```

### Use Faster npm Registry

Use mirror for faster downloads:

```bash
npm config set registry https://registry.npmmirror.com
npx dmdfami-setup ai
```

### Parallel-Safe Installation

Safe to run multiple times:

```bash
npx dmdfami-setup system &
npx dmdfami-setup ai &
wait
```

Modules handle concurrent execution gracefully.

## Best Practices

1. **Run prerequisites first**: Always install `system-prereqs` before other modules
2. **Test interactively first**: Use interactive menu before scripting
3. **Keep configs version-controlled**: Edit `configs/` and commit changes
4. **Re-run after big macOS updates**: Shell paths may change
5. **Open new terminal after setup**: Changes to shell config need reload
6. **Check network before running**: Some modules require downloads
7. **Document custom additions**: If modifying configs, document changes for team
8. **Use `all` for consistent setup**: Ensures all standard tools are installed
9. **Check `--help` periodically**: New features may be added

## Getting Help

### Check Status

```bash
npx dmdfami-setup system  # Test prerequisites
which brew && brew --version
which node && node --version
```

### View Module Logs

Errors are printed to console:

```
[2/7] Installing ai-cli-tools...
  Error: npm: command not found
```

### Report Issues

- GitHub Issues: github.com/dmdfami/setup/issues
- Include output from `npx dmdfami-setup --help`
- Include system info: `uname -a`, `brew --version`, etc.
