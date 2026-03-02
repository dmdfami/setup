# Phase 3: Skills Module (from dmdfami/skill)

## Overview
- **Priority**: P1
- **Status**: Complete
- **Effort**: 2h
- **Depends on**: Phase 1

Port `dmdfami/skill` setup.mjs into `modules/skills.mjs`. Preserve both install methods (CK Official + Worker download) and merge/overwrite modes.

## Context
- Source: [dmdfami/skill bin/setup.mjs](https://github.com/dmdfami/skill) — 250 lines
- CF Worker: `skill.dmd-fami.workers.dev`
- Targets: Claude Code (`~/.claude/`) and Codex CLI (`~/.codex/`)

## Key Insights
- Current setup.mjs is self-contained with its own UI — needs refactoring to fit module interface
- Platform detection (Claude Code vs Codex) should stay
- Access code prompt moves to module's install() flow
- HTTP fetch uses native `node:https` (no deps) — keep this pattern

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `modules/skills.mjs` | Create | CK skills installer module |
| `lib/http.mjs` | Create | Shared HTTP helpers (fetch, downloadFile) from skill repo |

## Implementation Steps

### 1. lib/http.mjs (~50 lines)
Extract from skill's setup.mjs:
- `fetch(url, headers)` — HTTPS GET with redirect follow
- `downloadFile(url, dest, headers)` — stream to file
- Both use `node:https` only

### 2. modules/skills.mjs (~120 lines)

**detect():**
```javascript
// Check ~/.claude/ for skills/agents/rules directories
// Count items: X skills, Y agents, Z rules
// Return { installed: count > 0, details: "X skills, Y agents" }
```

**install():**
1. Detect platforms (Claude Code, Codex CLI)
2. Ask install method: CK Official (gh auth) or Worker download (access code)
3. Ask install mode: Overwrite all or Merge only
4. For each target platform:
   - CK Official: `gh repo clone` each kit, copy dirs
   - Worker: download tarball, extract, copy/merge dirs
5. Show summary (before → after counts)

**verify():**
```javascript
// Recount skills/agents/rules, confirm > 0
```

**Config:**
```javascript
const WORKER_URL = 'https://skill.dmd-fami.workers.dev';
const CK_KITS = [
  { name: 'engineer', repo: 'claudekit/claudekit-engineer' },
  { name: 'marketing', repo: 'claudekit/claudekit-marketing' },
];
const KIT_DIRS = ['agents', 'skills', 'rules', 'hooks', 'schemas', 'scripts', 'output-styles'];
```

### 3. Refactoring from original

| Original (setup.mjs) | New location | Change |
|---|---|---|
| `fetch()`, `downloadFile()` | lib/http.mjs | Shared utility |
| `detectPlatforms()` | Inside skills.mjs | No change |
| `installCKOfficial()` | Inside skills.mjs | Use lib/shell.mjs helpers |
| `installFromWorker()` | Inside skills.mjs | Use lib/http.mjs |
| `ask()`, `log()`, etc. | Remove — use lib/ui.mjs | Centralized UI |
| `main()` | Remove — detect/install/verify interface | Module pattern |

## Todo List
- [ ] Create lib/http.mjs (fetch, downloadFile)
- [ ] Implement modules/skills.mjs (detect/install/verify)
- [ ] Port CK Official install method
- [ ] Port Worker download method
- [ ] Port merge/overwrite logic
- [ ] Test: CK Official install
- [ ] Test: Worker download with access code
- [ ] Test: idempotent re-run

## Success Criteria
- Both install methods work (CK Official + Worker)
- Merge mode: adds new, keeps existing
- Overwrite mode: replaces all
- Platform detection: Claude Code + Codex CLI
- Idempotent — re-run shows correct "already installed" count

## Risk Assessment
- **Access code UX**: Module's install() needs to prompt for access code. Mitigation: use lib/ui.mjs ask() function.
- **gh auth**: CK Official requires gh auth with CK account. Mitigation: detect auth status, fallback to Worker method.

## Next Steps
- Phase 4: Extended modules (dotfiles, dev-tools)
