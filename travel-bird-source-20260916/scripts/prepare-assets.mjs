// Deterministic atlas slicing, anchor alignment and compression only. All art is AI generated.
// node scripts/prepare-assets.mjs [absolute path to installed sharp package]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
await mkdir('public/art', { recursive: true });
for (const name of ['indoor', 'outdoor']) {
  await sharp(`assets/source/${name}.png`).resize(900, 1350).webp({ quality: 85 }).toFile(`public/art/${name}.webp`);
}
for (const [source, name, size] of [['cabinet', 'cabinet', 500], ['bento', 'strawberry_bento', 320]]) {
  await sharp(`assets/source/${source}.png`).resize(size).webp({ quality: 87, alphaQuality: 100 }).toFile(`public/art/${name}.webp`);
}
// Original cells share scale. Translate only, never fit each silhouette independently.
// Feet are normalized to y=600 and x≈400 in every 627-square cell.
for (const [i, name, dy] of [[0,'calm',0],[1,'happy',-2],[2,'sleepy',24],[3,'angry',23]]) {
  const cell = await sharp('assets/source/birds.png').extract({ left: (i % 2) * 627, top: Math.floor(i / 2) * 627, width: 627, height: 627 }).png().toBuffer();
  const adjusted = dy < 0 ? await sharp(cell).extract({ left: 0, top: -dy, width: 627, height: 627 + dy }).toBuffer() : cell;
  const cropped = dy > 0 ? await sharp(adjusted).extract({ left: 0, top: 0, width: 627, height: 627 - dy }).toBuffer() : adjusted;
  const anchored = await sharp({ create: { width: 627, height: 627, channels: 4, background: '#00000000' } }).composite([{ input: cropped, left: 0, top: Math.max(0, dy) }]).png().toBuffer();
  await sharp(anchored).resize(420).webp({ quality: 90, alphaQuality: 100 }).toFile(`public/art/bird-${name}.webp`);
}
const names = ['wheat-seed','carrot-seed','strawberry-seed','soil','wheat-growing','carrot-growing','strawberry-growing','foreground','wheat-ready','carrot-ready','strawberry-ready','satchel','bread','carrot_cake',null,'postcards'];
for (const [i, name] of names.entries()) {
  if (!name) continue;
  const col = i % 4, row = Math.floor(i / 4);
  const left = Math.round(col * 1254 / 4), top = Math.round(row * 1254 / 4);
  await sharp('assets/source/items.png').extract({ left, top, width: Math.round((col + 1) * 1254 / 4) - left, height: Math.round((row + 1) * 1254 / 4) - top }).resize(320,320,{fit:'contain',background:'#00000000'}).webp({ quality: 88, alphaQuality: 100 }).toFile(`public/art/${name}.webp`);
}
for (let i = 0; i < 9; i++) {
  const destination = ['wind_field','moss_forest','salt_town'][Math.floor(i / 3)];
  await sharp('assets/source/postcards.png').extract({ left: (i % 3) * 418 + 8, top: Math.floor(i / 3) * 418 + 8, width: 400, height: 400 }).webp({ quality: 85 }).toFile(`public/art/${destination}_0${i % 3 + 1}.webp`);
}
console.log('32 production WebP assets prepared.');
