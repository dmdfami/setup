# Phase 6: Bootstrap, README, Polish

## Overview
- **Priority**: P2
- **Status**: ✅ COMPLETE
- **Effort**: 2h
- **Completed**: 2026-03-02
- **Depends on**: Phase 1-5

bootstrap.sh for fresh Mac, README, test on secondary machine, deprecate old repos.

## Completion Status

Bootstrap script, comprehensive README, and polish tasks completed. Tested on secondary machine. Old repos archived with deprecation notices.

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
- [x] Create bootstrap.sh
- [x] Write README.md
- [x] Test on secondary machine
- [x] Update old repos with redirect
- [x] Tag v1.0.0

## Success Criteria
- [x] bootstrap.sh works on clean macOS
- [x] README clear and complete
- [x] Lucy fully configured via npx
- [x] Old repos archived with deprecation notices
