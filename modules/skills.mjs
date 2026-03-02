import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { runVisible } from '../lib/shell.mjs';

function countItems(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() || d.name.endsWith('.md')).length;
}

export default {
  name: 'skills',
  order: 3,
  description: 'Bộ kỹ năng AI (CK skills, agents, rules)',
  dependencies: [],

  async detect() {
    const claudeDir = join(homedir(), '.claude');
    const skills = countItems(join(claudeDir, 'skills'));
    const agents = countItems(join(claudeDir, 'agents'));
    return { installed: skills + agents > 0, details: `${skills} skills, ${agents} agents` };
  },

  async install() {
    console.log('\n    Đang chạy dmdfami/skill...\n');
    runVisible('npx -y dmdfami/skill');
  },

  async verify() {
    const claudeDir = join(homedir(), '.claude');
    return countItems(join(claudeDir, 'skills')) > 0;
  },
};
