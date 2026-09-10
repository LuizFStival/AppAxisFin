import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const graphPath = resolve(process.cwd(), 'src', 'graphify-out', 'graph.html');

if (!existsSync(graphPath)) {
  console.error('Graphify HTML not found at:');
  console.error(graphPath);
  console.error('');
  console.error('Run `npm run graphify:src` first to generate it.');
  process.exit(1);
}

const graphUrl = pathToFileURL(graphPath).href;

if (process.argv.includes('--print')) {
  console.log(graphUrl);
  process.exit(0);
}

const opener = process.platform === 'win32'
  ? { command: 'cmd', args: ['/c', 'start', '', graphUrl] }
  : process.platform === 'darwin'
    ? { command: 'open', args: [graphUrl] }
    : { command: 'xdg-open', args: [graphUrl] };

const child = spawn(opener.command, opener.args, {
  detached: true,
  stdio: 'ignore',
  shell: false,
});

child.on('error', (error) => {
  console.error(`Could not open Graphify HTML automatically: ${error.message}`);
  console.error(graphUrl);
  process.exit(1);
});

child.unref();
