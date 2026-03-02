import { existsSync, mkdirSync, readdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { hasCommand, run } from '../lib/shell.mjs';
import { fetch, downloadFile } from '../lib/http.mjs';
import { ask } from '../lib/ui.mjs';

const WORKER_URL = 'https://skill.dmd-fami.workers.dev';
const CK_KITS = [
  { name: 'engineer', repo: 'claudekit/claudekit-engineer' },
  { name: 'marketing', repo: 'claudekit/claudekit-marketing' },
];
const KIT_DIRS = ['agents', 'skills', 'rules', 'hooks', 'schemas', 'scripts', 'output-styles'];

function countItems(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() || d.name.endsWith('.md')).length;
}

function detectPlatforms() {
  const home = homedir();
  const platforms = [];
  const claudeDir = join(home, '.claude');
  platforms.push({ name: 'Claude Code', dir: claudeDir, detected: existsSync(claudeDir) });
  const codexDir = join(home, '.codex');
  platforms.push({ name: 'Codex CLI', dir: codexDir, detected: existsSync(codexDir) || existsSync(join(home, '.config', 'codex')) });
  return platforms;
}

export default {
  name: 'skills',
  order: 3,
  description: 'Bộ kỹ năng AI (CK skills, agents, rules)',
  dependencies: [],

  async detect() {
    const home = homedir();
    const claudeDir = join(home, '.claude');
    const skills = countItems(join(claudeDir, 'skills'));
    const agents = countItems(join(claudeDir, 'agents'));
    const rules = countItems(join(claudeDir, 'rules'));
    return {
      installed: skills + agents + rules > 0,
      details: `${skills} skills, ${agents} agents, ${rules} rules`,
    };
  },

  async install() {
    const platforms = detectPlatforms();
    console.log('\n    Install target:');
    platforms.forEach((p, i) => console.log(`      [${i + 1}] ${p.name} ${p.detected ? '(detected)' : '(not found)'}`));
    console.log(`      [${platforms.length + 1}] All`);
    const pChoice = await ask('    Choose [1]: ');
    const pIdx = parseInt(pChoice || '1', 10) - 1;
    const targets = pIdx === platforms.length ? platforms : [platforms[Math.min(pIdx, platforms.length - 1)] || platforms[0]];

    console.log('\n    Install method:');
    console.log('      [1] CK Official (requires gh auth)');
    console.log('      [2] Full skill pack (access code)');
    const mChoice = await ask('    Choose [2]: ');
    const method = parseInt(mChoice || '2', 10);

    let mergeOnly = false;
    if (method === 2) {
      console.log('\n    Install mode:');
      console.log('      [1] Overwrite all');
      console.log('      [2] Merge only (add missing, keep existing)');
      const moChoice = await ask('    Choose [1]: ');
      mergeOnly = parseInt(moChoice || '1', 10) === 2;
    }

    for (const target of targets) {
      console.log(`\n    Target: ${target.name} (${target.dir})`);
      if (method === 1) await installCKOfficial(target.dir);
      else await installFromWorker(target.dir, mergeOnly);
    }
  },

  async verify() {
    const claudeDir = join(homedir(), '.claude');
    return countItems(join(claudeDir, 'skills')) > 0;
  },
};

async function installCKOfficial(targetDir) {
  if (!hasCommand('gh')) { console.log('    gh CLI not found — install first'); return; }
  const auth = run('gh auth status 2>&1');
  if (!auth || auth.includes('not logged')) { console.log('    Not authenticated — run: gh auth login'); return; }

  mkdirSync(targetDir, { recursive: true });
  for (const { name: kit, repo } of CK_KITS) {
    console.log(`    Fetching ${kit} kit...`);
    const tag = run(`gh api repos/${repo}/tags --jq '.[0].name' 2>/dev/null`) || 'main';
    const tmp = join(tmpdir(), `ck-${kit}-${Date.now()}`);
    run(`gh repo clone ${repo} "${tmp}" -- --depth=1 --branch ${tag}`, { timeout: 120000 });
    const src = join(tmp, '.claude');
    if (!existsSync(src)) { console.log(`    ${kit} clone failed`); continue; }
    for (const dir of KIT_DIRS) {
      const s = join(src, dir);
      if (existsSync(s)) { const d = join(targetDir, dir); mkdirSync(d, { recursive: true }); cpSync(s, d, { recursive: true, force: true }); }
    }
    run(`rm -rf "${tmp}"`);
    console.log(`    ${kit} kit installed (${tag})`);
  }
}

async function installFromWorker(targetDir, mergeOnly) {
  const code = await ask('    Access code: ');
  if (!code.trim()) { console.log('    Access code required'); return; }

  console.log('    Downloading...');
  const tarFile = join(tmpdir(), `skill-${Date.now()}.tar.gz`);
  try {
    await downloadFile(`${WORKER_URL}/download/custom?key=${encodeURIComponent(code.trim())}`, tarFile);
  } catch (e) { console.log(`    Download failed: ${e.message}`); return; }

  mkdirSync(targetDir, { recursive: true });
  const extractDir = join(tmpdir(), `skill-extract-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });
  run(`tar xzf "${tarFile}" -C "${extractDir}" --strip-components=1`);

  const before = { skills: countItems(join(targetDir, 'skills')), agents: countItems(join(targetDir, 'agents')) };
  for (const dir of KIT_DIRS) {
    const src = join(extractDir, dir);
    if (!existsSync(src)) continue;
    const dest = join(targetDir, dir);
    mkdirSync(dest, { recursive: true });
    if (mergeOnly) {
      for (const item of readdirSync(src, { withFileTypes: true })) {
        const d = join(dest, item.name);
        if (!existsSync(d)) cpSync(join(src, item.name), d, { recursive: true });
      }
    } else {
      cpSync(src, dest, { recursive: true, force: true });
    }
  }
  const after = { skills: countItems(join(targetDir, 'skills')), agents: countItems(join(targetDir, 'agents')) };
  run(`rm -rf "${tarFile}" "${extractDir}"`);
  console.log(`    Installed: ${after.skills} skills, ${after.agents} agents`);
}
