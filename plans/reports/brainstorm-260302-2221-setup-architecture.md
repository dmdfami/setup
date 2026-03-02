# Brainstorm: dmdfami/setup Architecture

## Problem Statement

Consolidate 2 existing GitHub repos (`dmdfami/mac` + `dmdfami/skill`) into 1 mono-repo `dmdfami/setup` — a modular Node.js CLI that sets up Mac machines (remote access, dev tools, AI skills) via `npx dmdfami/setup`. After stabilization, deprecate old repos.

## Requirements

### Functional
- **Auto-detect**: Scan machine for installed tools (Homebrew, Node, SSH, Claude CLI, etc.)
- **Interactive confirm**: Show detected status → propose missing items → user confirms
- **Modular**: Each feature = independent module (remote, skills, dev-tools, dotfiles...)
- **Idempotent**: Safe to re-run any number of times
- **Multi-machine**: Works on main Mac (David), secondary (Lucy), VPS, or stranger's machines

### Non-Functional
- Public repo — no secrets in source
- Secrets scope: SSH keys only (minimal)
- Main Mac uses Time Machine — this tool primarily targets secondary/new machines
- Entry point: `npx dmdfami/setup` (GitHub-hosted, no npm publish)
- Backup: `curl -fsSL https://{domain}/setup | bash` for fresh Mac without Node

## Existing Assets

### dmdfami/mac (Current)
- `setup.sh`: 6-step monolithic script (Homebrew → Node → SSH+key → cloudflared → Tunnel+LaunchAgent → Claude CLI creds)
- `bin/cli.js`: Node wrapper for setup.sh
- CF Worker: `mac-nodes.dmd-fami.workers.dev` + KV for machine registry
- `~/bin/mac`: SSH manager CLI (interactive menu, tunnel/LAN/VPS)

### dmdfami/skill (Current)
- `bin/setup.mjs`: CK skills installer (Claude Code + Codex CLI targets)
- 2 install methods: CK Official (gh clone) or Worker download (access code)
- CF Worker: `skill.dmd-fami.workers.dev` for skill pack distribution
- Merge or overwrite modes

