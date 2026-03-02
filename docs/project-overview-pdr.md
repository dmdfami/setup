# dmdfami/setup - Project Overview & PDR

## Executive Summary

`dmdfami/setup` is a zero-dependency Node.js CLI tool for automated Mac system setup and management. It provides a modular, interactive installation system for essential development tools, AI CLI utilities, and shell configuration.

**Key Value**: One-command Mac setup → scan → choose modules → install with dependency ordering.

## Project Status

- **Version**: 1.0.0
- **License**: MIT
- **Repository**: github.com/dmdfami/setup
- **Platform**: macOS (Intel & Apple Silicon)
- **Node Requirements**: 18+

## Core Objectives

1. **Zero-friction setup** - Minimal prerequisites, no npm dependencies needed
2. **Modular architecture** - Users select what they need, CLI handles dependencies
3. **Non-destructive** - Never overwrites user config, uses source-line integration
4. **Smart detection** - Scan system before offering modules, show what's installed
5. **Vietnamese UI** - Accessible interface in Vietnamese and English

## Functional Requirements

### CLI Interface

**Entry point**: `bin/cli.mjs` via `npx dmdfami-setup` or local `./bin/cli.mjs`

**Modes**:
1. **Interactive menu** (no args) - Scan system, display modules, let user choose
2. **Module selection** (`npx dmdfami-setup mac|skill|ai|dev|all`) - Run specific modules
3. **Help** (`--help`, `-h`) - Display usage instructions

**Argument mapping**:
- `mac` / `remote` → `remote-access` module
- `skill` / `skills` → `skills` module
- `ai` / `tools` → `ai-cli-tools` module
- `shortcuts` → `shortcuts` module
- `dev` / `dev-tools` → `dev-tools` module
- `dotfiles` → `dotfiles` module
- `system` → `system-prereqs` module
- `all` → Run all modules in dependency order

### System Scanning

On startup, CLI scans and displays:

**System Tools** (2-column table):
- Homebrew (brew), Node.js (node), Python/pipx, Git + gh CLI, Go, tmux

**AI CLI Tools** (2-column table):
- Claude Code, Codex, Gemini, Droid, ClaudeKit, CCS, Repomix (command detection + version)

### Module System

**7 modules** (ordered by `order` property):

| Order | Module | Name | Dependencies | What it does |
|-------|--------|------|--------------|-------------|
| 1 | system-prereqs | Công cụ hệ thống | none | Install Homebrew + Node.js |
| 2 | remote-access | Truy cập từ xa | none | Run npx dmdfami/mac (SSH, CF Tunnel, sudo, keychain) |
| 3 | skills | Bộ kỹ năng AI | none | Run npx dmdfami/skill (CK skills installer) |
| 4 | ai-cli-tools | Công cụ AI dòng lệnh | system-prereqs | Interactive install of 10 AI CLI tools + Claude credentials |
| 5 | shortcuts | Phím tắt & alias | system-prereqs | Generate shortcuts.sh, copy ~/bin scripts |
| 6 | dev-tools | Công cụ phát triển | system-prereqs | Brew bundle (ffmpeg, gh, go, tmux...) + npm globals |
| 7 | dotfiles | Đồng bộ cấu hình | system-prereqs | Copy portable zshrc to ~/.dmdfami/dotfiles/ |

Each module implements:
- `name` - unique identifier
- `order` - execution priority (topological sort)
- `description` - Vietnamese label in menu
- `dependencies` - array of required modules
- `detect()` - check if already installed (returns `{ installed: bool, details: string }`)
- `install()` - perform installation
- `verify()` - confirm installation succeeded

### Non-Functional Requirements

- **Zero npm dependencies** - Only Node.js built-ins (child_process, fs, readline, path, os, https)
- **Idempotent** - Safe to re-run anytime; skips already-installed items
- **Modular** - Each module independent; dependencies enforced via topological sort
- **Non-destructive** - Never overwrites existing config; appends source lines to .zshrc/.zshenv
- **Security** - Command injection protection via regex validation, Keychain integration for secrets
- **Instant npx startup** - No build step, ESM, direct execution
- **Portable config** - All config in version-controlled `configs/` and `dotfiles/` dirs

## Architecture Overview

### Directory Structure

