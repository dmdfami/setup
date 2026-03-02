# API Reference - dmdfami/setup

Complete API documentation for library functions and module interfaces.

## Library: lib/shell.mjs

Command execution utilities with injection protection.

### hasCommand(cmd)

Check if a command exists in PATH.

**Signature**:
```javascript
function hasCommand(cmd: string): boolean
```

**Parameters**:
- `cmd` (string) - Command name to check (e.g., 'brew', 'node')

**Returns**: `boolean` - True if command exists and is executable

**Validation**: Uses regex `/^[a-zA-Z0-9._\-/]+$/` to prevent injection

**Example**:
```javascript
import { hasCommand } from './lib/shell.mjs';

if (hasCommand('brew')) {
  console.log('Homebrew is installed');
} else {
  console.log('Homebrew not found');
}
```

**Error handling**: Returns false for invalid or missing commands (no throws)

---

### run(cmd, opts?)

Execute command silently and return output.

**Signature**:
```javascript
function run(cmd: string, opts?: object): string | null
```

**Parameters**:
- `cmd` (string) - Shell command to execute
- `opts` (object, optional) - Options passed to `execSync`
  - `encoding` - Default: 'utf8'
  - `stdio` - Default: 'pipe' (capture output)
  - `timeout` - Default: 30000 (30 seconds)

**Returns**: `string | null`
- Output as trimmed string if successful
- `null` if command fails

**Example**:
```javascript
import { run } from './lib/shell.mjs';

const version = run('node --version');
console.log(`Node version: ${version}`);  // "v18.14.0"

const missing = run('command-that-doesnt-exist');
console.log(missing);  // null (no throw)
```

**Error handling**: Returns null on any error (no exception thrown)

---

### runVisible(cmd)

Execute command with output visible to user.

**Signature**:
```javascript
function runVisible(cmd: string): void
```

**Parameters**:
- `cmd` (string) - Shell command to execute

**Returns**: `void` - No return value

**Behavior**:
- Streams output to stdout in real-time
- User sees progress and interactive prompts
- Process inherits stdio (not captured)

**Example**:
```javascript
import { runVisible } from './lib/shell.mjs';

// User sees progress
runVisible('brew install node');

// User sees interactive prompt
runVisible('npm i -g some-package');
```

**Error handling**: Throws if command fails (unlike `run()`)

---

### getVersion(cmd, flag?)

Extract version string from command.

**Signature**:
```javascript
function getVersion(cmd: string, flag?: string): string | null
```

**Parameters**:
- `cmd` (string) - Command name to check
- `flag` (string, optional) - Flag to use (default: '--version')

**Returns**: `string | null`
- Semantic version (e.g., "18.14.0")
- First line of output if version not found
- `null` if command fails or times out

**Version parsing**:
1. Uses regex `/v?(\d+\.\d[\d.]*)/` to extract version
2. Returns first match if found
3. Falls back to first line of output
4. Returns null if no output

**Example**:
```javascript
import { getVersion } from './lib/shell.mjs';

const nodeVersion = getVersion('node');          // "18.14.0"
const brewVersion = getVersion('brew');          // "4.2.1"
const goVersion = getVersion('go', 'version');   // "1.20"
const missing = getVersion('not-a-command');     // null
```

**Timeout**: 5 seconds (hard-coded)

**Error handling**: Returns null on timeout or error

---

## Library: lib/detector.mjs

System scanning and module loading.

### scanSystemTools()

Detect installed system tools and versions.

**Signature**:
```javascript
function scanSystemTools(): Array<{
  name: string,
  installed: boolean,
  version: string
}>
```

**Returns**: Array of tool detection results

**Tools scanned**:
1. Homebrew (cmd: 'brew')
2. Node.js (cmd: 'node')
3. Python/pipx (cmd: 'pipx', alt: 'python3')
4. Git + gh CLI (cmd: 'gh', alt: 'git')
5. Go (cmd: 'go', vFlag: 'version')
6. tmux (cmd: 'tmux', vFlag: '-V')

**Example**:
```javascript
import { scanSystemTools } from './lib/detector.mjs';

const tools = scanSystemTools();
tools.forEach(t => {
  const status = t.installed ? '✓' : '✗';
  console.log(`${status} ${t.name} (${t.version})`);
});
```

**Output**:
```javascript
[
  { name: 'Homebrew', installed: true, version: '4.2.1' },
  { name: 'Node.js', installed: true, version: '18.14.0' },
  { name: 'Python/pipx', installed: false, version: '' },
  { name: 'Git + gh CLI', installed: true, version: '2.40.0' },
  { name: 'Go', installed: false, version: '' },
  { name: 'tmux', installed: false, version: '' }
]
```

