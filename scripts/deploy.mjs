// Copies the built site from dist/ to the repository root, which is what
// GitHub Pages serves for this branch. Removes the previous build's files
// first so old hashed bundles don't pile up.
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

// Everything a previous deploy put at the root (never touches source files).
const generated = (name) =>
  ['index.html', 'assets', 'sw.js', 'sw.js.map', 'registerSW.js', 'manifest.webmanifest',
   'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].includes(name) ||
  /^workbox-.*\.js(\.map)?$/.test(name);

for (const name of readdirSync(root)) if (generated(name)) rmSync(join(root, name), { recursive: true, force: true });
for (const name of readdirSync(dist)) cpSync(join(dist, name), join(root, name), { recursive: true });

// Stop GitHub Pages running the files through Jekyll.
writeFileSync(join(root, '.nojekyll'), '');
console.log('Site copied to repository root. Commit and push to publish.');
