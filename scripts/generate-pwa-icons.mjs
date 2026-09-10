import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sourceSvg = pathToFileURL(resolve('public/axisfin-icon.svg')).href;
const tempDir = mkdtempSync(join(tmpdir(), 'axisfin-icons-'));
const userDataDir = join(tempDir, 'chrome-profile');

const outputs = [
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/icon-maskable-512.png', 512],
];

try {
  for (const [outputPath, size] of outputs) {
    const htmlPath = join(tempDir, `icon-${size}-${outputPath.includes('maskable') ? 'maskable' : 'any'}.html`);
    writeFileSync(
      htmlPath,
      `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html,
      body {
        width: ${size}px;
        height: ${size}px;
        margin: 0;
        overflow: hidden;
        background: #05070d;
      }

      img {
        display: block;
        width: ${size}px;
        height: ${size}px;
      }
    </style>
  </head>
  <body>
    <img src="${sourceSvg}" alt="" />
  </body>
</html>`,
    );

    const result = spawnSync(
      chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        '--disable-gpu-compositing',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        `--user-data-dir=${userDataDir}`,
        `--window-size=${size},${size}`,
        `--screenshot=${resolve(outputPath)}`,
        pathToFileURL(htmlPath).href,
      ],
      { stdio: 'inherit' },
    );

    if (result.status !== 0) {
      throw new Error(`Chrome failed to generate ${outputPath}`);
    }

    console.log(`generated ${outputPath}`);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