---

### scanAITools()

Detect installed AI CLI tools and versions.

**Signature**:
```javascript
function scanAITools(): Array<{
  name: string,
  installed: boolean,
  version: string
}>
```

**Returns**: Array of tool detection results

**Tools scanned**:
1. Claude Code (cmd: 'claude')
2. Codex CLI (cmd: 'codex')
3. Gemini CLI (cmd: 'gemini')
4. Droid CLI (cmd: 'droid')
5. ClaudeKit (cmd: 'ck')
6. CCS (cmd: 'ccs')

**Example**:
```javascript
import { scanAITools } from './lib/detector.mjs';

const tools = scanAITools();
const installed = tools.filter(t => t.installed);
console.log(`${installed.length} AI tools installed`);
```

---

### loadModules()

Dynamically import and load all modules.

**Signature**:
```javascript
async function loadModules(): Promise<Array<Module>>
```

**Returns**: Promise resolving to array of module objects

**Module interface**:
```javascript
{
  name: string,           // Module identifier
  order: number,          // Execution order
  description: string,    // UI label (Vietnamese)
  dependencies: string[], // Prerequisite modules
  detect: () => Promise<DetectionResult>,
  install: () => Promise<void>,
  verify: () => Promise<boolean>
}
```

**Loading process**:
1. Read `modules/` directory
2. Filter `.mjs` files
3. Dynamic import each file
4. Extract default export
5. Sort by `order` property (ascending)

**Example**:
```javascript
import { loadModules } from './lib/detector.mjs';

const modules = await loadModules();
console.log(`Loaded ${modules.length} modules`);

modules.forEach(m => {
  console.log(`[${m.order}] ${m.name}`);
});
```

**Output**:
```
Loaded 7 modules
[1] system-prereqs
[2] remote-access
[3] skills
[4] ai-cli-tools
[5] shortcuts
[6] dev-tools
[7] dotfiles
```

**Sorting**: By `order` property (fallback: 99 if not specified)

---

## Library: lib/runner.mjs

Module execution with dependency resolution.

### runModules(modules)

Execute modules in dependency-resolved order.

**Signature**:
```javascript
async function runModules(modules: Array<Module>): Promise<void>
```

**Parameters**:
- `modules` (Array<Module>) - Modules to execute

**Returns**: Promise that resolves when all modules complete

**Execution**:
1. Sort modules via `topoSort()` by dependencies
2. For each module in order:
   - Show progress (`current/total Installing module-name...`)
   - Call `module.install()`
   - Call `module.verify()` to confirm
   - Show result (✓ done or ✗ failed)
3. Continue even if module fails (non-blocking)

**Progress format**: `[1/7] Installing system-prereqs...`
- Updates with status: ✓ (green), ✗ (red)
- Each module on separate line

**Example**:
```javascript
import { runModules } from './lib/runner.mjs';

const selected = [
  systemPrereqs,
  devTools,
  shortcuts
];

await runModules(selected);
console.log('Installation complete!');
```

**Error handling**: Module errors logged but don't halt pipeline

---

### topoSort(modules)

Sort modules by dependencies (internal, used by runModules).

**Signature**:
```javascript
function topoSort(modules: Array<Module>): Array<Module>
```

**Parameters**:
- `modules` (Array<Module>) - Unsorted modules with dependencies

**Returns**: Topologically sorted array

**Algorithm**: Kahn's algorithm for topological sort
1. Build dependency graph
2. Calculate in-degree (number of dependencies)
3. Process nodes with in-degree 0 first
4. Resolve dependencies as modules complete
5. Return ordered result

**Example**:
```javascript
// Input: [shortcuts, system, dev-tools]
// shortcuts depends on system
// dev-tools depends on system

// topoSort returns: [system, shortcuts, dev-tools]
```

**Circular dependencies**: Currently not detected; modules appended in order

---

## Library: lib/ui.mjs

User interface functions for banners, menus, and progress.

### showBanner()

Display application banner with version.

**Signature**:
```javascript
function showBanner(): void
```

**Returns**: `void`

**Output**:
```
  dmdfami/setup v1.0.0
  ====================
```

**Details**:
- Reads version from `package.json`
- Adds blank lines for spacing
- Called at CLI startup

**Example**:
```javascript
import { showBanner } from './lib/ui.mjs';

showBanner();
```

---

### showScanResults(systemTools, aiTools)

