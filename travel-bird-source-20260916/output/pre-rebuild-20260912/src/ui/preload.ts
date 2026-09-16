const keyArt = ["indoor", "outdoor", "cabinet", "bird-calm", "bird-happy", "bird-sleepy", "bird-angry", "soil", "wheat-seed", "wheat-growing", "wheat-ready", "satchel", "foreground"];
export function preloadArt() {
  keyArt.forEach((name) => { const image = new Image(); image.src = `/art/${name}.webp`; image.decode().catch(() => {}); });
}
