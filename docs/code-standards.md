# Code Standards - dmdfami/setup

## Overview

This document defines coding standards, patterns, and conventions for the dmdfami/setup project. All code must follow these standards to maintain consistency, readability, and maintainability.

## Project Constraints

- **Zero npm dependencies** - Only Node.js built-in modules
- **ESM only** - `"type": "module"` in package.json
- **Node.js 18+** - Use modern Node features (native fetch, imports, etc.)
- **macOS target** - Homebrew and zsh/bash focus
- **File size limit** - Keep individual files under 200 lines for context management

## File Organization

### Directory Structure

```
dmdfami-setup/
├── bin/
│   └── cli.mjs                  # ~100 LOC: Entry point, arg parsing
├── lib/
│   ├── shell.mjs                # ~50 LOC: Command execution helpers
│   ├── detector.mjs             # ~60 LOC: System scanning, module loading
│   ├── runner.mjs               # ~65 LOC: Topological sort, execution
│   ├── ui.mjs                   # ~100 LOC: Banner, menus, progress
│   └── http.mjs                 # Optional: HTTPS fetch/download
├── modules/                      # 7 independent modules
│   ├── system-prereqs.mjs       # ~55 LOC
│   ├── remote-access.mjs        # ~25 LOC
│   ├── skills.mjs               # ~35 LOC
│   ├── ai-cli-tools.mjs         # ~100 LOC
│   ├── shortcuts.mjs            # ~75 LOC
│   ├── dev-tools.mjs            # ~50 LOC
│   └── dotfiles.mjs             # ~55 LOC
├── configs/                      # JSON/text configuration
│   ├── Brewfile
│   ├── aliases.json
│   ├── npm-globals.json
│   └── ssh-key.pub
├── dotfiles/                     # Portable shell files
│   ├── zshrc
│   └── bin/
│       ├── mac
│       ├── qall
│       └── ...
├── bootstrap.sh                  # Installs Node.js before CLI
├── package.json
└── README.md
```

### Naming Conventions

**Files**:
- Use kebab-case: `system-prereqs.mjs`, `ai-cli-tools.mjs`
- Describe purpose clearly: `shell.mjs` (not `utils.mjs`)
- Module files match module name: `name: 'system-prereqs'` in `system-prereqs.mjs`

**Functions**:
- camelCase: `hasCommand()`, `runVisible()`, `getVersion()`
- Verb-first for actions: `run()`, `scan()`, `load()`
- Descriptive: `scanSystemTools()` (not `scan()`)

**Variables**:
- camelCase: `moduleName`, `isInstalled`, `selectedModules`
- UPPER_SNAKE_CASE for constants: `SAFE_CMD_RE`, `ARG_MAP`, `BIN_SCRIPTS`
- No single-letter except loop vars: `for (const mod of modules)` is OK

**Modules**:
- Exported as `export default { name, order, description, dependencies, ... }`
- Property names match module interface: `install()`, `verify()`, `detect()`

## Code Style

### JavaScript Formatting

**Indentation**: 2 spaces

```javascript
export function hasCommand(cmd) {
  if (!cmd) return false;
  try {
    execFileSync('which', [cmd]);
    return true;
  } catch {
    return false;
  }
}
```

**Line length**: 90 characters max (prefer semantic breaks)

```javascript
// Good: semantic break before arrow
const sorted = modules.sort(
  (a, b) => (a.order || 99) - (b.order || 99)
);

// Avoid: arbitrary mid-line break
const tools = [
  { name: 'Tool1', cmd: 'tool1' },
  { name: 'Tool2', cmd: 'tool2' },
];
```

**Braces**: Always required (no implicit returns in if/for)

```javascript
// Good
if (installed) {
  console.log('Ready!');
}

// Avoid
if (installed) console.log('Ready!');
```

**Async/await**: Preferred over `.then()` chains

```javascript
// Good
export async function loadModules() {
  const modules = [];
  for (const file of files) {
    const mod = await import(file);
    modules.push(mod.default);
  }
  return modules;
}

// Avoid
function loadModules() {
  return readdir('modules').then(files =>
    Promise.all(files.map(f => import(f)))
  );
}
```