### David's Machine Inventory
- **Shell**: .zshrc (118L), .zprofile, .zshenv, .zshrc-macos-shortcuts
- **~/bin/**: mac, qall, wp, wp-mcp, wp-testastra-mcp (5 scripts)
- **Brew formulae (16)**: cloudflared, ffmpeg, gh, go, imagemagick, tmux, yt-dlp, postgresql@16...
- **Brew casks (7)**: orbstack, warp, tailscale, ngrok, gcloud-cli...
- **npm globals (13)**: claude-code, ccs, codex, wrangler, pnpm, repomix, firecrawl-cli...
- **SSH**: id_ed25519, claudekit-readonly, config (VPS + Lucy + OrbStack)
- **LaunchAgents**: Perplexity, cleanup-caffeinate, PostgreSQL

## Evaluated Approaches

### A: Pure Node.js CLI ✅ CHOSEN
- Full Node.js CLI with native `readline` (or `inquirer`)
- Each module = .mjs file exporting `{ name, detect(), install(), verify() }`
- Auto-detection logic per module
- Rich interactive UX

**Pros**: Consistent language, rich UI, user already proficient in Node, proper module system
**Cons**: Requires Node installed first (bootstrap problem)

### B: Bash + Node Hybrid ❌
- Bootstrap = bash, modules = mix of bash and Node
**Rejected**: Two languages = maintenance burden, inconsistent patterns

### C: Monolithic Bash ❌
- Single bash script
**Rejected**: Poor UX (no interactive checklist), hard to scale

### Framework Analysis (from researcher)
- **chezmoi**: Overkill for this use case — David's dotfiles are modest, secrets minimal
- **dotbot**: Too simple, YAML-only, no auto-detect
- **nix-darwin**: Highest learning curve, macOS fights it, poor fit for npx goal
- **mackup**: Complementary but not standalone, symlink mode broken on macOS 14+

**Decision**: No framework — custom Node.js CLI is the right level of complexity for this scope.

## Recommended Architecture

```
dmdfami/setup/
├── package.json            # name: "setup", bin: "dmdfami-setup"
├── bin/cli.mjs             # Entry: npx dmdfami/setup
├── lib/
│   ├── detector.mjs        # Auto-detect installed tools
│   ├── runner.mjs          # Module runner (detect→install→verify)
│   └── ui.mjs              # Interactive prompts (readline-based)
├── modules/
│   ├── homebrew.mjs        # [1] Homebrew install + Brewfile
│   ├── node.mjs            # [2] Node.js via Homebrew
│   ├── remote.mjs          # [3] SSH + CF Tunnel + worker registration
│   ├── claude-cli.mjs      # [4] Claude Code install + credentials export
│   ├── skills.mjs          # [5] CK skills installer (from dmdfami/skill)
│   ├── dev-tools.mjs       # [6] Git config + npm globals + misc brew
│   ├── dotfiles.mjs        # [7] Shell configs sync (.zshrc, ~/bin/)
│   └── mac-manager.mjs     # [8] ~/bin/mac SSH manager CLI
├── configs/
│   ├── Brewfile            # Homebrew packages list
│   ├── npm-globals.json    # Global npm packages list
│   └── ssh-key.pub         # Public SSH key (already public)
├── dotfiles/
│   ├── zshrc               # Shared .zshrc template
│   ├── zprofile            # Shared .zprofile
│   ├── zshenv              # Shared .zshenv
│   └── bin/                # ~/bin/ scripts
│       ├── mac             # SSH manager
│       └── qall            # Quick quit all
├── workers/
│   ├── mac-nodes/          # CF Worker for machine registry
│   └── skill-server/       # CF Worker for skill distribution
├── bootstrap.sh            # curl backup for fresh Mac (installs Node → runs npx)
└── README.md
```

### Module Interface

```javascript
// modules/homebrew.mjs
export default {
  name: "Homebrew",
  description: "Package manager for macOS",

  // Returns { installed: bool, details: string }
  async detect() {
    // Check: command -v brew
  },

  // Runs installation, idempotent
  async install() {
    // NONINTERACTIVE=1 /bin/bash -c "$(curl ...)"
  },

  // Post-install verification
  async verify() {
    // brew --version
  },

  // Module dependencies
  dependencies: [], // e.g., ["homebrew"] for modules needing brew
};
```

### CLI Flow

```
$ npx dmdfami/setup

  dmdfami/setup v1.0.0
  ═══════════════════════

  Scanning machine...

  Status:
  ✓ Homebrew (4.5.2)
  ✓ Node.js (v24.13.0)
  ✗ SSH Remote (not configured)
  ✓ Claude CLI (2.1.63)
  ✗ CK Skills (not installed)
  ✓ Dev Tools (partial — missing: tmux, yt-dlp)
  ✗ Dotfiles (not synced)
  ✓ Mac Manager (~/bin/mac exists)

  Install missing? [Y/n]

  Select modules to install:
  ❯ ◉ SSH Remote
    ◉ CK Skills
    ◉ Dev Tools (install missing packages)
    ◉ Dotfiles sync
    ◯ Mac Manager (already installed)

  Installing...
  [1/4] SSH Remote... ✓
  [2/4] CK Skills... ✓
  [3/4] Dev Tools... ✓
  [4/4] Dotfiles... ✓

  Done! All modules installed.
```

### Bootstrap Flow (Fresh Mac)

```bash
# Option 1: Manual (README instructions)
# 1. Install Node: download from nodejs.org or xcode-select --install + brew install node
# 2. npx dmdfami/setup

# Option 2: curl bootstrap (from new domain)
curl -fsSL https://aikit.dev/setup | bash
# → Installs Xcode CLI tools if missing
# → Installs Homebrew
# → Installs Node via Homebrew
# → Runs npx dmdfami/setup
```

## Domain Recommendation

New domain for AI tools/skills/courses brand:

| Priority | Domain | Rationale |
|----------|--------|-----------|
| 1 | **aikit.dev** | 5 chars, "AI" + "kit", .dev TLD trusted by developers, strong SEO for "ai kit/toolkit" |
| 2 | **skillkit.dev** | Product-descriptive, good SEO for "skill kit" |
| 3 | **devskill.ai** | Audience-descriptive, .ai TLD on-trend |
| 4 | **agentkit.dev** | Agent-focused, 2026 trend alignment |

## Implementation Considerations

### Phase 1: Core (MVP)
1. Create `dmdfami/setup` repo
2. Port `dmdfami/mac` → `modules/remote.mjs` + `modules/homebrew.mjs` + `modules/claude-cli.mjs`
3. Port `dmdfami/skill` → `modules/skills.mjs`
4. Build CLI framework (`bin/cli.mjs`, `lib/detector.mjs`, `lib/runner.mjs`, `lib/ui.mjs`)
5. Test on Lucy machine

### Phase 2: Dotfiles & Tools
6. Extract David's configs → `dotfiles/` + `configs/`
7. Build `modules/dotfiles.mjs` + `modules/dev-tools.mjs`
8. Add `configs/Brewfile` + `configs/npm-globals.json`

### Phase 3: Polish
9. Add `bootstrap.sh` (curl entry point)
10. Set up new domain + CF Worker proxy
11. Write comprehensive README
12. Deprecate `dmdfami/mac` and `dmdfami/skill` repos

### Risks
- **Bootstrap chicken-and-egg**: npx needs Node. Mitigated by bootstrap.sh and README instructions.
- **Public repo + SSH key**: Already public — acceptable risk since it's just a public key.
- **Skill access code**: Remains in CF Worker, not in repo. Access code entered at runtime.
- **macOS version changes**: `defaults write` commands may break across versions. Mitigated by version checks in modules.

### Success Criteria
- `npx dmdfami/setup` works on fresh macOS (after Node installed)
- All modules idempotent — safe to re-run
- Lucy machine fully configured in < 5 minutes
- `bootstrap.sh` works on fresh Mac without any pre-installed tools
- Old repos (`mac`, `skill`) can be archived

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Pure Node.js CLI | Consistent language, rich UX, user expertise |
| Framework | None (custom) | Scope too small for chezmoi/nix, dotfiles are modest |
| Distribution | GitHub only (npx) | No npm publish needed, simpler maintenance |
| Secrets | SSH public key only | Minimal secrets needs, private keys stay local |
| UX | Auto-detect + confirm | User preference, best balance of automation + control |
| Mono-repo | Yes (setup = mac + skill + future) | Single source of truth, easier maintenance |
| Worker code | Included in repo | Workers/ directory, deploy separately |
| Bootstrap | curl + bootstrap.sh | Solves fresh Mac without Node problem |

## Next Steps

1. Buy domain (recommendation: aikit.dev)
2. Create `dmdfami/setup` repo
3. Implement Phase 1 (MVP — port existing repos)
4. Test on secondary machine
5. Phase 2 & 3 progressively
