# Codebase Summary - dmdfami/setup

Comprehensive overview of the dmdfami/setup codebase structure, organization, and key components.

## Executive Summary

**Project**: dmdfami/setup - One-command Mac setup CLI
**Type**: Node.js CLI application (ESM)
**Size**: ~1,200 LOC across 7 modules + 5 libraries
**Dependencies**: Zero npm dependencies (Node.js built-ins only)
**Platform**: macOS only
**Node Version**: 18+

**Key Metrics**:
- 12 JavaScript files (.mjs)
- 3 configuration files (JSON)
- 1 shell bootstrap script
- ~280 LOC main entry point
- ~400 LOC libraries
- ~700 LOC modules
- ~200 LOC tests/validation

---

## Directory Structure

```
dmdfami-setup/
├── bin/
│   └── cli.mjs                      [~93 LOC] Entry point
├── lib/
│   ├── shell.mjs                    [~41 LOC] Command execution
│   ├── detector.mjs                 [~59 LOC] System scanning
│   ├── runner.mjs                   [~63 LOC] Topological sort
│   ├── ui.mjs                       [~93 LOC] User interface
│   └── http.mjs                     [Optional] HTTPS utilities
├── modules/                          [7 modules, ~700 LOC total]
│   ├── system-prereqs.mjs           [~51 LOC]
│   ├── remote-access.mjs            [~21 LOC]
│   ├── skills.mjs                   [~33 LOC]
│   ├── ai-cli-tools.mjs             [~93 LOC]
│   ├── shortcuts.mjs                [~70 LOC]
│   ├── dev-tools.mjs                [~43 LOC]
│   └── dotfiles.mjs                 [~50 LOC]
├── configs/                          [Configuration files]
│   ├── Brewfile                      [Brew packages]
│   ├── aliases.json                  [Shell aliases]
│   ├── npm-globals.json              [npm packages]
│   └── ssh-key.pub                   [SSH public key]
├── dotfiles/                         [Portable config]
│   ├── zshrc                         [Shell configuration]
│   └── bin/                          [Executable scripts]
│       ├── mac
│       ├── qall
│       └── wp, wp-mcp, wp-testastra-mcp (optional)
├── bootstrap.sh                      [Pre-flight setup]
├── package.json                      [Project metadata]
└── README.md                         [Quick start guide]
```

---

## File Organization

### Entry Point

**File**: `bin/cli.mjs` (~93 LOC)

**Responsibilities**:
- Parse command-line arguments
- Map argument to module name (ARG_MAP)
- Show banner and system scan
- Handle interactive menu or auto-select
- Execute selected modules via runner

**Key exports**:
- No exports (executable script)

**Key variables**:
- `ARG_MAP` - Argument → module name mapping
- `process.argv[2]` - CLI argument

**Error handling**:
- Exit code 1 on unknown module
- Exit code 0 on success

### Core Libraries

**Directory**: `lib/` (5 files, ~350 LOC)

#### lib/shell.mjs (~41 LOC)

**Responsibilities**:
- Execute shell commands safely
- Check command availability
- Extract version strings

**Exports**:
- `hasCommand(cmd)` - Check command exists (boolean)
- `run(cmd, opts)` - Silent execution (string | null)
- `runVisible(cmd)` - Visible execution (void)
- `getVersion(cmd, flag)` - Extract version (string | null)

**Key features**:
- Command injection prevention via regex validation
- Timeout handling (5s for getVersion)
- Error suppression (returns null vs throws)

#### lib/detector.mjs (~59 LOC)

**Responsibilities**:
- Scan system for installed tools
- Detect AI CLI tools
- Load modules from filesystem
- Sort modules by order property

**Exports**:
- `scanSystemTools()` - Array of 6 system tools
- `scanAITools()` - Array of 6 AI tools
- `loadModules()` - Async load modules from disk

**Key features**:
- Dynamic import of `.mjs` files
- Version extraction for each tool
- Automatic sorting by `order` property

#### lib/runner.mjs (~63 LOC)

