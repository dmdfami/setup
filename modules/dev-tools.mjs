import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasCommand, run, runVisible } from '../lib/shell.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIGS_DIR = join(__dirname, '..', 'configs');

export default {
  name: 'dev-tools',
  order: 6,
  description: 'Công cụ phát triển (brew + npm)',
  dependencies: ['system-prereqs'],

  async detect() {
    const brewPkgs = ['cloudflared', 'ffmpeg', 'gh', 'go', 'tmux', 'yt-dlp', 'mosh', 'pipx'];
    const installed = brewPkgs.filter(p => hasCommand(p)).length;
    return { installed: installed > 4, details: `${installed}/${brewPkgs.length} brew tools` };
  },

  async install() {
    // 1. Brew bundle
    const brewfilePath = join(CONFIGS_DIR, 'Brewfile');
    console.log('\n    Installing brew packages...');
    try { runVisible(`brew bundle --file="${brewfilePath}" --no-lock`); }
    catch { console.log('    Some brew packages may have failed — continuing'); }

    // 2. npm globals
    const npmGlobals = JSON.parse(readFileSync(join(CONFIGS_DIR, 'npm-globals.json'), 'utf8'));
    const missing = npmGlobals.packages.filter(p => !hasCommand(p.cmd || p.name));
    if (missing.length > 0) {
      console.log('    Installing npm globals...');
      for (const pkg of missing) {
        try { runVisible(`npm i -g ${pkg.package || pkg.name}`); }
        catch { console.log(`    Failed: ${pkg.name}`); }
      }
    }
  },

  async verify() {
    return hasCommand('gh') && hasCommand('tmux');
  },
};
