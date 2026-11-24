# Technical Architecture

Travel Bird · He Wei · 24 November 2026 · React 19, TypeScript, and Vite

~~~mermaid
flowchart TD
  Host["Netlify serves dist"] --> Browser["Mobile browser"]
  Browser --> App["main.tsx / App.tsx"]
  App --> UI["Room, garden, kitchen, travel bag, mailbox, album, and settings"]
  UI --> Clock["App action handlers and world clock"]
  Clock --> Game["game.ts / GameState"]
  Game --> Rules["config.ts / Crops, recipes, destinations, and rewards"]
  Game --> Routine["birdRoutine.ts / Daily routine"]
  Game --> Motion["travelChoreography.ts / Departure and return"]
  Clock --> Save[("localStorage / travel-bird-save-v1")]
  Save --> App
  App --> Warm["Low-priority asset preloading"]
  UI --> Art["Same-origin public/art and public/fonts"]
  Warm --> Art
~~~

- The entry point mounts React and imports styles. After the page load event, preload.ts warms frequently used animation and album assets in small batches. Visible elements load their images through the DOM or CSS. [main.tsx](../../src/main.tsx) · [preload.ts](../../src/ui/preload.ts)
- App owns GameState, the current scene and panel, plot selection, and language. Its gameRef gives successive actions the latest state. RoomScene and GardenScene render backgrounds, hotspots, and characters. KitchenPanel, TravelBagPacking, and InventoryCabinet expose the relevant controls. PostcardAlbum and PostcardPreview display collected postcards. [App.tsx](../../src/App.tsx)
- Domain code implements planting, cooking, packing, travel, reward collection, and save import. types.ts defines the data, and config.ts defines the rules. birdRoutine.ts models daily activity, travelChoreography.ts defines departure and return stages, and TravelBird.tsx maps the timeline to sprite frames and positions. [game.ts](../../src/domain/game.ts) · [config.ts](../../src/domain/config.ts)
- Scene layout modules define artwork dimensions, anchors, and hotspots. CSS preserves proportions, and garden navigation retains the horizontal position within the current session. The translation dictionary supports English and Simplified Chinese. [roomLayout.ts](../../src/ui/roomLayout.ts) · [gardenLayout.ts](../../src/ui/gardenLayout.ts) · [i18n](../../src/i18n/)
- JSON saves contain a version, timestamps, inventory, and journey state. On reopening, the app resolves elapsed tasks against the current clock. Browser storage is specific to the origin. The app runs without a backend, account system, cloud sync, routing library, or service worker. [App.tsx](../../src/App.tsx) · [game.ts](../../src/domain/game.ts)
- Vite uses the default base path of `/`. The build type-checks the app, copies public into dist, and emits hashed JavaScript and CSS. The Netlify config sets the build and publish directory. The published redirects file handles asset 404s and SPA fallback. Original artwork and preparation scripts are kept under assets/source and scripts. [netlify.toml](../../netlify.toml) · [_redirects](../../public/_redirects)

[Implementation evidence](Technical_Evidence_Final.md) · [Build and verification](Technical_Verification_Final.md)
