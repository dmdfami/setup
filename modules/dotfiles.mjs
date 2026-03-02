import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOTFILES_DIR = join(__dirname, '..', 'dotfiles');

export default {
  name: 'dotfiles',
  order: 7,
  description: 'Dotfiles sync (shell config)',
  dependencies: ['system-prereqs'],

  async detect() {
    const home = process.env.HOME;
    const dmdfamiDir = join(home, '.dmdfami', 'dotfiles');
    const hasDir = existsSync(dmdfamiDir);
    const zshrc = existsSync(join(home, '.zshrc')) ? readFileSync(join(home, '.zshrc'), 'utf8') : '';
    const hasSource = zshrc.includes('.dmdfami/dotfiles/zshrc');
    return { installed: hasDir && hasSource, details: `synced: ${hasDir ? 'yes' : 'no'}, sourced: ${hasSource ? 'yes' : 'no'}` };
  },

  async install() {
    const home = process.env.HOME;
    const targetDir = join(home, '.dmdfami', 'dotfiles');
    mkdirSync(targetDir, { recursive: true });

    // Copy portable dotfiles
    const zshrcSrc = join(DOTFILES_DIR, 'zshrc');
    if (existsSync(zshrcSrc)) {
      cpSync(zshrcSrc, join(targetDir, 'zshrc'));
    }

    // Add source line to user's .zshrc (never overwrite existing content)
    const zshrcPath = join(home, '.zshrc');
    const zshrc = existsSync(zshrcPath) ? readFileSync(zshrcPath, 'utf8') : '';
    const sourceLine = '[ -f ~/.dmdfami/dotfiles/zshrc ] && source ~/.dmdfami/dotfiles/zshrc';
    if (!zshrc.includes('.dmdfami/dotfiles/zshrc')) {
      writeFileSync(zshrcPath, zshrc + (zshrc.endsWith('\n') ? '' : '\n') + sourceLine + '\n');
    }

    console.log('\n    Dotfiles synced. Open new terminal to activate.');
  },

  async verify() {
    const home = process.env.HOME;
    const zshrc = existsSync(join(home, '.zshrc')) ? readFileSync(join(home, '.zshrc'), 'utf8') : '';
    return zshrc.includes('.dmdfami/dotfiles/zshrc');
  },
};
