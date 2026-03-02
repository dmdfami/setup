import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasCommand, getVersion } from './shell.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Scan system tools presence + version */
export function scanSystemTools() {
  const tools = [
    { name: 'Homebrew', cmd: 'brew' },
    { name: 'Node.js', cmd: 'node' },
    { name: 'Python/pipx', cmd: 'pipx', alt: 'python3' },
    { name: 'Git + gh CLI', cmd: 'gh', alt: 'git' },
    { name: 'Go', cmd: 'go', vFlag: 'version' },
    { name: 'tmux', cmd: 'tmux', vFlag: '-V' },
  ];

  return tools.map(t => {
    const installed = hasCommand(t.cmd) || (t.alt && hasCommand(t.alt));
    const version = installed ? (getVersion(t.cmd, t.vFlag) || (t.alt ? getVersion(t.alt) : '') || '') : '';
    return { name: t.name, installed, version };
  });
}

/** Scan AI CLI tools presence + version */
export function scanAITools() {
  const tools = [
    { name: 'Claude Code', cmd: 'claude' },
    { name: 'Codex CLI', cmd: 'codex' },
    { name: 'Gemini CLI', cmd: 'gemini' },
    { name: 'Droid CLI', cmd: 'droid' },
    { name: 'ClaudeKit', cmd: 'ck' },
    { name: 'CCS', cmd: 'ccs' },
  ];

  return tools.map(t => {
    const installed = hasCommand(t.cmd);
    const version = installed ? (getVersion(t.cmd) || '') : '';
    return { name: t.name, installed, version };
  });
}

/** Load all modules from modules/ directory, sorted by order property */
export async function loadModules() {
  const modulesDir = join(__dirname, '..', 'modules');
  const files = readdirSync(modulesDir).filter(f => f.endsWith('.mjs')).sort();
  const modules = [];

  for (const file of files) {
    const mod = await import(join(modulesDir, file));
    modules.push(mod.default);
  }

  // Sort by order property (fallback to 99)
  modules.sort((a, b) => (a.order || 99) - (b.order || 99));
  return modules;
}
