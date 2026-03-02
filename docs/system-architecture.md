# System Architecture - dmdfami/setup

## Architecture Pattern: Hub & Modules

The application follows a **hub-and-spoke** architectural pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Entry Point: cli.mjs                      │
│  (Parse args, show UI, load modules, select, execute)       │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┬──────────────┬─────────────┐
        │                   │              │             │
   ┌────v────┐      ┌──────v──────┐  ┌───v────┐  ┌────v────┐
   │detector │      │   runner    │  │   ui   │  │  shell  │
   │  .mjs   │      │   .mjs      │  │  .mjs  │  │  .mjs   │
   └─────────┘      └─────────────┘  └────────┘  └─────────┘
        │
   ┌────v──────────────────────────────────────────────────┐
   │         Modules (7 independent units)                  │
   ├──────────────────────────────────────────────────────┤
   │ [1] system-prereqs.mjs                                │
   │ [2] remote-access.mjs                                 │
   │ [3] skills.mjs                                        │
   │ [4] ai-cli-tools.mjs                                  │
   │ [5] shortcuts.mjs                                     │
   │ [6] dev-tools.mjs                                     │
   │ [7] dotfiles.mjs                                      │
   └──────────────────────────────────────────────────────┘
```

### Hub Responsibilities (bin/cli.mjs)

1. **Parse CLI arguments** - Map `mac|skill|ai|dev|all` to module names
2. **Display UI** - Banner, system scan, module menu, progress
3. **Load modules** - Dynamic import from `modules/*.mjs`, sort by order
4. **Select modules** - Interactive prompt or auto-select from args
5. **Execute** - Pass selected modules to runner

### Spoke Modules (modules/*.mjs)

Each module is independent with 3 required methods:

```javascript
export default {
  name: 'module-name',           // Unique identifier
  order: 1,                       // Execution priority
  description: 'Module label',    // Vietnamese UI label
  dependencies: [],               // Module names required before this one

  async detect() {                // Check if already installed
    return {
      installed: bool,
      details: 'status string'
    };
  },

  async install() {               // Perform installation
    // Use lib/shell.mjs helpers: hasCommand, run, runVisible
    // Use lib/ui.mjs helpers: ask, closeUI
    console.log('Installing...');
  },

  async verify() {                // Confirm installation
    return bool;
  }
};
```

**No inter-module dependencies** - Each module is self-contained and can run independently.

## Execution Flow

### 1. Initialize (bin/cli.mjs)

```
1. Show banner
2. Parse process.argv
3. scanSystemTools() - check for brew, node, python, git, go, tmux
4. scanAITools() - check for claude, codex, gemini, etc.
5. showScanResults() - display 2-column tables
6. loadModules() - dynamic import all .mjs files
7. Sort by order property
```

### 2. User Selection

**Interactive mode** (no args):
- Show module menu with icons
- Prompt: `Chọn [1-7, all]:`
- Parse comma/space-separated numbers
- Return selected modules

**Direct mode** (arg provided):
- Lookup arg in ARG_MAP
- Filter modules by name
- Close UI and proceed

**All mode** (`all` argument):
- Select all modules
- Close UI and proceed

### 3. Execution (lib/runner.mjs - Topological Sort)

```javascript
topoSort(modules) {
  // Build dependency graph using Kahn's algorithm
  // Compute in-degree for each module
  // Process modules with in-degree 0 first
  // Resolve dependencies as modules complete
  // Return ordered array
}

runModules(modules) {
  const sorted = topoSort(modules);
  for (const mod of sorted) {
    showProgress(current, total, name, 'installing');
    await mod.install();
    const ok = await mod.verify();
    showProgress(current, total, name, ok ? 'done' : 'failed');
  }
}
```

**Example dependency resolution**:
```
Selected: [dev-tools, system-prereqs, shortcuts]

Dependency graph:
  dev-tools → depends on system-prereqs
  shortcuts → depends on system-prereqs

Execution order: [system-prereqs, dev-tools, shortcuts]
                  (no dependency)  (waiting)      (waiting)
```

### 4. Module Installation Patterns

**Pattern A: Simple Detection + Run**
```javascript
// system-prereqs.mjs
async install() {
  if (!hasCommand('brew')) {
    runVisible('curl ... | bash');  // Install Homebrew
  }
  if (!hasCommand('node')) {
    runVisible('brew install node');
  }
}
```

**Pattern B: Interactive Selection**
```javascript
// ai-cli-tools.mjs
async install() {
  const missing = AI_TOOLS.filter(t => !hasCommand(t.cmd));
  console.log('Missing AI tools:');
  missing.forEach((t, i) => console.log(`[${i+1}] ${t.name}`));

  const choice = await ask('Install which? ');
  const toInstall = parseChoice(choice, missing);

  for (const tool of toInstall) {
    runVisible(tool.install);  // npm i -g, brew install, etc.
  }
}
```

**Pattern C: Config Generation + Shell Integration**
```javascript
// shortcuts.mjs
async install() {
  const aliases = JSON.parse(readFileSync('configs/aliases.json'));
  const script = generateShortcutsScript(aliases);
  writeFileSync('~/.dmdfami/shortcuts.sh', script);

  // Append source line to .zshrc (never overwrite)
  const zshrc = readFileSync('~/.zshrc', 'utf8');
  if (!zshrc.includes('.dmdfami/shortcuts.sh')) {
    appendToFile('~/.zshrc', 'source ~/.dmdfami/shortcuts.sh');
  }
}
```

## Core Libraries

### lib/shell.mjs - Command Execution

**Injection-safe command detection**:
```javascript
export function hasCommand(cmd) {
  const SAFE_CMD_RE = /^[a-zA-Z0-9._\-/]+$/;
  if (!SAFE_CMD_RE.test(cmd)) return false;  // Reject suspicious input
  return execFileSync('which', [cmd]) !== null;
}
```

**Silent execution** (capture output):
```javascript
export function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
}
```

**Visible execution** (show to user):
```javascript
export function runVisible(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}
```

**Version extraction**:
```javascript
export function getVersion(cmd, flag = '--version') {
  const out = execFileSync(cmd, [flag]).trim();
  const match = out.match(/v?(\d+\.\d[\d.]*)/);
  return match ? match[1] : out.split('\n')[0];
}
```

### lib/detector.mjs - System Scanning

**Tool scanning** (returns array of `{ name, installed, version }`):
```javascript
export function scanSystemTools() {
  return [
    { name: 'Homebrew', cmd: 'brew' },
    { name: 'Node.js', cmd: 'node' },
    // ... mapped through hasCommand() & getVersion()
  ];
}

export function scanAITools() {
  return [
    { name: 'Claude Code', cmd: 'claude' },
    // ... mapped through hasCommand() & getVersion()
  ];
}
```

**Module loading** (dynamic import with sorting):
```javascript
export async function loadModules() {
  const files = readdirSync('modules/').filter(f => f.endsWith('.mjs'));
  const modules = [];

  for (const file of files) {
    const mod = await import(join('modules', file));
    modules.push(mod.default);
  }

  modules.sort((a, b) => (a.order || 99) - (b.order || 99));
  return modules;
}
```

### lib/ui.mjs - User Interface

**Banner display** (reads package.json):
```javascript
export function showBanner() {
  const pkg = JSON.parse(readFileSync('package.json'));
  console.log(`dmdfami/setup v${pkg.version}`);
}
```

**Status tables** (2-column aligned, colored indicators):
```
✓ Homebrew (4.2.1)     ✗ Go
✓ Node.js (18.14.0)    ✗ tmux
```

**Interactive menu** (numbered selection with icons):
```
🔧 [1] Công cụ hệ thống
🔑 [2] Truy cập từ xa
🧠 [3] Bộ kỹ năng AI
...
Chọn [1-7, all]: 1,3,5
```

**Progress indicator** (Kahn-ordered execution):
```
[1/3] Installing system-prereqs... ✓
[2/3] Installing shortcuts... ✓
[3/3] Installing dev-tools... ✗
```

## Data Flow

### User Input → Module Selection → Execution

```
CLI Args
  ↓
Parse ARG_MAP (if provided) or show Interactive Menu
  ↓
User selects modules [shortcuts, ai-cli-tools, dev-tools]
  ↓
Resolve Dependencies via topoSort()
  ↓
Execution order: [system-prereqs, ai-cli-tools, shortcuts, dev-tools]
                  (dependency)   (depends on sys)  (depends on sys)
  ↓
Install → Verify for each module
  ↓
Show progress + status
```

### Configuration Sources

```
configs/
├── Brewfile                # Brew packages
├── aliases.json            # Shell aliases & functions
└── npm-globals.json        # npm global packages

dotfiles/
├── zshrc                   # Portable shell config
└── bin/                    # Executable scripts
    ├── mac
    ├── qall
    └── ...

Installation Target:
~/.dmdfami/                 # Hidden user directory
├── shortcuts.sh            # Generated from aliases.json
└── dotfiles/
    └── zshrc               # Copied from dotfiles/zshrc
```

## Security Architecture

### Command Injection Prevention

**Input validation** in `lib/shell.mjs`:
```javascript
const SAFE_CMD_RE = /^[a-zA-Z0-9._\-/]+$/;

if (!SAFE_CMD_RE.test(cmd)) return false;  // Reject: @, |, $, `, etc.
execFileSync(cmd, args);  // NOT execSync → prevents shell interpretation
```

### Credential Handling

**Claude Code Keychain Integration** (ai-cli-tools.mjs):
```javascript
// Extract from macOS Keychain
const cred = run('security find-generic-password -s "Claude Code-credentials" -w');

// Validate JSON
try { JSON.parse(cred); } catch { return; }

// Write with restricted permissions
writeFileSync('~/.claude/.credentials.json', cred, { mode: 0o600 });
```

### Config File Safety

**Non-destructive shell integration**:
```javascript
// Always append, never truncate
const sourceLine = '[ -f ~/.dmdfami/shortcuts.sh ] && source ~/.dmdfami/shortcuts.sh';
if (!zshrc.includes('.dmdfami/shortcuts.sh')) {
  writeFileSync(zshrcPath, zshrc + sourceLine);  // Append only
}
```

## Error Handling

### Module Installation Failures

```javascript
for (const mod of sorted) {
  try {
    await mod.install();
    const ok = await mod.verify();
    showProgress(current, total, name, ok ? 'done' : 'failed');
  } catch (err) {
    showProgress(current, total, name, 'failed');
    console.error(`Error: ${err.message}`);
  }
}
// Continue with next module (non-blocking)
```

**Graceful degradation**:
- Single module failure doesn't stop pipeline
- User sees ✗ status, can re-run later
- Subsequent modules proceed independently (unless depend on failed module)

## Performance Characteristics

**Startup**: ~100ms (banner + scan system tools)
**Module loading**: ~50ms (dynamic import)
**Dependency resolution**: O(n + m) where n=modules, m=dependencies
**Installation**: Varies by module (brew install: 30s+)

**Optimization techniques**:
- Lazy module loading (only when needed)
- Cached command detection (single scan at startup)
- Parallel-safe (each module independent)
