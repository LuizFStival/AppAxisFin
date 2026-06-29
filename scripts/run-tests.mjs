import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const tests = findTests('src').sort();
const runner = process.execPath;
const tsxCli = 'node_modules/tsx/dist/cli.mjs';

for (const test of tests) {
  const result = spawnSync(runner, [tsxCli, test], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`${tests.length} arquivos de teste executados com sucesso.`);
