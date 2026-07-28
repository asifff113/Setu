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

// Maskable icons get cropped to whatever shape the OS picks (circle, squircle,
// rounded square...); only the centered ~80%-diameter "safe zone" is
// guaranteed visible. The source art's glyph strokes reach right to the edge
// of that zone, so render it shrunk onto a same-color canvas instead of
// reusing the flat icon, which would clip on some Android launchers.
async function pngMaskable(size, outPath) {
  const safeZoneScale = 0.65;
  const inner = Math.round(size * safeZoneScale);
  const glyph = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#e5322d' },
  })
    .composite([{ input: glyph, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

await png(192, join(outDir, 'icon-192.png'));
await png(512, join(outDir, 'icon-512.png'));
await pngMaskable(512, join(outDir, 'icon-maskable-512.png'));
// Apple touch icon: iOS ignores alpha, our bg is already opaque.
await png(180, join(publicDir, 'apple-touch-icon.png'));

await copyFile(srcSvg, join(publicDir, 'favicon.svg'));
console.log('wrote', join(publicDir, 'favicon.svg'));
