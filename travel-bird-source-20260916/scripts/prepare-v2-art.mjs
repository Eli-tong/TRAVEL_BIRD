// Mechanical atlas slicing, foot-anchor alignment and format compression only.
// Artwork and background extraction are performed with the built-in image tool.
import { createRequire } from 'node:module';
import { copyFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = 'assets/source/v2';
const out = 'public/art/v2';
await mkdir(root, {recursive:true});
await mkdir(out, {recursive:true});
const source = process.argv[3];
if (source) await copyFile(source, `${root}/birds-alpha.png`);
const sourcePath = `${root}/birds-alpha.png`;
const meta = await sharp(sourcePath).metadata();
const stats = await sharp(sourcePath).stats();
if (!meta.hasAlpha || stats.isOpaque) throw new Error('Bird sheet has no real transparency');
const scale = meta.width / 1254;
if (meta.width !== meta.height) throw new Error('Bird sheet must remain square');
const baseBounds = [[0,350],[350,635],[635,960],[960,1254]];
const bounds = baseBounds.map(([left,right]) => [Math.round(left*scale), Math.round(right*scale)]);
const moods = ['calm','happy','sleepy','angry'];
const baseAnchors = [[[228,526],[502,526],[775,526],[1146,521]],[[228,1045],[492,1048],[775,1047],[1146,1027]]];
const anchors = baseAnchors.map((row) => row.map(([x,y]) => [Math.round(x*scale), Math.round(y*scale)]));
for (let row=0;row<2;row++) for (let col=0;col<4;col++) {
  const [left,right]=bounds[col];
  const top=Math.round((row===0?130:590)*scale), height=Math.round((row===0?460:560)*scale);
  const [ax,ay]=anchors[row][col];
  const width=Math.round((right-left)*.9), h=Math.round(height*.9);
  const cell=await sharp(sourcePath).extract({left,top,width:right-left,height}).resize(width,h).png().toBuffer();
  const image=sharp({create:{width:420,height:540,channels:4,background:'#00000000'}})
    .composite([{input:cell,left:Math.round(250-(ax-left)*.9),top:Math.round(430-(ay-top)*.9)}]);
  await image.webp({quality:90,alphaQuality:100}).toFile(`${out}/${row===0?'blue_quaker':'cockatiel'}-${moods[col]}.webp`);
}
console.log('8 character assets; source alpha verified; foot anchor = (250,430) on 420x540.');
