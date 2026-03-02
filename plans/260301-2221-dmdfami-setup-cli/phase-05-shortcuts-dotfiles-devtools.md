# Phase 5: Shortcuts, Dotfiles, Dev Tools

## Overview
- **Priority**: P2
- **Status**: Complete
- **Effort**: 2h
- **Depends on**: Phase 1, 2

Three modules: terminal shortcuts, dotfiles sync, dev tools (Brewfile + npm globals).

## Files to Create

| File | Purpose |
|------|---------|
| `modules/shortcuts.mjs` | Terminal aliases + ~/bin/ scripts |
| `modules/dotfiles.mjs` | Shell config sync |
| `modules/dev-tools.mjs` | Brew packages + npm globals |
| `configs/aliases.json` | Shortcut definitions |
| `configs/Brewfile` | Brew package list |
| `configs/npm-globals.json` | npm global packages |
| `dotfiles/zshrc` | Portable shell config |
| `dotfiles/bin/mac` | SSH manager script |
| `dotfiles/bin/qall` | Quick quit all script |

## Module 5: shortcuts.mjs

**What it installs:**
```bash
# Global aliases (zsh)
alias fast='--dangerously-skip-permissions'
alias fast2='--dangerously-bypass-approvals-and-sandbox'
alias team='--teammate-mode tmux'
alias qq='qq'         # quit all GUI apps
alias qf='osascript -e "tell app \"Finder\" to quit"'

# Functions
ccs() { ... }         # CCS fast mode wrapper
qq() { ... }          # Quit all GUI apps
qq!() { ... }         # Force quit all

# ~/bin/ scripts
mac                   # SSH manager
qall                  # Quick quit
```

**detect():** Check if aliases/functions exist in .zshrc, ~/bin/ scripts present.
**install():** Append source line to .zshrc → `source ~/.dmdfami/shortcuts.sh`. Copy ~/bin/ scripts.
**verify():** Source line present + scripts executable.

Strategy: Generate `~/.dmdfami/shortcuts.sh` from `configs/aliases.json` + inline functions. Never overwrite user's .zshrc.

## Module 7: dotfiles.mjs

**Source-line approach**: Add `source ~/.dmdfami/dotfiles/zshrc` to user's .zshrc.
- Portable parts only (PATH, brew shellenv, pipx)
- Skip machine-specific config (NVM exact path, project aliases)

## Module 6: dev-tools.mjs

**Brewfile (core):** cloudflared, ffmpeg, gh, go, imagemagick, tmux, yt-dlp, mosh, pipx, exiftool
**npm globals (core):** pnpm, wrangler, repomix

`brew bundle --file=configs/Brewfile` + `npm i -g` loop.

## Todo List
- [ ] Create configs/aliases.json (shortcut definitions)
- [ ] Implement modules/shortcuts.mjs
- [ ] Create configs/Brewfile + npm-globals.json
- [ ] Implement modules/dev-tools.mjs
- [ ] Extract portable dotfiles
- [ ] Implement modules/dotfiles.mjs
- [ ] Test each module

## Success Criteria
- Shortcuts: aliases + functions available after install (new terminal session)
- Dev tools: missing brew/npm packages installed
- Dotfiles: source-line added, never overwrites existing .zshrc
