# Phase 1: Repo Setup + CLI Framework

## Overview
- **Priority**: P1 (foundation — everything depends on this)
- **Status**: ✅ COMPLETE
- **Effort**: 3h
- **Completed**: 2026-03-02

Create `dmdfami/setup` GitHub repo and build CLI framework: entry point, module loader, auto-detector, interactive UI. Zero external dependencies — use Node.js built-ins only.

## Completion Status

All requirements met. Repository created, CLI framework implemented with module loader, detector, runner, and interactive UI. Tested on secondary machine.

## Context
- [Brainstorm report](../reports/brainstorm-260302-2221-setup-architecture.md)
- [dmdfami/mac package.json](https://github.com/dmdfami/mac) — reference for bin entry

## Key Insights
- Zero dependencies = instant `npx` (no install step)
- Module interface: `{ name, description, detect(), install(), verify(), dependencies[] }`
- readline API sufficient for interactive prompts (no inquirer needed)
- `execSync`/`exec` from `node:child_process` for shell commands

## Requirements

### Functional
- `npx dmdfami/setup` launches CLI
- Auto-detect all installed tools, show status table
- Interactive confirm: user selects which missing modules to install
- Run selected modules in dependency order
- Show progress + results

### Non-Functional
- Zero npm dependencies
- ESM (`"type": "module"`)
- Node 18+ (shipped with macOS Homebrew)

## Files to Create

| File | Purpose |
|------|---------|
| `package.json` | name, version, bin, type:module |
| `bin/cli.mjs` | Entry point — imports lib, runs main flow |
| `lib/detector.mjs` | Loads all modules, runs detect() on each |
| `lib/runner.mjs` | Topological sort by dependencies, run install+verify |
| `lib/ui.mjs` | readline wrapper: banner, status table, checkbox select, progress |

## Implementation Steps

### 1. Create GitHub repo
```bash
gh repo create dmdfami/setup --public --description "One-command Mac setup & management toolkit"
cd ~/projects && git clone git@github.com:dmdfami/setup.git && cd setup
```

### 2. package.json
```json
{
  "name": "dmdfami-setup",
  "version": "1.0.0",
  "description": "One-command Mac setup & management toolkit",
  "type": "module",
  "bin": { "dmdfami-setup": "./bin/cli.mjs" },
  "engines": { "node": ">=18" }
}
```

### 3. bin/cli.mjs (~30 lines)
```javascript
#!/usr/bin/env node
import { detectAll } from '../lib/detector.mjs';
import { selectModules, showBanner, showStatus, showProgress } from '../lib/ui.mjs';
import { runModules } from '../lib/runner.mjs';

async function main() {
  showBanner();
  const results = await detectAll();
  showStatus(results);
  const selected = await selectModules(results);
  if (selected.length === 0) { console.log('Nothing to install.'); return; }
  await runModules(selected, showProgress);
  console.log('\nDone!');
}

main().catch(e => { console.error(e.message); process.exit(1); });
```

### 4. lib/detector.mjs (~40 lines)
- `loadModules()`: dynamically import all .mjs from `modules/` dir
- `detectAll()`: for each module, call `detect()`, return `[{ module, status: { installed, details } }]`
- Use `import.meta.url` + `node:fs` to scan modules/ directory

### 5. lib/runner.mjs (~60 lines)
- `runModules(modules, onProgress)`: topological sort by `dependencies[]`, then sequential install+verify
- Simple Kahn's algorithm (modules < 10, no perf concern)
- Each step: `onProgress(module, 'installing')` → `install()` → `verify()` → `onProgress(module, 'done')`

### 6. lib/ui.mjs (~80 lines)
- `showBanner()`: ASCII header with version
- `showStatus(results)`: table with ✓/✗ per module
- `selectModules(results)`: readline-based multi-select (numbered list, user types numbers)
- `showProgress(module, state)`: `[1/4] Installing Homebrew... ✓`
- All using `node:readline`

### 7. Stub module for testing
Create `modules/homebrew.mjs` as first module (Phase 2 implements fully):
```javascript
export default {
  name: 'homebrew',
  description: 'Package manager for macOS',
  dependencies: [],
  async detect() {
    // stub
    return { installed: false, details: 'not checked' };
  },
  async install() { console.log('  [stub] would install homebrew'); },
  async verify() { return true; },
};
```

### 8. Test locally
```bash
node bin/cli.mjs  # Should show banner, detect stub, prompt
```

## Todo List
- [x] Create GitHub repo dmdfami/setup
- [x] Write package.json (zero deps, ESM, bin entry)
- [x] Implement bin/cli.mjs (entry point)
- [x] Implement lib/detector.mjs (module loader + detect)
- [x] Implement lib/runner.mjs (dependency sort + runner)
- [x] Implement lib/ui.mjs (banner, status, select, progress)
- [x] Create stub module for testing
- [x] Test locally: `node bin/cli.mjs`
- [x] Initial commit + push

## Success Criteria
- [x] `node bin/cli.mjs` shows banner → status → prompt
- [x] Zero npm dependencies achieved
- [x] Module interface clearly defined and documented
- [x] `npx dmdfami/setup` works from GitHub

## Risk Assessment
- **readline multi-select UX**: Not as polished as inquirer. Mitigation: simple numbered list is good enough for 8 modules.
- **Dynamic imports**: `import()` with file paths may behave differently across Node versions. Mitigation: test on Node 18+.

## Next Steps
- Phase 2: Implement real modules (homebrew, remote, claude-cli)