```
.
├── bin/
│   └── cli.mjs                  # Entry point, arg parsing, user menu
├── lib/
│   ├── detector.mjs             # Scan tools, load modules
│   ├── runner.mjs               # Execute modules in dependency order (Kahn's topological sort)
│   ├── ui.mjs                   # Banner, prompts, progress, status tables
│   ├── shell.mjs                # Command execution helpers
│   └── http.mjs                 # HTTPS fetch/download utilities
├── modules/
│   ├── system-prereqs.mjs
│   ├── remote-access.mjs
│   ├── skills.mjs
│   ├── ai-cli-tools.mjs
│   ├── shortcuts.mjs
│   ├── dev-tools.mjs
│   └── dotfiles.mjs
├── configs/
│   ├── Brewfile                 # Brew bundle packages
│   ├── aliases.json             # Terminal aliases & functions
│   ├── npm-globals.json         # npm global packages
│   └── ssh-key.pub              # SSH public key (optional)
├── dotfiles/
│   ├── zshrc                    # Portable shell config
│   └── bin/
│       ├── mac                  # System utilities
│       ├── qall                 # Quick alias lister
│       └── ...
├── bootstrap.sh                 # Install Node.js before running CLI
└── package.json
```

### Key Design Patterns

**Hub & Modules**
- `cli.mjs` = hub: manages user interaction, loads modules dynamically
- Modules = spokes: independent, self-contained installation units
- No module-to-module communication; each idempotent

**Topological Sort (Kahn's Algorithm)**
- Used in `lib/runner.mjs` to order module execution by dependency
- Respects `dependencies` array in each module
- Fails if circular dependencies exist (error: unresolved modules)

**Source-line Integration**
- No overwriting of user's `.zshrc` / `.zshenv`
- Appends `[ -f ~/.dmdfami/shortcuts.sh ] && source ~/.dmdfami/shortcuts.sh`
- User can easily remove by editing .zshrc

**Lazy Module Loading**
- Modules loaded from `modules/*.mjs` on demand via dynamic import
- Sorted by `order` property before display
- Only selected modules are executed

## Technical Stack

**Language**: JavaScript (ESM)
**Runtime**: Node.js 18+
**Package Manager**: npm (for global CLI installs only)
**Shell**: zsh/bash
**Dependencies**: None (zero npm dependencies; only Node.js built-ins)

## Integration Points

**External CLIs** (invoked via shell):
- `brew install`, `brew bundle`
- `npm i -g`
- `npx dmdfami/mac`, `npx dmdfami/skill`
- `gh extension install`
- `security find-generic-password` (macOS Keychain)

**File Integration**:
- Reads/writes: `~/.zshrc`, `~/.zshenv`, `~/.zprofile`
- Creates: `~/.dmdfami/` directory tree
- Copies: `~/bin/` scripts

## Success Metrics

1. **Adoption** - Number of installations via `npx dmdfami-setup`
2. **Completion Rate** - % of users who run to completion
3. **Error Rate** - % of failed module installations
4. **Repeatability** - Safe to run multiple times without breaking
5. **User Satisfaction** - Feedback on module quality and documentation

## Security & Compliance

- **No credentials in repo** - Config templates only; secrets in .env or Keychain
- **Command injection prevention** - `SAFE_CMD_RE` regex validation in `lib/shell.mjs`
- **Safe file operations** - `fs` APIs with error handling, chmod 0o600 for secrets
- **Keychain integration** - Exports Claude Code credentials from macOS Keychain for SSH sessions
- **No package.json modification** - Global installs only, never touches user's project deps

## Known Limitations

1. **macOS only** - Homebrew-dependent, no Linux/Windows support
2. **zsh focus** - Assumes zsh shell; bash support limited
3. **Manual module creation** - No plugin system; requires code edit to add modules
4. **No rollback** - Installations are one-way; no uninstall mechanism
5. **Network-dependent** - Requires internet for all brew/npm installs

## Future Enhancements

- [ ] Plugin system (allow external modules)
- [ ] Rollback/uninstall capability
- [ ] Module versioning & updates
- [ ] bash/fish shell support
- [ ] Offline mode with cached installers
- [ ] Scheduled maintenance (weekly brew update)
- [ ] Configuration export/import