**String templates**: Use backticks for interpolation

```javascript
// Good
console.log(`Installing ${tool.name}...`);
console.log(`[${current}/${total}] ${name}`);

// Avoid when no interpolation
const msg = `Done!`;  // Use single quotes instead
const msg = 'Done!';  // Good
```

### Module Structure

Every module must export default object with this structure:

```javascript
import { hasCommand, run, runVisible } from '../lib/shell.mjs';

// File-scoped constants
const SOME_CONSTANT = 'value';

export default {
  // Required properties
  name: 'module-name',          // Unique, kebab-case
  order: 3,                     // 1-7 for display order
  description: 'Module label',  // Vietnamese description
  dependencies: ['system-prereqs'],  // Array of module names

  // Required methods
  async detect() {
    // Return { installed: bool, details: 'string' }
    return {
      installed: hasCommand('brew'),
      details: `brew: ${getVersion('brew')}`,
    };
  },

  async install() {
    // Perform installation
    if (!hasCommand('brew')) {
      runVisible('curl ... | bash');
    }
  },

  async verify() {
    // Return boolean confirming success
    return hasCommand('brew');
  },
};
```

### Function Guidelines

**Small, focused functions**:

```javascript
// Good: single responsibility
function sanitizeCmd(cmd) {
  return /^[a-zA-Z0-9._\-/]+$/.test(cmd);
}

function hasCommand(cmd) {
  if (!cmd || !sanitizeCmd(cmd)) return false;
  try {
    execFileSync('which', [cmd]);
    return true;
  } catch {
    return false;
  }
}

// Avoid: mixing concerns
function validateAndRun(cmd) {
  if (cmd === '') return false;
  if (!cmd.match(/^[a-zA-Z0-9]+$/)) return false;
  // ... 20 more lines
}
```

**Early returns**:

```javascript
// Good: fail fast
export function hasCommand(cmd) {
  if (!cmd) return false;
  if (!SAFE_CMD_RE.test(cmd)) return false;
  try {
    execFileSync('which', [cmd]);
    return true;
  } catch {
    return false;
  }
}

// Avoid: nested conditions
function hasCommand(cmd) {
  if (cmd) {
    if (SAFE_CMD_RE.test(cmd)) {
      try {
        if (execFileSync('which', [cmd])) {
          return true;
        }
      } catch {}
    }
  }
  return false;
}
```

**Error handling**:

```javascript
// Good: try/catch with meaningful recovery
async install() {
  try {
    runVisible('brew bundle --file="Brewfile"');
  } catch (err) {
    console.log('Some packages may have failed — continuing');
  }
}

// Avoid: silent failures
async install() {
  try {
    runVisible('brew bundle --file="Brewfile"');
  } catch {} // Why did it fail?
}
```

## Security Patterns

### Command Injection Prevention

**Always validate command names**:

```javascript
// Good: regex validation
const SAFE_CMD_RE = /^[a-zA-Z0-9._\-/]+$/;
if (!SAFE_CMD_RE.test(cmd)) return false;
execFileSync(cmd, args);

// Avoid: user input in shell string
runVisible(`${userInput} install package`);  // Dangerous!

// Avoid: passing complex strings to execFileSync
execFileSync('brew install ' + packageName);  // Use args array instead
execFileSync('brew', ['install', packageName]);  // Good
```

### File Operations

**Check existence before reading**:

```javascript
// Good: check then read
if (!existsSync(filePath)) {
  return null;
}
const content = readFileSync(filePath, 'utf8');

// Avoid: assume file exists
const content = readFileSync(filePath, 'utf8');  // Throws if missing
```

**Never overwrite user config**:

```javascript
// Good: append only, check before adding
const zshrc = existsSync(zshrcPath)
  ? readFileSync(zshrcPath, 'utf8')
  : '';

if (!zshrc.includes('source-line')) {
  writeFileSync(zshrcPath, zshrc + sourceLine);
}

// Avoid: truncating user files
writeFileSync(zshrcPath, sourceLine);  // Overwrites entire file!
```

**Restrict secret file permissions**:

