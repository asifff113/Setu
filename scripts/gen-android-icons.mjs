// One-off Android launcher icon rasterizer: assets/brand/icon-source.svg ->
// app/android/app/src/main/res mipmap densities + adaptive icon layers.
// Run with `node scripts/gen-android-icons.mjs` whenever the source SVG changes.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const srcSvg = join(root, 'assets/brand/icon-source.svg');
const resDir = join(root, 'app/android/app/src/main/res');
const BRAND_RED = '#e5322d';

const svg = await readFile(srcSvg);

// legacy launcher icon: full-bleed render, no safe-zone shrink (matches the
// existing app/public/icons/icon-*.png treatment).
async function legacyIcon(px, outPath) {
  await sharp(svg, { density: 384 }).resize(px, px).png().toFile(outPath);
  console.log('wrote', outPath);
}

// adaptive icon foreground: same safe-zone shrink as the PWA maskable icon
// (app/public/icons/icon-maskable-512.png) — OS launchers crop this layer to
// a circle/squircle/rounded-square at runtime, so content must stay inside
// the center ~65% to avoid clipping.
async function foregroundIcon(px, outPath) {
  const safeZoneScale = 0.65;
  const inner = Math.round(px * safeZoneScale);
  const glyph = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp({
    create: { width: px, height: px, channels: 4, background: BRAND_RED },
  })
    .composite([{ input: glyph, left: Math.round((px - inner) / 2), top: Math.round((px - inner) / 2) }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

// legacy launcher sizes (dp @ density scale) and adaptive layer sizes (108dp base)
const densities = {
  mdpi: { legacy: 48, layer: 108 },
  hdpi: { legacy: 72, layer: 162 },
  xhdpi: { legacy: 96, layer: 216 },
  xxhdpi: { legacy: 144, layer: 324 },
  xxxhdpi: { legacy: 192, layer: 432 },
};

for (const [density, sizes] of Object.entries(densities)) {
  const dir = join(resDir, `mipmap-${density}`);
  await mkdir(dir, { recursive: true });
  await legacyIcon(sizes.legacy, join(dir, 'ic_launcher.png'));
  await legacyIcon(sizes.legacy, join(dir, 'ic_launcher_round.png'));
  await foregroundIcon(sizes.layer, join(dir, 'ic_launcher_foreground.png'));
}

// adaptive icon XML (API 26+): solid brand-red background layer + the
// safe-zone foreground layer generated above.
const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
const anydpiDir = join(resDir, 'mipmap-anydpi-v26');
await mkdir(anydpiDir, { recursive: true });
await writeFile(join(anydpiDir, 'ic_launcher.xml'), adaptiveIconXml);
await writeFile(join(anydpiDir, 'ic_launcher_round.xml'), adaptiveIconXml);
console.log('wrote', join(anydpiDir, 'ic_launcher.xml'));
console.log('wrote', join(anydpiDir, 'ic_launcher_round.xml'));

const valuesDir = join(resDir, 'values');
await mkdir(valuesDir, { recursive: true });
const bgColorPath = join(valuesDir, 'ic_launcher_background.xml');
await writeFile(
  bgColorPath,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND_RED}</color>\n</resources>\n`
);
console.log('wrote', bgColorPath);
