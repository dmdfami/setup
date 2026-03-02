import { showProgress } from './ui.mjs';

/**
 * Run selected modules in dependency order (Kahn's topological sort).
 * Each module: { name, dependencies[], install(), verify() }
 */
export async function runModules(modules) {
  const sorted = topoSort(modules);
  const total = sorted.length;
  let current = 0;

  console.log('');
  for (const mod of sorted) {
    current++;
    showProgress(current, total, mod.description || mod.name, 'installing');

    try {
      await mod.install();
      const ok = await mod.verify();
      showProgress(current, total, mod.name, ok ? 'done' : 'failed');
    } catch (err) {
      showProgress(current, total, mod.name, 'failed');
      console.error(`    Error: ${err.message}`);
    }
  }
  console.log('');
}

/** Topological sort by dependencies (Kahn's algorithm) */
function topoSort(modules) {
  const nameMap = new Map(modules.map(m => [m.name, m]));
  const inDegree = new Map(modules.map(m => [m.name, 0]));
  const adj = new Map(modules.map(m => [m.name, []]));

  for (const mod of modules) {
    for (const dep of (mod.dependencies || [])) {
      if (nameMap.has(dep)) {
        adj.get(dep).push(mod.name);
        inDegree.set(mod.name, inDegree.get(mod.name) + 1);
      }
    }
  }

  const queue = modules.filter(m => inDegree.get(m.name) === 0).map(m => m.name);
  const result = [];

  while (queue.length > 0) {
    const name = queue.shift();
    result.push(nameMap.get(name));
    for (const next of (adj.get(name) || [])) {
      inDegree.set(next, inDegree.get(next) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // Append any modules not in the graph (no deps listed)
  for (const mod of modules) {
    if (!result.includes(mod)) result.push(mod);
  }

  return result;
}
