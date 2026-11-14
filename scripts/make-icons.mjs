// Renders public/icon.svg to the PNG sizes the PWA manifest and iOS need.
// Uses the Playwright Chromium available in the dev environment.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../app/public/icon.svg', import.meta.url), 'utf8');
const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };

const browser = await chromium.launch();
for (const [name, size] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // iOS rounds corners itself, so render square (no rx) for the PNGs.
  const square = svg.replace('rx="112"', '');
  await page.setContent(`<style>html,body{margin:0;background:#0f1115}svg{width:${size}px;height:${size}px;display:block}</style>${square}`);
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname });
  await page.close();
}
await browser.close();
console.log('Icons written to public/');