Display 2-column tables of system and AI tool status.

**Signature**:
```javascript
function showScanResults(
  systemTools: Array<{name, installed, version}>,
  aiTools: Array<{name, installed, version}>
): void
```

**Parameters**:
- `systemTools` - Array from `scanSystemTools()`
- `aiTools` - Array from `scanAITools()`

**Returns**: `void`

**Output format**:
```
  ── System Tools ─────────────────────
  ✓ Homebrew (4.2.1)     ✓ Node.js (18.14.0)
  ✗ Python/pipx           ✓ Git + gh CLI
  ✗ Go                    ✗ tmux

  ── AI CLI Tools ─────────────────────
  ✓ Claude Code           ✗ Codex CLI
  ✓ ClaudeKit             ✗ Gemini CLI
  ✓ CCS (1.1.0)           ✗ Repomix
```

**Features**:
- 2-column layout (aligned)
- Color-coded: ✓ (green), ✗ (red)
- Shows version if installed
- 22-character padding per column

---

### ask(question)

Prompt user for input (readline-based).

**Signature**:
```javascript
function ask(question: string): Promise<string>
```

**Parameters**:
- `question` (string) - Prompt text to display

**Returns**: Promise<string> - User input (trimmed)

**Example**:
```javascript
import { ask } from './lib/ui.mjs';

const choice = await ask('Select module [1-7, all]: ');
console.log(`You selected: ${choice}`);
```

**Behavior**:
- Displays question, waits for input
- User types and presses Enter
- Returns input without trailing newline
- Resolves immediately, no timeout

---

### selectModules(modules)

Display module menu and get user selection.

**Signature**:
```javascript
async function selectModules(modules: Array<Module>): Promise<Array<Module>>
```

**Parameters**:
- `modules` (Array<Module>) - Modules to display

**Returns**: Promise<Array<Module>> - Selected modules

**Output**:
```
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

**Input parsing**:
- `1` → Module 1 only
- `1,3` → Modules 1, 3
- `1 3 5` → Modules 1, 3, 5 (space-separated)
- `all` → All modules
- (empty) → Return empty array

**Returns**: Array of selected module objects (deduplicated, in selection order)

**Example**:
```javascript
import { selectModules, loadModules } from './lib/ui.mjs';

const modules = await loadModules();
const selected = await selectModules(modules);
console.log(`Selected ${selected.length} modules`);
```

---

### showProgress(current, total, name, state)

Display module installation progress.

**Signature**:
```javascript
function showProgress(
  current: number,
  total: number,
  name: string,
  state: 'installing' | 'done' | 'failed' | 'skipped'
): void
```

**Parameters**:
- `current` (number) - Current module number (1-based)
- `total` (number) - Total modules to install
- `name` (string) - Module name or description
- `state` (string) - Status: 'installing', 'done', 'failed', 'skipped'

**Returns**: `void`

**Output examples**:
```
  [1/7] Installing system-prereqs... ✓
  [2/7] Installing shortcuts... ✗
  [3/7] Installing dev-tools... (skipped)
```

**Color coding**:
- ✓ = Green (done)
- ✗ = Red (failed)
- (skipped) = Yellow

**Behavior**:
- 'installing' state: outputs without newline, waits for follow-up
- 'done'/'failed'/'skipped': outputs with newline (completes line)

---

### closeUI()

Close readline interface (cleanup).

**Signature**:
```javascript
function closeUI(): void
```

**Returns**: `void`

**Purpose**: Release readline handle and allow process to exit

**Example**:
```javascript
import { closeUI } from './lib/ui.mjs';