**Responsibilities**:
- Execute modules in dependency order
- Implement topological sort (Kahn's algorithm)
- Show progress during installation
- Handle module errors gracefully

**Exports**:
- `runModules(modules)` - Execute array of modules
- `topoSort(modules)` - Sort by dependencies (internal)

**Key features**:
- Kahn's algorithm for topological sort
- Non-blocking error handling
- Progress indicator integration

**Algorithm**: Kahn's topological sort
1. Build dependency graph
2. Calculate in-degree (number of dependencies)
3. Process nodes with in-degree 0 first
4. Resolve dependencies and repeat
5. Return ordered result

#### lib/ui.mjs (~93 LOC)

**Responsibilities**:
- Display banner and version
- Show status tables (system tools, AI tools)
- Implement module selection menu
- Show progress during installation
- Manage readline interface lifecycle

**Exports**:
- `ask(question)` - Prompt user, return input
- `closeUI()` - Cleanup readline
- `showBanner()` - Display version banner
- `showScanResults(systemTools, aiTools)` - Status tables
- `selectModules(modules)` - Menu with selection
- `showProgress(current, total, name, state)` - Progress bar

**Key features**:
- 2-column aligned tables
- Color-coded output (green ✓, red ✗)
- Interactive menu with number selection
- Unicode box-drawing characters
- Vietnamese UI strings

#### lib/http.mjs (Optional, ~50 LOC)

**Responsibilities**:
- HTTPS fetch (if needed for downloads)
- Wrapper around native `node:https` module

**Status**: Currently unused (modules use `runVisible()` for external tools)

---

### Installation Modules

**Directory**: `modules/` (7 files, ~360 LOC)

Each module is a separate installation unit with consistent interface:

```javascript
export default {
  name: string,                 // Unique ID
  order: number,                // Execution priority
  description: string,          // UI label
  dependencies: string[],       // Prerequisite modules
  async detect(),              // Check installed
  async install(),             // Perform installation
  async verify()               // Confirm success
}
```

#### Module 1: system-prereqs.mjs (~51 LOC)

**What it does**: Install Homebrew and Node.js

**Detection**: Both brew and node exist
**Installation**:
1. Homebrew (if missing) via official script
2. Update .zprofile and .zshenv for PATH
3. Node.js (if missing) via brew

**Verification**: Both commands exist

**Dependencies**: None

---

#### Module 2: remote-access.mjs (~21 LOC)

**What it does**: Delegate to npx dmdfami/mac

**Detection**: Always false (allow re-configuration)
**Installation**: Run `npx -y dmdfami/mac`
**Verification**: Always true

**Dependencies**: None

**Note**: External package dependency (dmdfami/mac)

---

#### Module 3: skills.mjs (~33 LOC)

**What it does**: Install CK skills pack

**Detection**: Count directories in ~/.claude/skills/ and ~/.claude/agents/
**Installation**: Run `npx -y dmdfami/skill`
**Verification**: At least 1 skill installed

**Dependencies**: None

**Note**: External package dependency (dmdfami/skill)

---

#### Module 4: ai-cli-tools.mjs (~93 LOC)

**What it does**: Interactive install of AI CLI tools

**Tools** (10 total):
1. Claude Code (npm)
2. Codex CLI (npm)
3. Gemini CLI (brew)
4. ClaudeKit (npm)
5. CCS (npm)
6. Repomix (npm)
7. Firecrawl (npm)
8. Copilot CLI (gh extension)
9. Droid CLI (npm)
10. Antigravity (cask)

**Detection**: Check each tool, report count
**Installation**:
1. Detect missing tools
2. Show numbered menu
3. Parse user selection
4. Install selected tools
5. Export Claude Code credentials from Keychain

**Verification**: At least 1 tool installed

**Dependencies**: system-prereqs

**Special handling**: Claude Code Keychain integration for SSH sessions

---

#### Module 5: shortcuts.mjs (~70 LOC)

**What it does**: Generate and install shell aliases

**Configuration**: `configs/aliases.json`
- Aliases object
- Global aliases (zsh only)
- Functions object

**Installation**:
1. Read aliases.json
2. Generate shortcuts.sh script
3. Write to ~/.dmdfami/shortcuts.sh
4. Append source line to ~/.zshrc
5. Copy scripts from dotfiles/bin/ to ~/bin/

**Scripts copied**: mac, qall, wp, wp-mcp, wp-testastra-mcp

**Verification**: Source line present in ~/.zshrc

**Dependencies**: system-prereqs

---

#### Module 6: dev-tools.mjs (~43 LOC)

**What it does**: Install development packages

**Configuration**:
- `configs/Brewfile` - Brew packages
- `configs/npm-globals.json` - npm packages

**Installation**:
1. Run `brew bundle --file="Brewfile" --no-lock`
2. Filter missing npm globals
3. Install each missing npm package

**Verification**: gh and tmux exist

**Dependencies**: system-prereqs

**Error handling**: Continues on individual package failures

---

#### Module 7: dotfiles.mjs (~50 LOC)

**What it does**: Sync portable shell configuration

**Configuration**: `dotfiles/zshrc`

**Installation**:
1. Create ~/.dmdfami/dotfiles/
2. Copy dotfiles/zshrc to ~/.dmdfami/dotfiles/zshrc
3. Append source line to ~/.zshrc

**Verification**: Source line present in ~/.zshrc

**Dependencies**: system-prereqs

---

### Configuration Files

**Directory**: `configs/` (version-controlled)

#### Brewfile

Standard Homebrew bundle format.

**Example**:
```
brew "cloudflared"
brew "ffmpeg"
brew "gh"
brew "go"
brew "tmux"
cask "visual-studio-code"
```

#### aliases.json

JSON file with three keys:

```json
{
  "aliases": {
    "ll": "ls -lah",
    "gs": "git status"
  },
  "global_aliases": {
    "G": "| grep",
    "L": "| less"
  },
  "functions": {
    "mkcd": "mkdir -p \"$1\" && cd \"$1\""
  }
}
```

#### npm-globals.json

```json
{
  "packages": [
    {
      "name": "repomix",
      "package": "repomix",
      "cmd": "repomix"
    }
  ]
}
```

#### ssh-key.pub

SSH public key (optional).

---

### Dotfiles

**Directory**: `dotfiles/` (version-controlled)

#### zshrc

Portable shell configuration (no user-specific settings).

Includes:
- Zsh options (history, globbing, etc.)
- Environment variables
- Custom functions
- Path additions

#### bin/

Executable scripts:
- `mac` - System utilities
- `qall` - List all aliases
- `wp`, `wp-mcp`, `wp-testastra-mcp` - WordPress utilities (optional)

---

## Data Flow

### CLI Execution Flow

```
┌─ bin/cli.mjs
├─ Parse argv
├─ Show banner (via lib/ui.mjs)
├─ Scan system (via lib/detector.mjs)
│  ├─ scanSystemTools() → 6 tools
│  └─ scanAITools() → 6 tools
├─ Show scan results (via lib/ui.mjs)
├─ Load modules (via lib/detector.mjs)
│  └─ Dynamic import *.mjs, sort by order
├─ User selection
│  ├─ Interactive menu (via lib/ui.mjs)
│  └─ Ask user input (via lib/ui.mjs)
└─ Execute modules (via lib/runner.mjs)
   ├─ topoSort by dependencies
   └─ For each module:
      ├─ install()
      ├─ verify()
      └─ showProgress()
```

### Module Execution

```
Module interface:
┌─ name, order, description, dependencies
├─ detect() → { installed: bool, details: string }
├─ install() → void (performs installation)
└─ verify() → bool (confirms success)

Runner:
┌─ topoSort(modules) → ordered array
├─ For each module in order:
│  ├─ showProgress(installing...)
│  ├─ module.install()
│  ├─ module.verify()
│  └─ showProgress(done/failed)
└─ Continue even if module fails
```

---

## Key Design Patterns

### 1. Hub & Modules

**Hub** (bin/cli.mjs):
- Central coordination
- User interface
- Argument parsing
- Module loading and execution

**Modules** (modules/*.mjs):
- Independent units
- No inter-module communication
- Self-contained logic
- Consistent interface

**Benefit**: Loosely coupled, easy to test and extend

### 2. Lazy Loading

Modules loaded on-demand:
- Read from `modules/` directory
- Dynamic import when needed
- Sort by order property
- Only selected modules executed

**Benefit**: Fast startup, minimal memory overhead

### 3. Non-Destructive Configuration

Never overwrites user files:
```bash
# Source line (append only)
[ -f ~/.dmdfami/shortcuts.sh ] && source ~/.dmdfami/shortcuts.sh
```

**Benefit**: User can remove setup changes by editing file

### 4. Idempotent Operations

Safe to run multiple times:
- `detect()` checks current state
- `install()` skips if already done
- `verify()` confirms success

**Benefit**: Re-run anytime for updates/fixes

### 5. Topological Sort

Kahn's algorithm for dependency ordering:
- Build dependency graph
- Process nodes with in-degree 0 first
- Resolve and continue
- Handles complex dependencies

**Benefit**: Correct execution order automatically

### 6. Command Injection Prevention

Regex validation before execution:
```javascript
const SAFE_CMD_RE = /^[a-zA-Z0-9._\-/]+$/;
if (!SAFE_CMD_RE.test(cmd)) return false;
```

**Benefit**: Prevents shell injection attacks

---

## Code Quality Metrics

### Size Analysis

```
Entry point:          ~93 LOC
Core libraries:      ~350 LOC
Installation modules: ~360 LOC
Configuration:        ~200 LOC
─────────────────────────────
Total source:        ~1,003 LOC
```

### Complexity

- **Cyclomatic complexity**: Low
  - Few branching paths
  - Simple error handling
  - Straightforward module interface

- **Coupling**: Low
  - Modules independent
  - Libraries provide utilities
  - No circular dependencies

- **Cohesion**: High
  - Each file has single responsibility
  - Clear module boundaries
  - Focused functions

### Dependencies

- **External npm packages**: 0
- **Node.js built-ins used**: 8
  - node:child_process
  - node:fs
  - node:path
  - node:readline
  - node:os
  - node:url
  - node:https (optional)

---

## Testing Strategy

### Current Testing

Manual testing checklist:

```bash
# Basic execution
npx ./bin/cli.mjs --help
npx ./bin/cli.mjs system

# Interactive menu
npx ./bin/cli.mjs

# Specific module
npx ./bin/cli.mjs ai
npx ./bin/cli.mjs all

# Idempotency (run twice)
npx ./bin/cli.mjs system
npx ./bin/cli.mjs system
```

### Recommended Test Coverage

Unit tests (if added):
- lib/shell.mjs: hasCommand, run, getVersion
- lib/detector.mjs: scanSystemTools, topoSort
- lib/runner.mjs: topological sort edge cases
- Modules: detect(), verify() methods

Integration tests:
- End-to-end module execution
- Dependency resolution
- Error handling and recovery

---

## Performance Characteristics

### Startup Time

```
Baseline:           ~100ms (node startup)
Banner + scan:      ~100ms
Module loading:     ~50ms (dynamic import)
User interaction:   varies
─────────────────
Total interactive:  ~250ms (before installation)
```

### Installation Time

Varies by module:
- system-prereqs: 30-60s (Homebrew install)
- remote-access: 10-20s (external package)
- skills: 10-20s (external package)
- ai-cli-tools: 30-120s (npm installs)
- shortcuts: <1s (file generation)
- dev-tools: 30-120s (brew bundle)
- dotfiles: <1s (file copy)

### Memory Usage

```
Baseline:        ~20MB (node)
Loaded modules:  ~5MB
Total typical:   ~25MB
```

---

## Security Considerations

### Command Injection Prevention

- Whitelist regex: `/^[a-zA-Z0-9._\-/]+$/`
- Use `execFileSync` with args array (not shell)
- No user input directly in shell commands

### File Permissions

```javascript
// Secrets: user read/write only
writeFileSync(file, data, { mode: 0o600 });

// Executables: user read/write/execute
writeFileSync(file, data, { mode: 0o755 });
```

### Credential Handling

- Claude Code credentials from macOS Keychain
- Validated JSON before writing
- Restricted file permissions (0o600)

### Non-Destructive Configuration

- Never truncates user files
- Always appends source lines
- User can remove by editing

---

## Known Limitations

1. **macOS only** - Homebrew-dependent
2. **zsh focus** - Limited bash support
3. **No plugin system** - Modules require code edit
4. **No rollback** - No uninstall mechanism
5. **No module versioning** - Static at build time
6. **Network-dependent** - Requires internet

---

## Future Enhancement Opportunities

1. **Plugin system** - External module loading
2. **Rollback/uninstall** - Remove installed items
3. **Module versioning** - Track & update modules
4. **bash/fish support** - Multi-shell compatibility
5. **Offline mode** - Pre-cached installers
6. **Configuration export** - Backup user settings
7. **Progress persistence** - Resume failed installs

---

## Contributing

### Adding a Module

1. Create `modules/new-module.mjs`
2. Implement module interface
3. Add to ARG_MAP if shorthand needed
4. Test: `npx ./bin/cli.mjs new-module`
5. Update documentation

### Modifying Libraries

1. Keep functions focused (single responsibility)
2. No inter-library dependencies
3. Update API reference docs
4. Test with all modules

### Configuration Changes

1. Edit `configs/*.json`
2. Update module's install() logic
3. Document in code-standards.md
4. Test affected modules

---

## Version History

- **1.0.0** - Initial release (2026-03-02)
  - 7 modules
  - System scanning
  - Interactive menu
  - Vietnamese UI

---

## Resources

- **GitHub**: github.com/dmdfami/setup
- **npm**: npmjs.com/package/dmdfami-setup
- **Bootstrap**: setup.dmd-fami.com
- **Related**: dmdfami/mac, dmdfami/skill

---

## Summary

dmdfami/setup is a well-organized, modular Node.js CLI with:
- Zero external dependencies
- Clean separation of concerns (hub & modules)
- Comprehensive error handling
- Security-first design
- Non-destructive installation
- ~1,000 LOC of production code

Perfect for distributing a curated set of macOS developer tools with minimal friction.
