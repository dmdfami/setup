# Phase 4: AI CLI Tools Module

## Overview
- **Priority**: P1
- **Status**: Complete
- **Effort**: 2h
- **Depends on**: Phase 1

Install/update AI CLI tools: Claude Code, Codex, Gemini, Droid, ClaudeKit, CCS, Antigravity, Repomix, Firecrawl.

## Files to Create

| File | Purpose |
|------|---------|
| `modules/ai-cli-tools.mjs` | Detect + install AI CLI tools |

## AI Tools Registry

```javascript
const AI_TOOLS = [
  { name: 'Claude Code', cmd: 'claude', install: 'npm i -g @anthropic-ai/claude-code', type: 'npm' },
  { name: 'Codex CLI', cmd: 'codex', install: 'npm i -g @openai/codex', type: 'npm' },
  { name: 'Gemini CLI', cmd: 'gemini', install: 'brew install gemini-cli', type: 'brew' },
  { name: 'ClaudeKit', cmd: 'ck', install: 'npm i -g claudekit-cli', type: 'npm' },
  { name: 'CCS', cmd: 'ccs', install: 'npm i -g @kaitranntt/ccs', type: 'npm' },
  { name: 'Repomix', cmd: 'repomix', install: 'npm i -g repomix', type: 'npm' },
  { name: 'Firecrawl', cmd: 'firecrawl', install: 'npm i -g firecrawl-cli', type: 'npm' },
  { name: 'Antigravity', cmd: null, install: 'brew install --cask antigravity-tools', type: 'cask',
    detect: () => existsSync('/Applications/Antigravity.app') },
];
```

## Implementation

**detect():** Loop registry, `hasCommand(cmd)` each. Return per-tool status.

**install():** Show sub-menu of missing tools. User selects which to install. Run install commands. Registry-driven — adding new tool = 1 line.

**verify():** Re-check all selected tools present.

## Todo List
- [ ] Create modules/ai-cli-tools.mjs with registry pattern
- [ ] Detect logic for each tool (command check + app check)
- [ ] Install with sub-selection (don't force all)
- [ ] Test: fresh machine install + idempotent re-run

## Success Criteria
- Registry-driven: add new AI tool = add 1 object to array
- User picks which tools to install (not all-or-nothing)
- Idempotent: skips already-installed tools
