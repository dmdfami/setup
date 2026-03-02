# dmdfami/setup Documentation

Complete documentation for the dmdfami/setup CLI tool. Select a section below to get started.

## Quick Navigation

### For First-Time Users
- **[Usage Guide](./usage-guide.md)** - How to run the CLI, commands, and troubleshooting
- **[Project Overview](./project-overview-pdr.md)** - What dmdfami/setup does and why

### For Developers
- **[Code Standards](./code-standards.md)** - Coding guidelines, file organization, patterns
- **[System Architecture](./system-architecture.md)** - Hub & modules pattern, execution flow, data structures
- **[API Reference](./api-reference.md)** - Complete function signatures and interfaces
- **[Modules Guide](./modules-guide.md)** - Detailed reference for all 7 modules

### Quick Links
- **[GitHub Repository](https://github.com/dmdfami/setup)**
- **[npm Package](https://www.npmjs.com/package/dmdfami-setup)**

---

## What is dmdfami/setup?

A zero-dependency Node.js CLI for automated Mac system setup. Scans your machine, shows what's installed/missing, then lets you choose which tools to install from 7 modular installation packages.

**One-command setup:**
```bash
npx dmdfami-setup
```

Shows interactive menu:
- System prerequisites (Homebrew, Node.js)
- Remote access (SSH, Tunnel, sudo, keychain)
- AI skills pack (CK skills installer)
- AI CLI tools (Claude, Codex, Gemini, etc.)
- Terminal shortcuts (aliases, functions)
- Dev tools (brew packages, npm globals)
- Dotfiles sync (shell configuration)

---

## Documentation Map

### 📖 [project-overview-pdr.md](./project-overview-pdr.md)
**Target**: Product managers, stakeholders, new developers

What you'll learn:
- Project status and version
- Core objectives and functional requirements
- Architecture overview (7 modules)
- Success metrics and known limitations
- Future enhancements

**Key sections**:
- Executive Summary
- Functional & Non-Functional Requirements
- Module System (table of all 7 modules)
- Security & Compliance
- Integration Points

---

### 📘 [usage-guide.md](./usage-guide.md)
**Target**: End users, developers running the CLI

What you'll learn:
- How to install and run dmdfami/setup
- CLI commands and shortcuts
- Interactive menu usage
- Configuration file editing
- Troubleshooting common issues

**Key sections**:
- Quick Start
- CLI Commands (interactive, specific module, all, help)
- Use Cases (fresh Mac, dev only, remote work, AI tools)
- Output & Progress indicators
- Configuration Examples
- Troubleshooting guide

---

### 🏗️ [system-architecture.md](./system-architecture.md)
**Target**: Developers understanding the codebase

What you'll learn:
- Hub & modules design pattern
- Execution flow (initialization, selection, execution, module installation)
- Core libraries (shell.mjs, detector.mjs, runner.mjs, ui.mjs)
- Topological sort algorithm (Kahn's algorithm)
- Security architecture (injection prevention, credential handling)
- Performance characteristics

**Key sections**:
- Architecture Pattern (diagram)
- Hub Responsibilities
- Spoke Modules (interface)
- Execution Flow (4 steps)
- Core Libraries (detailed API)
- Data Flow (input → output)
- Security Architecture
- Error Handling
- Performance Characteristics

---

### 📚 [code-standards.md](./code-standards.md)
**Target**: Contributors and code reviewers

What you'll learn:
- File organization and naming conventions
- JavaScript formatting and style
- Module structure requirements
- Function guidelines and patterns
- Security patterns (injection prevention, file operations)
- Module patterns (3 common patterns with examples)
- Testing & validation checklist
- Documentation standards
- Changelog & versioning

**Key sections**:
- Project Constraints (zero dependencies, ESM, Node 18+)
- Directory Structure (file size limits)
- Naming Conventions (files, functions, variables, modules)
- Code Style (indentation, braces, async/await)
- Module Structure (required interface)
- Function Guidelines (small functions, early returns, error handling)
- Security Patterns (command injection, file operations, credentials)
- Module Patterns (3 common patterns with code examples)
- Dependencies Management (only Node.js built-ins)
- Future Extensibility (adding modules, libraries, configs)

---

### 🔧 [modules-guide.md](./modules-guide.md)
**Target**: Module developers and power users

What you'll learn:
- Complete reference for all 7 modules
- What each module does and how to use it
- Configuration files for each module
- Module dependencies and execution order
- How to add new modules
- Troubleshooting module-specific issues

**Key sections** (one per module):
1. System Prerequisites - Homebrew + Node.js
2. Remote Access - SSH, Tunnel, sudo, keychain
3. AI Skills - CK skills installer
4. AI CLI Tools - Interactive install of 10 tools
5. Terminal Shortcuts - Aliases, functions, ~/bin scripts
6. Dev Tools - Brew bundle + npm globals
7. Dotfiles - Shell config sync

Each module section includes:
- What it does
- Detection logic
- Installation flow
- Verification
- Configuration
- Customization guide
- Troubleshooting

Plus:
- Module Dependencies & Execution Order
- How to Add a New Module
- Troubleshooting Guide

---

### 🔌 [api-reference.md](./api-reference.md)
**Target**: Developers writing modules or extending the CLI

What you'll learn:
- Complete API for all library functions
- Module interface specification
- Configuration file formats
- Error handling patterns
- Best practices for writing modules

**Key sections**:
- **lib/shell.mjs** - Command execution helpers
  - `hasCommand(cmd)` - Check if command exists
  - `run(cmd, opts)` - Silent execution
  - `runVisible(cmd)` - Visible execution
  - `getVersion(cmd, flag)` - Extract version

- **lib/detector.mjs** - System scanning
  - `scanSystemTools()` - Detect brew, node, git, etc.
  - `scanAITools()` - Detect Claude, Codex, Gemini, etc.
  - `loadModules()` - Dynamic module loading

- **lib/runner.mjs** - Module execution
  - `runModules(modules)` - Execute in dependency order
  - `topoSort(modules)` - Kahn's topological sort

- **lib/ui.mjs** - User interface
  - `showBanner()` - Display version
  - `showScanResults(systemTools, aiTools)` - Show status tables
  - `ask(question)` - Prompt user
  - `selectModules(modules)` - Menu interface
  - `showProgress(current, total, name, state)` - Progress bar
  - `closeUI()` - Cleanup

- **Module Interface** - What every module must implement
  - Module object structure
  - Properties (name, order, description, dependencies)
  - Methods (detect, install, verify)

- **Configuration Files** (JSON format)
  - aliases.json - Shell aliases & functions
  - npm-globals.json - npm packages

- **Error Handling** - Patterns and examples
- **Best Practices** - 10 key points

---

## Documentation Statistics

| Document | Lines | Purpose |
|----------|-------|---------|
| project-overview-pdr.md | 280 | Requirements, architecture, status |
| usage-guide.md | 520 | User commands, troubleshooting, examples |
| system-architecture.md | 420 | Design patterns, execution flow, libraries |
| code-standards.md | 550 | Coding guidelines, patterns, conventions |
| modules-guide.md | 650 | Module reference, configuration, customization |
| api-reference.md | 700 | Complete API specification |
| index.md | (this file) | Navigation and overview |

**Total**: ~3,700 lines of comprehensive documentation

---

## Key Concepts

### Architecture: Hub & Modules

```
┌─ Hub (cli.mjs)
│  ├─ Parses arguments
│  ├─ Shows UI (banner, scan, menu)
│  ├─ Loads modules
│  └─ Executes via runner
│
└─ Modules (7 independent units)
   ├─ [1] system-prereqs
   ├─ [2] remote-access
   ├─ [3] skills
   ├─ [4] ai-cli-tools
   ├─ [5] shortcuts
   ├─ [6] dev-tools
   └─ [7] dotfiles
```

Each module:
- Detects current state
- Installs if needed
- Verifies success

### Execution: Topological Sort

Dependencies enforced via Kahn's algorithm:
```
If user selects: [shortcuts, system, dev-tools]
  shortcuts depends on system
  dev-tools depends on system

Execution order: [system, shortcuts, dev-tools]
```

### Configuration: Version-Controlled

All configuration in `configs/` and `dotfiles/` directories:
- `configs/Brewfile` - Brew packages
- `configs/aliases.json` - Shell aliases
- `configs/npm-globals.json` - npm packages
- `dotfiles/zshrc` - Portable shell config

User modifications automatically applied to `~/.dmdfami/` (non-destructive).

### Security: Zero Dependencies + Injection Protection

- **No npm dependencies** - Instant `npx` startup
- **Command validation** - Regex whitelist prevents injection
- **File safety** - Never overwrites user config
- **Credential handling** - Keychain integration for secrets

---

## Common Tasks

### I want to use dmdfami/setup
→ Read [Usage Guide](./usage-guide.md)

### I want to understand how it works
→ Read [System Architecture](./system-architecture.md)

### I want to add a new module
→ Read [Code Standards](./code-standards.md) + [Modules Guide](./modules-guide.md)

### I want to customize aliases or packages
→ Read [Modules Guide](./modules-guide.md) section on Module 5 & 6

### I want to extend the CLI with new features
→ Read [API Reference](./api-reference.md) + [Code Standards](./code-standards.md)

### I want to debug a module failure
→ Read [Usage Guide](./usage-guide.md) Troubleshooting section

### I want to understand the module interface
→ Read [API Reference](./api-reference.md) Module Interface section

---

## File Locations

**Documentation**:
- `/docs/` - All documentation (this directory)

**Source Code**:
- `bin/cli.mjs` - Entry point
- `lib/*.mjs` - Core libraries
- `modules/*.mjs` - Installation modules
- `configs/` - Configuration files
- `dotfiles/` - Portable shell config

**Configuration**:
- `package.json` - Project metadata
- `README.md` - Quick start

---

## Contributing

To contribute documentation:

1. Check relevant section in this index
2. Update the corresponding `.md` file
3. Keep line count reasonable (target: <800 LOC per file)
4. Follow Markdown formatting conventions
5. Verify all code examples are accurate
6. Test code examples before committing

For code contributions:
1. Read [Code Standards](./code-standards.md)
2. Follow naming conventions and patterns
3. Add/update tests
4. Update relevant documentation
5. Ensure idempotent behavior

---

## Getting Help

**For usage questions**: See [Usage Guide](./usage-guide.md) Troubleshooting

**For architecture questions**: See [System Architecture](./system-architecture.md)

**For API questions**: See [API Reference](./api-reference.md)

**For module customization**: See [Modules Guide](./modules-guide.md)

**For coding guidelines**: See [Code Standards](./code-standards.md)

---

## Version & Status

- **Current Version**: 1.0.0
- **Last Updated**: 2026-03-02
- **Status**: Production Ready
- **Maintained**: Active

---

## Quick Reference

### CLI Shortcuts

```bash
npx dmdfami-setup              # Interactive menu
npx dmdfami-setup all          # All modules
npx dmdfami-setup system       # System prerequisites
npx dmdfami-setup mac|remote   # Remote access
npx dmdfami-setup skill        # AI skills
npx dmdfami-setup ai|tools     # AI CLI tools
npx dmdfami-setup shortcuts    # Terminal shortcuts
npx dmdfami-setup dev          # Dev tools
npx dmdfami-setup dotfiles     # Dotfiles sync
npx dmdfami-setup --help       # Display help
```

### Key Files to Know

```
bin/cli.mjs              Entry point, argument parsing
lib/shell.mjs            Command execution helpers
lib/detector.mjs         System scanning, module loading
lib/runner.mjs           Module execution with topological sort
lib/ui.mjs               User interface (banners, menus, progress)

modules/*.mjs            7 installation modules

configs/Brewfile         Brew packages
configs/aliases.json     Shell aliases & functions
configs/npm-globals.json npm global packages

dotfiles/zshrc           Portable shell config
dotfiles/bin/            Executable scripts
```

### Key Concepts

- **Hub & Modules** - Separated concerns, independent modules
- **Topological Sort** - Dependency-ordered execution
- **Non-destructive** - Appends to config, never overwrites
- **Zero dependencies** - Only Node.js built-ins
- **Idempotent** - Safe to run multiple times

---

## Next Steps

1. **First time?** → Start with [Usage Guide](./usage-guide.md)
2. **Want to contribute?** → Read [Code Standards](./code-standards.md)
3. **Curious about design?** → See [System Architecture](./system-architecture.md)
4. **Need API details?** → Check [API Reference](./api-reference.md)
5. **Module questions?** → Consult [Modules Guide](./modules-guide.md)

---

**Happy documenting and developing!**
