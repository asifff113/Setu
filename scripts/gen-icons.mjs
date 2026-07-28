// One-off icon rasterizer: assets/brand/icon-source.svg -> app/public icon set.
// Run with `node scripts/gen-icons.mjs` whenever the source SVG changes.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const srcSvg = join(root, 'assets/brand/icon-source.svg');
const outDir = join(root, 'app/public/icons');
const publicDir = join(root, 'app/public');

await mkdir(outDir, { recursive: true });

const svg = await readFile(srcSvg);

async function png(size, outPath) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(outPath);
  console.log('wrote', outPath);
}

await png(192, join(outDir, 'icon-192.png'));
await png(512, join(outDir, 'icon-512.png'));
// Maskable: same art already fills the full square with solid bg and keeps
// glyph strokes within the ~80% safe zone, so it's reusable as-is.
await png(512, join(outDir, 'icon-maskable-512.png'));
// Apple touch icon: iOS ignores alpha, our bg is already opaque.
await png(180, join(publicDir, 'apple-touch-icon.png'));

await copyFile(srcSvg, join(publicDir, 'favicon.svg'));
console.log('wrote', join(publicDir, 'favicon.svg'));
