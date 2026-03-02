# dmdfami/setup

One-command Mac setup & management toolkit. Scans your machine, shows what's installed/missing, then offers categorized install modules.

## Quick Start

```bash
# Fresh Mac (nothing installed)
curl -fsSL https://setup.dmd-fami.com | bash

# Already have Node.js
npx dmdfami-setup
```

## Modules

| # | Module | What it does |
|---|--------|-------------|
| 1 | System prerequisites | Homebrew, Node.js |
| 2 | SSH Remote access | SSH + Cloudflare Tunnel + machine registration |
| 3 | AI Skills pack | CK skills installer (Official or Worker download) |
| 4 | AI CLI tools | Claude Code, Codex, Gemini, ClaudeKit, CCS, Repomix, etc. |
| 5 | Terminal shortcuts | Aliases, functions, ~/bin/ scripts |
| 6 | Dev tools | Brew packages (ffmpeg, gh, go, tmux...) + npm globals |
| 7 | Dotfiles sync | Portable shell config via source line |

## Architecture

```
bin/cli.mjs          Entry point
lib/
  shell.mjs          hasCommand, run, runVisible helpers
  detector.mjs       System + AI tool scanner, module loader
  runner.mjs         Dependency-ordered module runner
  ui.mjs             Banner, status table, menu, progress
  http.mjs           Native HTTPS fetch/download
modules/
  system-prereqs.mjs [1] Homebrew + Node.js
  remote.mjs         [2] SSH + CF Tunnel + registration
  skills.mjs         [3] CK skills installer
  ai-cli-tools.mjs   [4] AI CLI tools registry
  shortcuts.mjs      [5] Terminal aliases + ~/bin/
  dev-tools.mjs      [6] Brewfile + npm globals
  dotfiles.mjs       [7] Shell config sync
configs/             Brewfile, aliases, npm-globals, ssh-key
dotfiles/            Portable zshrc, bin/mac, bin/qall
```

## Adding a New AI Tool

Edit `modules/ai-cli-tools.mjs` — add one object to the `AI_TOOLS` array:

```javascript
{ name: 'My Tool', cmd: 'mytool', install: 'npm i -g my-tool', type: 'npm' }
```

## Design Principles

- **Zero npm dependencies** — native Node.js only, instant `npx`
- **Idempotent** — safe to re-run anytime
- **Modular** — each module independent, user picks what to install
- **Non-destructive** — never overwrites user's existing config (uses source lines)

## Requirements

- macOS (Apple Silicon or Intel)
- Node.js 18+ (bootstrap.sh installs this for you)

## License

MIT
