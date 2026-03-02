# Phase 6: Bootstrap, README, Polish

## Overview
- **Priority**: P2
- **Status**: Complete
- **Effort**: 2h
- **Depends on**: Phase 1-5

bootstrap.sh for fresh Mac, README, test on secondary machine, deprecate old repos.

## Files to Create

| File | Purpose |
|------|---------|
| `bootstrap.sh` | curl entry for fresh Mac |
| `README.md` | Usage, module list, architecture |

## Implementation Steps

### 1. bootstrap.sh (~40 lines)
Installs Xcode CLI → Homebrew → Node → runs `npx dmdfami/setup`.
Host at `https://{domain}/setup` via CF Worker proxy.

### 2. README.md
- Quick start (curl + npx)
- Module descriptions table
- AI tools registry
- How to add custom modules
- Architecture overview

### 3. Test on Lucy machine
Full flow: `npx dmdfami/setup` → select modules → verify all work.

### 4. Deprecate old repos
- dmdfami/mac README → "Moved to dmdfami/setup"
- dmdfami/skill README → "Moved to dmdfami/setup"
- Archive (don't delete)

## Todo List
- [ ] Create bootstrap.sh
- [ ] Write README.md
- [ ] Test on secondary machine
- [ ] Update old repos with redirect
- [ ] Tag v1.0.0

## Success Criteria
- bootstrap.sh works on clean macOS
- README clear and complete
- Lucy fully configured via npx
- Old repos archived
