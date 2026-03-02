import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasCommand, run, runVisible, getVersion } from '../lib/shell.mjs';

export default {
  name: 'system-prereqs',
  order: 1,
  description: 'Công cụ hệ thống (Homebrew, Node.js)',
  dependencies: [],

  async detect() {
    const brew = hasCommand('brew');
    const node = hasCommand('node');
    return {
      installed: brew && node,
      details: `brew: ${brew ? getVersion('brew') : 'missing'}, node: ${node ? getVersion('node') : 'missing'}`,
    };
  },

  async install() {
    // Homebrew
    if (!hasCommand('brew')) {
      console.log('\n    Installing Homebrew...');
      runVisible('NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      // Add to .zprofile for login shells
      const zprofile = join(process.env.HOME, '.zprofile');
      const line = 'eval "$(/opt/homebrew/bin/brew shellenv)"';
      const content = existsSync(zprofile) ? readFileSync(zprofile, 'utf8') : '';
      if (!content.includes('homebrew')) {
        writeFileSync(zprofile, content + (content.endsWith('\n') ? '' : '\n') + line + '\n');
      }
    }

    // Ensure PATH in .zshenv for SSH sessions
    const zshenv = join(process.env.HOME, '.zshenv');
    const envContent = existsSync(zshenv) ? readFileSync(zshenv, 'utf8') : '';
    if (!envContent.includes('homebrew')) {
      writeFileSync(zshenv, envContent + (envContent.endsWith('\n') ? '' : '\n') + 'export PATH=/opt/homebrew/bin:/opt/homebrew/sbin:$PATH\n');
    }

    // Node.js
    if (!hasCommand('node')) {
      console.log('\n    Installing Node.js...');
      runVisible('brew install node');
    }
  },

  async verify() {
    return hasCommand('brew') && hasCommand('node');
  },
};
