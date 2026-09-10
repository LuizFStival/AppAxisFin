import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const uvCache = resolve(root, '.tools', 'uv-cache');
const uvPython = resolve(root, '.tools', 'uv-python');
const uvTools = resolve(root, '.tools', 'uv-tools');

mkdirSync(uvCache, { recursive: true });
mkdirSync(uvPython, { recursive: true });
mkdirSync(uvTools, { recursive: true });

const env = {
  ...process.env,
  UV_CACHE_DIR: uvCache,
  UV_PYTHON_INSTALL_DIR: uvPython,
  UV_TOOL_DIR: uvTools,
};

function runGraphify(args) {
  const result = spawnSync(
    'uvx.exe',
    ['--cache-dir', uvCache, '--python', '3.12', '--from', 'graphifyy', 'graphify', ...args],
    { cwd: root, env, stdio: 'inherit', shell: false },
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runGraphify(['src']);
runGraphify(['cluster-only', 'src']);

console.log('\nGraphify outputs:');
console.log(`- ${resolve(root, 'src', 'graphify-out', 'graph.html')}`);
console.log(`- ${resolve(root, 'src', 'graphify-out', 'GRAPH_REPORT.md')}`);
console.log(`- ${resolve(root, 'src', 'graphify-out', 'graph.json')}`);
