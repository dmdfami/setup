#!/usr/bin/env node
import { scanSystemTools, scanAITools, loadModules } from '../lib/detector.mjs';
import { showBanner, showScanResults, selectModules, closeUI } from '../lib/ui.mjs';
import { runModules } from '../lib/runner.mjs';

async function main() {
  showBanner();

  console.log('  Scanning machine...\n');
  const systemTools = scanSystemTools();
  const aiTools = scanAITools();
  showScanResults(systemTools, aiTools);

  const modules = await loadModules();
  const selected = await selectModules(modules);

  if (selected.length === 0) {
    console.log('\n  Nothing selected. Bye!\n');
    closeUI();
    return;
  }

  closeUI();
  await runModules(selected);
  console.log('  Done! \uD83C\uDF89\n');
}

main().catch(e => {
  console.error(`\n  Error: ${e.message}\n`);
  process.exit(1);
});
