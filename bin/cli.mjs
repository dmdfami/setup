#!/usr/bin/env node
import { scanSystemTools, scanAITools, loadModules } from '../lib/detector.mjs';
import { showBanner, showScanResults, selectModules, closeUI } from '../lib/ui.mjs';
import { runModules } from '../lib/runner.mjs';

// CLI argument → module name mapping
const ARG_MAP = {
  mac: 'remote-access',
  remote: 'remote-access',
  skill: 'skills',
  skills: 'skills',
  ai: 'ai-cli-tools',
  tools: 'ai-cli-tools',
  shortcuts: 'shortcuts',
  dev: 'dev-tools',
  'dev-tools': 'dev-tools',
  dotfiles: 'dotfiles',
  system: 'system-prereqs',
};

function showHelp() {
  console.log('');
  console.log('  Usage: npx dmdfami-setup [module]');
  console.log('');
  console.log('  Modules:');
  console.log('    (none)      Interactive menu');
  console.log('    all         All modules');
  console.log('    mac         Remote access (SSH, tunnel, sudo, keychain)');
  console.log('    skill       AI skills pack');
  console.log('    ai          AI CLI tools');
  console.log('    shortcuts   Terminal shortcuts & aliases');
  console.log('    dev         Dev tools (brew + npm)');
  console.log('    dotfiles    Dotfiles sync');
  console.log('    system      System prerequisites');
  console.log('');
  process.exit(0);
}

async function main() {
  const arg = process.argv[2];

  if (arg === '--help' || arg === '-h') {
    showHelp();
    return;
  }

  showBanner();
  console.log('  Quét máy...\n');
  const systemTools = scanSystemTools();
  const aiTools = scanAITools();
  showScanResults(systemTools, aiTools);

  const modules = await loadModules();
  let selected;

  if (!arg) {
    // Interactive menu
    selected = await selectModules(modules);
  } else if (arg === 'all') {
    // Run everything
    selected = [...modules];
    closeUI();
  } else {
    // Auto-select by arg
    const targetName = ARG_MAP[arg.toLowerCase()];
    if (!targetName) {
      console.error(`\n  Unknown module: "${arg}". Run with --help for options.\n`);
      process.exit(1);
    }
    selected = modules.filter(m => m.name === targetName);
    if (selected.length === 0) {
      console.error(`\n  Module "${targetName}" not found.\n`);
      process.exit(1);
    }
    closeUI();
  }

  if (selected.length === 0) {
    console.log('\n  Nothing selected. Bye!\n');
    closeUI();
    return;
  }

  closeUI();
  await runModules(selected);
  console.log('  Done!\n');
}

main().catch(e => {
  console.error(`\n  Error: ${e.message}\n`);
  process.exit(1);
});