console.log('Done!');
closeUI();  // Clean exit
process.exit(0);
```

---

## Module Interface

All modules must export default object with this structure.

### Module Object

```javascript
export default {
  name: string,                      // Unique identifier (kebab-case)
  order: number,                     // Execution priority (1-7+)
  description: string,               // Vietnamese label
  dependencies: Array<string>,       // Module names required first

  async detect(): Promise<{
    installed: boolean,
    details: string
  }>,

  async install(): Promise<void>,    // Perform installation

  async verify(): Promise<boolean>   // Confirm success
}
```

### Module Properties

**name** (string, required):
- Unique module identifier
- kebab-case (e.g., 'system-prereqs')
- Used in CLI argument mapping and logs
- Must match filename (without .mjs)

**order** (number, required):
- Execution priority in topological sort
- Lower numbers run first (among unrelated modules)
- Typical: 1-7
- No circular dependencies allowed

**description** (string, required):
- User-facing label in interactive menu
- Vietnamese text preferred
- Example: "Công cụ hệ thống (Homebrew, Node.js)"

**dependencies** (Array<string>, required):
- Names of prerequisite modules
- Empty array if no dependencies
- Enforced by topological sort
- Example: `['system-prereqs']`

### Module Methods

**async detect()** - Check installation status

```javascript
async detect(): Promise<{
  installed: boolean,
  details: string
}>
```

Returns:
- `installed` - true if module's purpose is satisfied
- `details` - status string for display (e.g., version info)

Used to:
- Show current status in menu
- Skip installation if already complete
- Determine if verification needed

**async install()** - Perform installation

```javascript
async install(): Promise<void>
```

Called when module selected for installation. Should:
- Check if already installed (skip if so)
- Download/install required tools
- Configure user files (non-destructive)
- Write progress to console
- Throw or log errors (runner catches)

May use:
- `hasCommand()`, `run()`, `runVisible()` from lib/shell.mjs
- `ask()`, `closeUI()` from lib/ui.mjs
- `readFileSync()`, `writeFileSync()` from node:fs
- Any Node.js built-in module

**async verify()** - Confirm success

```javascript
async verify(): Promise<boolean>
```

Called after `install()` to confirm module completed successfully.

Returns: true if installation succeeded, false otherwise

Usually checks:
- `hasCommand(tool)` - Tool now exists in PATH
- `existsSync(file)` - File created
- `contains(text)` - File contains expected content

---

## Complete Module Example

```javascript
import { hasCommand, run, runVisible } from '../lib/shell.mjs';
import { ask } from '../lib/ui.mjs';

export default {
  name: 'example-module',
  order: 4,
  description: 'Example module for documentation',
  dependencies: ['system-prereqs'],

  async detect() {
    const installed = hasCommand('example-tool');
    const version = installed ? run('example-tool --version') : '';

    return {
      installed,
      details: version ? `v${version}` : 'not installed'
    };
  },

  async install() {
    console.log('\n    Installing example-tool...');

    if (hasCommand('example-tool')) {
      console.log('    Already installed!');
      return;
    }

    try {
      runVisible('brew install example-tool');
      console.log('    Done!');
    } catch (err) {
      console.log(`    Error: ${err.message}`);
    }
  },

  async verify() {
    return hasCommand('example-tool');
  }
};
```

---

## Configuration Files (JSON Format)

### aliases.json

Shell aliases, functions, and path configuration.

```json
{
  "aliases": {
    "alias-name": "alias-value",
    "ll": "ls -lah"
  },
  "global_aliases": {
    "global-alias": "value"
  },
  "functions": {
    "function-name": "function body"
  }
}
```

**Properties**:
- `aliases` - Standard shell aliases (expanded at command start)
- `global_aliases` - Zsh global aliases (expanded anywhere in line)
- `functions` - Shell functions (callable with args)

---

### npm-globals.json

npm global packages to install.

```json
{
  "packages": [
    {
      "name": "display-name",
      "package": "npm-package-name",
      "cmd": "command-name",
      "description": "What it does"
    }
  ]
}
```

**Properties**:
- `name` - Display name (used in UI)
- `package` - npm package to install (passed to `npm i -g`)
- `cmd` - Command to check in PATH (for detection)
- `description` - Optional description

---

## Error Handling

### Try/Catch Pattern

```javascript
async install() {
  try {
    runVisible('brew install package');
  } catch (err) {
    console.log(`Failed: ${err.message}`);
    // Continue (non-blocking)
  }
}
```

### Silent Failure Pattern

```javascript
async install() {
  const version = run('command --version');  // Returns null if fails
  if (!version) {
    console.log('Command not found — skipping');
    return;
  }
  // Use version...
}
```

### Error Propagation

```javascript
async install() {
  // Throw for critical failures (runner will catch)
  if (!hasCommand('brew')) {
    throw new Error('Homebrew required — run system-prereqs first');
  }
}
```

---

## Best Practices

1. **Use `hasCommand()` before running tool** - Prevents errors
2. **Always implement `detect()` accurately** - Skips unnecessary work
3. **Make `install()` idempotent** - Safe to run multiple times
4. **Log progress** - User sees activity
5. **Fail gracefully** - Log errors but continue (unless critical)
6. **Verify after install** - Confirm success in `verify()`
7. **No module-to-module calls** - Each module independent
8. **Use only Node.js built-ins** - Zero npm dependencies
9. **Respect user config** - Never overwrite, only append
10. **Set correct file permissions** - Secrets: 0o600, executables: 0o755
