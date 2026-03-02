import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasCommand, run, runVisible, getVersion } from '../lib/shell.mjs';
import { ask } from '../lib/ui.mjs';

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

export default {
  name: 'ai-cli-tools',
  order: 4,
  description: 'AI CLI tools (install/update)',
  dependencies: ['system-prereqs'],

  async detect() {
    const results = AI_TOOLS.map(t => ({
      name: t.name,
      installed: t.detect ? t.detect() : (t.cmd && hasCommand(t.cmd)),
      version: t.cmd ? getVersion(t.cmd) : null,
    }));
    const installed = results.filter(r => r.installed).length;
    return { installed: installed > 0, details: `${installed}/${results.length} tools installed` };
  },

  async install() {
    const missing = AI_TOOLS.filter(t => t.detect ? !t.detect() : (t.cmd && !hasCommand(t.cmd)));
    if (missing.length === 0) { console.log('\n    All AI tools already installed!'); return; }

    console.log('\n    Missing AI tools:');
    missing.forEach((t, i) => console.log(`      [${i + 1}] ${t.name}`));
    console.log(`      [${missing.length + 1}] All`);

    const choice = await ask('    Install which? ');
    if (!choice.trim()) return;

    let toInstall;
    if (choice.trim().toLowerCase() === 'all' || parseInt(choice) === missing.length + 1) {
      toInstall = missing;
    } else {
      const indices = choice.split(/[,\s]+/).map(s => parseInt(s, 10) - 1).filter(i => i >= 0 && i < missing.length);
      toInstall = [...new Set(indices)].map(i => missing[i]);
    }

    for (const tool of toInstall) {
      console.log(`    Installing ${tool.name}...`);
      try { runVisible(tool.install); } catch { console.log(`    Failed to install ${tool.name}`); }
    }

    // Claude Code credentials export (special handling)
    if (toInstall.some(t => t.name === 'Claude Code') || hasCommand('claude')) {
      exportClaudeCredentials();
    }
  },

  async verify() {
    return AI_TOOLS.some(t => t.detect ? t.detect() : (t.cmd && hasCommand(t.cmd)));
  },
};

/** Export Claude credentials from Keychain for SSH sessions */
function exportClaudeCredentials() {
  const home = process.env.HOME;
  const credFile = join(home, '.claude', '.credentials.json');
  if (existsSync(credFile)) return; // already exists

  const cred = run('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null');
  if (cred) {
    try { JSON.parse(cred); } catch { console.log('    Keychain credential is not valid JSON — skipping'); return; }
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(credFile, cred, { mode: 0o600 });
    console.log('    Claude credentials exported for SSH');
  } else {
    const oldCred = join(home, '.claude', '.credentials');
    if (existsSync(oldCred)) {
      writeFileSync(credFile, readFileSync(oldCred, 'utf8'), { mode: 0o600 });
      console.log('    Claude credentials migrated');
    }
  }
}
