import { execSync, execFileSync } from 'node:child_process';

const SAFE_CMD_RE = /^[a-zA-Z0-9._\-/]+$/;

/** Check if a command exists in PATH (safe from injection) */
export function hasCommand(cmd) {
  if (!cmd || !SAFE_CMD_RE.test(cmd)) return false;
  try {
    execFileSync('which', [cmd], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Run command silently, return trimmed stdout or null on failure */
export function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
  } catch {
    return null;
  }
}

/** Run command with output visible to user */
export function runVisible(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

/** Get version string safely using execFileSync */
export function getVersion(cmd, flag = '--version') {
  if (!cmd || !SAFE_CMD_RE.test(cmd)) return null;
  try {
    const out = execFileSync(cmd, [flag], { encoding: 'utf8', stdio: 'pipe', timeout: 5000 }).trim();
    if (!out) return null;
    const match = out.match(/v?(\d+\.\d[\d.]*)/);
    return match ? match[1] : out.split('\n')[0].trim();
  } catch {
    return null;
  }
}
