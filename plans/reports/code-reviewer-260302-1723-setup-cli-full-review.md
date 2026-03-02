# Code Review: dmdfami/setup CLI

## Scope
- **Files**: 17 source files (bin/cli.mjs, lib/*.mjs, modules/*.mjs, bootstrap.sh, dotfiles/*, configs/*)
- **LOC**: ~1,015 total
- **Focus**: Full codebase review (security, error handling, code quality, idempotency)

## Overall Assessment

Well-structured, minimal, zero-dependency Node.js CLI. Good separation of concerns (lib vs modules). All modules follow a consistent `{ name, order, description, dependencies, detect, install, verify }` contract. Idempotency is generally well-handled. Several security issues need attention, primarily around command injection and credential handling.

---

## Critical Issues

### C1. Command injection via `hasCommand()` in `lib/shell.mjs:6`

```javascript
execSync(`command -v ${cmd}`, { stdio: 'pipe' });
```

The `cmd` parameter is interpolated directly into a shell string. While current callers pass hardcoded strings, this is a ticking time bomb if any dynamic input ever reaches this path. Same pattern in `getVersion()` at line 30: `` `${cmd} ${flag} 2>/dev/null` ``.

**Impact**: If a tool name from `AI_TOOLS` or a config is ever user-supplied or fetched remotely, arbitrary command execution is possible.

**Fix**: Validate `cmd` against a safe pattern, or use `execFileSync` which avoids shell interpretation:

```javascript
import { execFileSync } from 'node:child_process';

export function hasCommand(cmd) {
  if (!/^[a-zA-Z0-9._-]+$/.test(cmd)) return false;
  try {
    execFileSync('which', [cmd], { stdio: 'pipe' });
    return true;
  } catch { return false; }
}
```

### C2. JSON injection in curl command — `modules/remote.mjs:83`

```javascript
const body = JSON.stringify({ user, lan_ip: lanIp, ... });
run(`curl -s -X POST "${API}/register" -H "Content-Type: application/json" -d '${body}'`);
```

`JSON.stringify` output is placed inside single quotes in a shell command. If any value contains a single quote (e.g., a hostname like `David's Mac`), the shell command breaks and could enable injection. `scutil --get ComputerName` commonly returns names with apostrophes.

**Impact**: Shell command breaks on common hostnames; potential command injection with crafted machine names.

**Fix**: Use `execFileSync` with args array, or write body to a temp file:

```javascript
import { execFileSync } from 'node:child_process';
execFileSync('curl', ['-s', '-X', 'POST', `${API}/register`,
  '-H', 'Content-Type: application/json', '-d', body], { stdio: 'pipe' });
```

Or better: use the project's own `lib/http.mjs` `fetch()` to POST instead of shelling out to curl.

### C3. Credential file written without checking contents — `modules/ai-cli-tools.mjs:76`

```javascript
const cred = run('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null');
if (cred) {
  writeFileSync(credFile, cred, { mode: 0o600 });
}
```

The raw keychain secret is written to `~/.claude/.credentials.json`. This is fine functionally, but:
- No validation that `cred` is actually valid JSON before writing to `.credentials.json`
- If keychain returns an error message (non-empty but not credentials), it gets written as credentials

**Fix**: Add JSON parse validation:

```javascript
if (cred) {
  try { JSON.parse(cred); } catch { console.log('    Keychain data not valid JSON, skipping'); return; }
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(credFile, cred, { mode: 0o600 });
}
```

---

## High Priority

### H1. Unbounded redirect following in `lib/http.mjs`

Both `fetch()` and `downloadFile()` follow HTTP redirects recursively with no depth limit. A malicious server or SSRF scenario could cause infinite recursion / stack overflow.

**Fix**: Add a `maxRedirects` counter (default 5):

```javascript
export function fetch(url, headers = {}, _redirects = 0) {
  if (_redirects > 5) return Promise.reject(new Error('Too many redirects'));
  // ... in redirect handler:
  return fetch(res.headers.location, headers, _redirects + 1);
}
```

### H2. Missing `process.env.HOME` null check

Multiple modules use `process.env.HOME` directly (remote.mjs:27, shortcuts.mjs:25, dotfiles.mjs:24, system-prereqs.mjs:24). If `HOME` is unset (rare but possible in cron/sudo contexts), paths resolve to wrong locations.

**Fix**: Use `os.homedir()` (already used in skills.mjs) consistently, or guard:

```javascript
const home = process.env.HOME || os.homedir();
```

### H3. `run('sleep 3')` busy-waiting in `modules/remote.mjs:74`

The tunnel URL polling loop calls `run('sleep 3')` which blocks the entire Node.js process with `execSync`. This runs up to 20 iterations (60 seconds blocking).

**Fix**: Use a proper async delay:

```javascript
const delay = (ms) => new Promise(r => setTimeout(r, ms));
// Then in the loop:
await delay(3000);
```

### H4. `topoSort` fallback appends unresolved modules — `lib/runner.mjs:57-59`

```javascript
for (const mod of modules) {
  if (!result.includes(mod)) result.push(mod);
}
```

If a dependency cycle exists, Kahn's algorithm produces fewer nodes than input. The fallback silently appends cycled modules without warning. This masks dependency bugs.

**Fix**: Log a warning when this fallback triggers:

```javascript
if (result.length < modules.length) {
  const missing = modules.filter(m => !result.includes(m)).map(m => m.name);
  console.warn(`  Warning: possible dependency cycle in: ${missing.join(', ')}`);
}
```

### H5. Shell alias values not escaped — `modules/shortcuts.mjs:72`

```javascript
script += `alias ${name}='${value}'\n`;
```

If any alias value in `aliases.json` contains a single quote, the generated shell script has a syntax error. Currently `aliases.json` does not contain single quotes in values, but `--dangerously-skip-permissions` is safe; future edits may not be.

**Fix**: Escape single quotes in values:

```javascript
const escaped = value.replace(/'/g, "'\\''");
script += `alias ${name}='${escaped}'\n`;
```

---

## Medium Priority

### M1. `run()` used for `cat` to read files — `modules/system-prereqs.mjs:26,36`

```javascript
const content = run(`cat "${zprofile}" 2>/dev/null`) || '';
```

Shelling out to `cat` when `readFileSync` is available is unnecessary overhead and another shell injection surface (if the path ever contains special chars).

**Fix**: Use `readFileSync` with try/catch, consistent with how other modules handle file reading.

### M2. `run()` used for `echo` to append to files — `modules/system-prereqs.mjs:28,38`

```javascript
run(`echo '${line}' >> "${zprofile}"`);
```

Same as M1 — use `writeFileSync` or `appendFileSync` directly.

### M3. `eval` in current process does nothing — `modules/system-prereqs.mjs:31`

```javascript
run('eval "$(/opt/homebrew/bin/brew shellenv)"');
```

This executes `eval` in a child shell that immediately exits. The parent Node.js process PATH is unchanged. Dead code.

**Fix**: Either remove the line, or set `process.env.PATH` directly:

```javascript
process.env.PATH = `/opt/homebrew/bin:/opt/homebrew/sbin:${process.env.PATH}`;
```

### M4. No timeout on tunnel URL polling — `modules/remote.mjs:71-75`

The loop polls 20 times with 3s `sleep` = 60s blocking. This is acceptable but the `for` loop with `run('sleep 3')` is synchronous and provides no user feedback during waiting.

Already covered in H3 for the async fix. Additionally, add progress dots.

### M5. `printTwoCol` handles odd-length arrays but lacks guard — `lib/ui.mjs:49`

Works correctly via the `i + 1 < tools.length` check, but could be clearer.

### M6. `loadModules()` sorts files alphabetically then re-sorts by `order` — `lib/detector.mjs:47-56`

The initial `.sort()` on filenames is unnecessary since the final sort by `order` property determines execution order. Not harmful, just redundant.

### M7. `selectModules` hardcodes `[1-7, all]` — `lib/ui.mjs:66`

```javascript
const answer = await ask('  Select [1-7, all]: ');
```

The "7" is hardcoded. If modules are added/removed, this prompt becomes misleading.

**Fix**: Use `modules.length`:

```javascript
const answer = await ask(`  Select [1-${modules.length}, all]: `);
```

### M8. `fetch()` missing port forwarding — `lib/http.mjs:8`

The URL parsing drops the port number:

```javascript
const opts = { hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers };
```

If a URL has a non-standard port (e.g., `https://localhost:8443/`), it's silently ignored. Add `port: parsed.port`.

---

## Low Priority

### L1. `configs/ssh-key.pub` is a public key — acceptable

Public keys are safe to commit. The email `export@vietnam-plywood.com` is a personal identifier, not sensitive.

### L2. No `--` separator in `brew bundle` — `modules/dev-tools.mjs:25`

```javascript
runVisible(`brew bundle --file="${brewfilePath}" --no-lock`);
```

If the path ever started with `-`, it could be misinterpreted. Low risk since the path is constructed from `__dirname`.

### L3. Missing `.gitignore` and test files

No test suite exists. No `.gitignore` to prevent accidental commits of `mcp-logs.txt`, `wa-logs.txt`, `node_modules`, etc.

---

## Edge Cases Found by Scout

1. **Hostname with apostrophe**: `scutil --get ComputerName` returns `"David's MacBook"` -- breaks curl JSON injection (see C2)
2. **No network during tunnel setup**: `remote.mjs` will silently fail to register; tunnel URL polling times out gracefully but the registration curl fails silently
3. **Concurrent module selection**: User selects module 2 (remote) without module 1 (system-prereqs) -- dependency is declared but `topoSort` only sorts *selected* modules. If prereq not in selection, it's skipped. This means: if user picks only "remote", brew may not be installed, and `brew install cloudflared` fails.
4. **`$HOME` with spaces**: Paths like `/Users/David Smith/` would break many `run()` calls that don't quote variables inside the shell strings
5. **Re-running shortcuts.mjs**: Appends source line to `.zshrc` only if not present -- idempotent. But `shortcuts.sh` is overwritten each time, which is correct (regenerated from config).
6. **skills.mjs gh clone with tag**: If `gh api` returns empty/null, falls back to `'main'`, which is safe
7. **`pkill -f "cloudflared tunnel"`** in remote.mjs:64: Kills ALL cloudflared tunnel processes, including unrelated ones

---

## Idempotency Assessment

| Module | Idempotent? | Notes |
|--------|-------------|-------|
| system-prereqs | Yes | Checks before install, but `echo >>` has no-duplicate guard via `content.includes()` |
| remote | Mostly | Re-enables SSH, re-writes wrapper, reloads LaunchAgent. `pkill` is destructive to running tunnels |
| skills | Yes | Overwrite/merge modes explicit |
| ai-cli-tools | Yes | Only installs missing tools |
| shortcuts | Yes | Source line has duplicate guard, script is regenerated |
| dev-tools | Yes | `brew bundle` is idempotent, npm checks `hasCommand` |
| dotfiles | Yes | Source line has duplicate guard |

---

## Positive Observations

- Zero dependencies -- genuinely delivers on the promise; `npx` cold-start is instant
- Consistent module contract (`detect`, `install`, `verify`) enables clean runner loop
- Non-destructive config approach (source lines instead of overwriting `.zshrc`)
- Topological sort for dependencies is well-implemented
- Good use of `mode: 0o600` for credential files
- Idempotent design throughout -- safe to re-run
- Clean CLI UX with scan results table and progress indicators
- File sizes all under 150 lines -- excellent modularity

---

## Recommended Actions (Prioritized)

1. **[Critical]** Fix command injection in `shell.mjs` -- validate cmd names or use `execFileSync`
2. **[Critical]** Fix JSON-in-shell injection in `remote.mjs:83` -- use `execFileSync` for curl or use `lib/http.mjs` fetch with POST
3. **[Critical]** Validate keychain credential is JSON before writing to file
4. **[High]** Add redirect depth limit to `lib/http.mjs`
5. **[High]** Replace `run('sleep 3')` with async delay in remote.mjs
6. **[High]** Fix dead `eval` in system-prereqs.mjs:31 -- set `process.env.PATH` directly
7. **[High]** Warn on dependency cycle in topoSort
8. **[High]** Escape single quotes in alias values in shortcuts.mjs
9. **[Medium]** Replace `run('cat ...')` and `run('echo ...')` with native fs calls in system-prereqs.mjs
10. **[Medium]** Fix hardcoded `[1-7]` in selectModules prompt
11. **[Medium]** Add port to http.mjs URL options
12. **[Medium]** Handle missing dependency in selection (if user picks module 2 without module 1)
13. **[Low]** Add `.gitignore` for `mcp-logs.txt`, `wa-logs.txt`, `node_modules`

---

## Metrics

- **Type Coverage**: N/A (plain JS, no TypeScript)
- **Test Coverage**: 0% (no test files)
- **Linting Issues**: N/A (no linter configured)
- **Security Issues**: 3 critical, 1 high
- **Total LOC**: ~1,015

---

## Unresolved Questions

1. Is `modules/remote.mjs` intended to run on machines where the user has `sudo` without password? `sudo systemsetup -setremotelogin on` requires elevated privileges.
2. Should the tunnel wrapper script hardcode `/opt/homebrew/bin/cloudflared` (line 107)? This fails on Intel Macs where Homebrew installs to `/usr/local/`.
3. The `mac-nodes.dmd-fami.workers.dev` API has no authentication for registration -- is this intentional? Any machine can register/overwrite node entries.
4. `exportClaudeCredentials` copies keychain secrets to a plaintext file. Is this the intended long-term approach, or a temporary workaround for SSH sessions?
5. Should dependency resolution auto-include prerequisite modules when the user only selects dependent modules?