```javascript
// Good: 0o600 (user read/write only)
writeFileSync(credFile, credentials, { mode: 0o600 });

// Avoid: default permissions
writeFileSync(credFile, credentials);  // World-readable!
```

## Module Patterns

### Pattern 1: System Tool Check + Install

**Used by**: system-prereqs, dev-tools

```javascript
async detect() {
  const brew = hasCommand('brew');
  const node = hasCommand('node');
  return {
    installed: brew && node,
    details: `brew: ${brew ? getVersion('brew') : 'missing'}`,
  };
}

async install() {
  if (!hasCommand('brew')) {
    console.log('Installing Homebrew...');
    runVisible('curl -fsSL https://... | bash');
  }

  if (!hasCommand('node')) {
    console.log('Installing Node.js...');
    runVisible('brew install node');
  }
}

async verify() {
  return hasCommand('brew') && hasCommand('node');
}
```

### Pattern 2: Interactive Tool Selection

**Used by**: ai-cli-tools

```javascript
const TOOLS = [
  { name: 'Claude Code', cmd: 'claude', install: 'npm i -g ...' },
  { name: 'Gemini CLI', cmd: 'gemini', install: 'brew install ...' },
  // ...
];

async install() {
  const missing = TOOLS.filter(t => !hasCommand(t.cmd));

  if (missing.length === 0) {
    console.log('All tools installed!');
    return;
  }

  console.log('Missing:');
  missing.forEach((t, i) => console.log(`  [${i + 1}] ${t.name}`));

  const choice = await ask('Install which? ');
  const toInstall = parseSelection(choice, missing);

  for (const tool of toInstall) {
    try {
      runVisible(tool.install);
    } catch {
      console.log(`Failed: ${tool.name}`);
    }
  }
}
```

### Pattern 3: Config Generation + Shell Integration

**Used by**: shortcuts, dotfiles

```javascript
async install() {
  // 1. Generate config from template
  const config = JSON.parse(readFileSync('configs/aliases.json'));
  const script = generateScript(config);  // Custom function
  writeFileSync('~/.dmdfami/shortcuts.sh', script);

  // 2. Integrate into shell (non-destructive)
  const home = process.env.HOME;
  const zshrc = existsSync(`${home}/.zshrc`)
    ? readFileSync(`${home}/.zshrc`, 'utf8')
    : '';

  const sourceLine = '[ -f ~/.dmdfami/shortcuts.sh ] && source ~/.dmdfami/shortcuts.sh';
  if (!zshrc.includes('.dmdfami/shortcuts.sh')) {
    writeFileSync(
      `${home}/.zshrc`,
      zshrc + (zshrc.endsWith('\n') ? '' : '\n') + sourceLine + '\n',
    );
  }

  console.log('Config installed. Open new terminal to activate.');
}

async verify() {
  const home = process.env.HOME;
  const zshrc = readFileSync(`${home}/.zshrc`, 'utf8');
  return zshrc.includes('.dmdfami/shortcuts.sh');
}
```

## Testing & Validation

### Manual Testing Checklist

Before committing module changes:

```bash
# 1. Test single module execution
npx ./bin/cli.mjs mac          # Test remote-access
npx ./bin/cli.mjs all          # Test all modules

# 2. Test interactive menu
npx ./bin/cli.mjs              # Select subset manually

# 3. Test idempotency (run twice)
npx ./bin/cli.mjs system
npx ./bin/cli.mjs system       # Should not re-install

# 4. Test with no args
npx ./bin/cli.mjs --help
npx ./bin/cli.mjs -h
```

### Code Quality Checks

```bash
# Syntax validation (no linter required, but verify compiles)
node --check bin/cli.mjs
node --check lib/*.mjs
node --check modules/*.mjs

# Test execution path
npm test  # (if test script added)
```

## Documentation Standards

### Code Comments

