import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { createServer } from "vite";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : path;
  }))).flat();
}

const route = /\/(?:art|fonts|assets)\/[\w./-]+\.(?:webp|png|jpe?g|svg|gif|avif|woff2?|ttf|js|css)\b/g;
const assetPaths = new Set();
const built = resolve(process.argv[2] ?? "dist");
for (const file of [...await files("src"), ...await files(resolve(built, "assets"))]) {
  if (/\.test\.[cm]?[tj]sx?$/.test(file) || !/\.(ts|tsx|css|js)$/.test(file)) continue;
  for (const match of (await readFile(file, "utf8")).matchAll(route)) assetPaths.add(match[0]);
}

const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: "custom" });
try {
  const routines = await server.ssrLoadModule("/src/ui/birdRoutineArt.ts");
  const travel = await server.ssrLoadModule("/src/ui/TravelBird.tsx");
  const config = await server.ssrLoadModule("/src/domain/config.ts");
  const groups = [routines.BIRD_ROUTINE_ART, routines.BIRD_ROUTINE_WALK_ART,
    routines.BIRD_ROUTINE_FLIGHT_ART, routines.GARDEN_ROUTE_ART, travel.TRAVEL_BIRD_ART];
  for (const item of [...groups.flatMap(Object.values), routines.ROOM_BED_FLIGHT_ART]) {
    assetPaths.add(item.src);
    if (item.fallback) assetPaths.add(item.fallback);
  }
  for (const id of Object.keys(config.CROPS)) assetPaths.add("/art/" + id + "-growing.webp");
  for (const mood of ["calm", "happy", "sleepy", "angry"]) assetPaths.add("/art/bird-" + mood + ".webp");
  for (const scene of ["indoor", "outdoor"]) assetPaths.add("/art/" + scene + ".webp");
} finally {
  await server.close();
}

for (const root of [resolve("public"), built]) {
  const entries = await files(root);
  const actual = new Set(entries.map(file => "/" + relative(root, file).replaceAll("\\", "/")));
  const missing = [...assetPaths].filter(file => !actual.has(file));
  const images = entries.filter(file => /\.(png|webp|jpe?g|gif|svg|avif)$/i.test(file));
  const bytes = (await Promise.all(images.map(async file => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
  console.log(JSON.stringify({ root: relative(process.cwd(), root), referencesChecked: assetPaths.size,
    imageFiles: images.length, imageBytes: bytes, missing }, null, 2));
  if (missing.length) process.exitCode = 1;
}

const html = await readFile(resolve(built, "index.html"), "utf8");
for (const [entry] of html.matchAll(route)) {
  await stat(resolve(built, "." + entry));
  console.log("Build entry exists:", entry);
}
