// Mechanical resizing/format optimization and alpha inspection only.
// All illustration generation and repairs use the built-in imagegen tool.
// Usage: node scripts/prepare-food-postcard-art.mjs [installed sharp package path]
import { createRequire } from 'node:module';
import { mkdir, writeFile, stat } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const source = 'assets/source/food-postcard';
await mkdir('public/art/foods', { recursive: true });
await mkdir('public/art/postcards', { recursive: true });
const report = {};
const foods = ['strawberry-cloud-bun', 'carrot-crescent-crisp', 'tricolor-travel-bites'];
for (const id of foods) {
  const input = `${source}/food-${id}.png`;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const meta = await sharp(input).metadata();
  let transparent = 0, translucent = 0, left = info.width, top = info.height, right = 0, bottom = 0, edgeNonzero = 0, edgeMaxAlpha = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * 4 + 3];
    if (a === 0) transparent++;
    if (a > 0 && a < 255) translucent++;
    if (a > 16) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
    if ((x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) && a > 0) { edgeNonzero++; edgeMaxAlpha = Math.max(edgeMaxAlpha, a); }
  }
  if (!meta.hasAlpha || transparent < info.width * info.height * .15 || edgeMaxAlpha > 16) throw new Error(`Invalid alpha or clipped food: ${id}`);
  const output = `public/art/foods/food-${id}.png`;
  // Preserve the full independent square canvas and alpha, no chroma keying.
  await sharp(input).resize(352, 352).extend({ top: 16, bottom: 16, left: 16, right: 16, background: '#00000000' }).png({ compressionLevel: 9 }).toFile(output);
  report[id] = { source: input, output, width: info.width, height: info.height, hasAlpha: meta.hasAlpha, transparentPixels: transparent, translucentPixels: translucent, edgeNonzero, edgeMaxAlpha, bounds: { left, top, right, bottom }, outputBytes: (await stat(output)).size };
}
for (const name of ['postcard-first-dandelion-hill-blue-quaker-front', 'postcard-paper-back-dandelion']) {
  const input = `${source}/${name}.png`;
  const meta = await sharp(input).metadata();
  if (Math.abs(meta.width / meta.height - 1.5) > .015) throw new Error(`Postcard is not 3:2: ${name}`);
  const output = `public/art/postcards/${name}.webp`;
  await sharp(input).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 88 }).toFile(output);
  report[name] = { source: input, output, width: meta.width, height: meta.height, outputBytes: (await stat(output)).size };
}
await writeFile(`${source}/asset-validation.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