**When to comment**:
- Complex algorithms (e.g., Kahn's topological sort)
- Non-obvious regex patterns
- Security-critical validations
- Integration points with external tools

**When NOT to comment**:
- Self-documenting code: `const selected = modules.filter(m => m.installed)`
- Simple property assignments
- Standard JavaScript patterns

**Comment style**:

```javascript
// Single-line comments for short explanations
export function hasCommand(cmd) {
  // Prevent command injection via whitelist
  const SAFE_CMD_RE = /^[a-zA-Z0-9._\-/]+$/;
  if (!SAFE_CMD_RE.test(cmd)) return false;
  // ...
}

// Multi-line for complex logic
/**
 * Topological sort using Kahn's algorithm
 * Ensures modules execute after all dependencies
 */
function topoSort(modules) {
  // ... implementation
}
```

### Inline Documentation

**For public exports**:

```javascript
/**
 * Run command silently, return trimmed stdout or null on failure
 */
export function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
  } catch {
    return null;
  }
}
```

**For module interface**:

```javascript
export default {
  name: 'ai-cli-tools',
  order: 4,
  description: 'Công cụ AI dòng lệnh (Claude, Codex, Gemini...)',
  dependencies: ['system-prereqs'],

  // Detect installation status
  async detect() { /* ... */ },

  // Interactive install of missing tools
  async install() { /* ... */ },

  // Verify at least one tool is installed
  async verify() { /* ... */ },
};
```

## Changelog & Versioning

### Commit Message Format

Use conventional commits:

```
feat(modules): add support for new AI tool
fix(shell): prevent command injection in getVersion()
docs(readme): update module descriptions
refactor(cli): simplify module selection logic
```

### Version Bumping

- **Patch** (1.0.1): Bug fixes, security patches
- **Minor** (1.1.0): New modules, new features
- **Major** (2.0.0): Breaking changes to CLI interface

Update in `package.json`:

```json
{
  "name": "dmdfami-setup",
  "version": "1.0.0",
  "description": "One-command Mac setup & management toolkit"
}
```

## Dependencies Management

### Built-in Node.js Modules Only

Allowed (zero external packages):
- `node:child_process` - execSync, execFileSync
- `node:fs` - readFileSync, writeFileSync, etc.
- `node:path` - join, dirname, etc.
- `node:readline` - createInterface for prompts
- `node:os` - homedir()
- `node:url` - fileURLToPath for __dirname in ESM
- `node:https` - Native fetch (if http.mjs added)
- `node:module` - Dynamic import

NOT allowed:
- npm packages (even zero-config ones)
- Global npm installs (except as CLI output)
- Native bindings

**Rationale**: Users install via `npx dmdfami-setup` — npm dependencies add startup overhead and complexity.

## Performance Guidelines

### Lazy Loading

- Load modules only once needed (via dynamic import)
- Cache module list during execution
- Don't pre-load all tools

### Shell Execution

- Use `execFileSync` with args array (safer, faster than shell)
- Avoid subshells unless necessary
- Set timeouts on long-running commands

### Output Buffering

- Use `stdio: 'inherit'` for visible commands (user sees progress)
- Use `stdio: 'pipe'` only for captured output
- Flush output frequently for interactive feedback

## Accessibility

### UI Accessibility

- Use Unicode icons consistently
- Color-coded output (✓ green, ✗ red, ⚠ yellow)
- Clear progress indication
- Vietnamese translations for main UI elements

### Configuration Accessibility

- JSON configs in `configs/` directory
- Document all keys in this file
- Provide examples for common customizations
- Shell scripts in `dotfiles/bin/` for accessibility

## Future Extensibility

### Adding a New Module

1. Create `modules/new-module.mjs`
2. Export default with required interface
3. Set `order` property (1-7 range or higher)
4. Add to CLI ARG_MAP if adding shorthand
5. Update README.md module list
6. Test via `npx ./bin/cli.mjs new-module`

### Adding a New Library

1. Create `lib/new-lib.mjs`
2. Export focused utility functions
3. Document with JSDoc comments
4. Import in hub (cli.mjs) or modules as needed
5. Avoid module-to-module library imports (each module independent)

### Configuration Changes

1. Edit `configs/*.json`
2. Update module's `install()` to read new keys
3. Update this document's Configuration Reference section
4. Test with affected modules

## References

- **Node.js Documentation**: https://nodejs.org/docs/latest/api/
- **ESM in Node.js**: https://nodejs.org/api/esm.html
- **Kahn's Algorithm**: https://en.wikipedia.org/wiki/Topological_sorting
