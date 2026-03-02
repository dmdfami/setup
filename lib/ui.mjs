import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let rl;
function getRL() {
  if (!rl) rl = createInterface({ input: process.stdin, output: process.stdout });
  return rl;
}

/** Prompt user for input */
export function ask(question) {
  return new Promise(resolve => getRL().question(question, resolve));
}

/** Close readline interface */
export function closeUI() {
  if (rl) { rl.close(); rl = null; }
}

/** Show CLI banner */
export function showBanner() {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  console.log('');
  console.log(`  dmdfami/setup v${pkg.version}`);
  console.log('  ' + '='.repeat(20));
  console.log('');
}

/** Show scan results in grouped table */
export function showScanResults(systemTools, aiTools) {
  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  const icon = (t) => t.installed ? '\x1b[32m\u2713\x1b[0m' : '\x1b[31m\u2717\x1b[0m';
  const label = (t) => t.installed ? `${t.name} (${t.version})` : t.name;

  console.log('  \u2501\u2501 System Tools \u2501'.repeat(1) + '\u2501'.repeat(26));
  printTwoCol(systemTools, icon, label, pad);

  console.log('');
  console.log('  \u2501\u2501 AI CLI Tools \u2501'.repeat(1) + '\u2501'.repeat(26));
  printTwoCol(aiTools, icon, label, pad);
  console.log('');
}

function printTwoCol(tools, icon, label, pad) {
  for (let i = 0; i < tools.length; i += 2) {
    const left = `${icon(tools[i])} ${pad(label(tools[i]), 22)}`;
    const right = i + 1 < tools.length ? `${icon(tools[i + 1])} ${label(tools[i + 1])}` : '';
    console.log(`  ${left}  ${right}`);
  }
}

/** Show module menu and get user selection */
export async function selectModules(modules) {
  console.log('  \u2501\u2501 Setup Modules \u2501'.repeat(1) + '\u2501'.repeat(25));
  const icons = ['\uD83D\uDD27', '\uD83D\uDD11', '\uD83E\uDDE0', '\uD83E\uDD16', '\u2328\uFE0F', '\uD83D\uDCE6', '\uD83D\uDCC1'];
  modules.forEach((m, i) => {
    const ic = icons[i] || '\u2022';
    console.log(`  [${i + 1}] ${ic} ${m.description}`);
  });
  console.log('');

  const answer = await ask(`  Select [1-${modules.length}, all]: `);
  if (!answer.trim()) return [];
  if (answer.trim().toLowerCase() === 'all') return [...modules];

  const indices = answer.split(/[,\s]+/).map(s => parseInt(s, 10) - 1).filter(i => i >= 0 && i < modules.length);
  return [...new Set(indices)].map(i => modules[i]);
}

/** Show progress for module installation */
export function showProgress(current, total, name, state) {
  const prefix = `  [${current}/${total}]`;
  switch (state) {
    case 'installing':
      process.stdout.write(`${prefix} Installing ${name}...`);
      break;
    case 'done':
      console.log(' \x1b[32m\u2713\x1b[0m');
      break;
    case 'failed':
      console.log(' \x1b[31m\u2717\x1b[0m');
      break;
    case 'skipped':
      console.log(`${prefix} ${name} \x1b[33mskipped\x1b[0m`);
      break;
  }
}
