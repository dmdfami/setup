---
title: "dmdfami/setup — Mac Setup & Installer Hub"
description: "All-in-one Mac setup CLI: system tools, AI CLIs, SSH remote, skills, shortcuts, dotfiles via npx dmdfami/setup"
status: complete
priority: P1
effort: 16h
tags: [cli, devtools, infra, node, ai-tools]
created: 2026-03-02
---

# dmdfami/setup — Mac Setup & Installer Hub

## Overview

All-in-one CLI (`npx dmdfami/setup`) that scans a Mac, shows what's installed/missing across system tools + AI CLIs, then offers categorized install modules. Consolidates `dmdfami/mac` + `dmdfami/skill` repos, plus new AI tool installers and terminal shortcuts.

## Context

- Brainstorm: [brainstorm report](../reports/brainstorm-260302-2221-setup-architecture.md)
- Existing: [dmdfami/mac](https://github.com/dmdfami/mac), [dmdfami/skill](https://github.com/dmdfami/skill)
- Architecture: Pure Node.js CLI, zero deps, GitHub-only distribution

## CLI Flow

```
$ npx dmdfami/setup

  dmdfami/setup v1.0
  ══════════════════

  Scanning machine...

  ━━ System Tools ━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Homebrew (4.5.2)        ✓ Node.js (v24)
  ✗ Python/pipx             ✓ Git + gh CLI
  ✓ Go (1.23)               ✓ tmux

  ━━ AI CLI Tools ━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Claude Code (2.1.63)    ✗ Codex CLI
  ✓ Gemini CLI              ✗ Droid CLI
  ✓ ClaudeKit (3.35.0)      ✓ CCS (7.51.0)

  ━━ Setup Modules ━━━━━━━━━━━━━━━━━━━━━━━━━
  [1] 🔧 System prerequisites (install missing)
  [2] 🔑 SSH Remote access
  [3] 🧠 AI Skills pack
  [4] 🤖 AI CLI tools (install missing)
  [5] ⌨️  Terminal shortcuts & aliases
  [6] 📦 Dev tools (brew + npm)
  [7] 📁 Dotfiles sync

  Select [1-7, all]: _
```

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Repo + CLI framework | Complete | 3h | [phase-01](./phase-01-repo-and-cli-framework.md) |
| 2 | Core modules: system + remote + claude-cli | Complete | 3h | [phase-02](./phase-02-core-modules-from-mac.md) |
| 3 | Skills module (from skill repo) | Complete | 2h | [phase-03](./phase-03-skills-module.md) |
| 4 | AI CLI tools module | Complete | 2h | [phase-04](./phase-04-ai-cli-tools.md) |
| 5 | Shortcuts, dotfiles, dev-tools | Complete | 2h | [phase-05](./phase-05-shortcuts-dotfiles-devtools.md) |
| 6 | Bootstrap, README, polish | Complete | 2h | [phase-06](./phase-06-bootstrap-and-polish.md) |

## Architecture

```
dmdfami/setup/
├── package.json
├── bin/cli.mjs
├── lib/
│   ├── detector.mjs       # Grouped scanner (system, ai, status)
│   ├── runner.mjs          # Dependency-ordered module runner
│   ├── shell.mjs           # hasCommand, run, runVisible helpers
│   ├── http.mjs            # Native HTTPS fetch/download
│   └── ui.mjs              # Banner, status table, menu, progress
├── modules/
│   ├── system-prereqs.mjs  # [1] Homebrew, Node, Python/pipx, Git/gh, Go
│   ├── remote.mjs          # [2] SSH + CF Tunnel + machine registration
│   ├── skills.mjs          # [3] CK skills installer
│   ├── ai-cli-tools.mjs    # [4] Claude, Codex, Gemini, Droid, CK, CCS
│   ├── shortcuts.mjs       # [5] Terminal aliases + ~/bin/ scripts
│   ├── dev-tools.mjs       # [6] Brewfile + npm globals
│   └── dotfiles.mjs        # [7] Shell config sync
├── configs/
│   ├── Brewfile
│   ├── npm-globals.json
│   ├── aliases.json        # Terminal shortcut definitions
│   └── ssh-key.pub
├── dotfiles/
│   ├── zshrc, zprofile, zshenv
│   └── bin/ (mac, qall)
├── workers/
│   ├── mac-nodes/
│   └── skill-server/
├── bootstrap.sh
└── README.md
```

## AI CLI Tools Registry

| Tool | Package/Install | GitHub |
|------|----------------|--------|
| Claude Code | `npm i -g @anthropic-ai/claude-code` | anthropics/claude-code |
| Codex CLI | `npm i -g @openai/codex` | openai/codex |
| Gemini CLI | `brew install gemini-cli` | google-gemini/gemini-cli |
| Droid CLI | `npm i -g droid` | anthropics/droid (TBD) |
| ClaudeKit | `npm i -g claudekit-cli` | claudekit/claudekit-cli |
| CCS | `npm i -g @kaitranntt/ccs` | kaitranntt/ccs |
| Antigravity | `brew install --cask antigravity-tools` | — |
| Repomix | `npm i -g repomix` | yamadashy/repomix |
| Firecrawl | `npm i -g firecrawl-cli` | firecrawl/cli |

## Terminal Shortcuts (Module 5)

Shortcuts installed to make CLI tools faster:
```bash
# In .zshrc via source line
alias fast='--dangerously-skip-permissions'
alias fast2='--dangerously-bypass-approvals-and-sandbox'
alias team='--teammate-mode tmux'
alias qq='qq'        # Quit all GUI apps
alias qf='...'       # Quit Finder
alias mac='~/bin/mac' # SSH manager
# + ccs() function wrapper
```

## Key Decisions

- Zero npm dependencies — native Node.js only
- Grouped scan display (System Tools / AI CLI Tools / Modules)
- Each module independent, user picks what to install
- Extensible: add new AI tools by editing registry in ai-cli-tools.mjs
- All idempotent — safe to re-run
