import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.MATURE_CROPS_URL ?? "http://127.0.0.1:5173/";
const saveKey = "travel-bird-save-v1";
const outputDir = "output/playwright/mature-crops";
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1100, height: 900 },
];
const crops = [
  { plotId: "plot-1", cropId: "wheat", path: "/art/garden-crops/wheat-ready.png" },
  { plotId: "plot-2", cropId: "carrot", path: "/art/garden-crops/carrot-ready.png" },
  { plotId: "plot-3", cropId: "strawberry", path: "/art/garden-crops/strawberry-ready.png" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width < 500,
      hasTouch: viewport.width < 500,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));

    try {
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      await page.evaluate(async ({ key, cropRows }) => {
        const { createNewGame, exportSave } = await import("/src/domain/game.ts");
        const now = Date.now();
        const game = createNewGame(now, "demo");
        game.settings.seenIntro = true;
        game.unlocked.crops = ["wheat", "carrot", "strawberry"];
        game.plots = cropRows.map(({ plotId, cropId }) => ({
          id: plotId,
          cropId,
          plantedAt: now - 10_000,
          readyAt: now - 1,
        }));
        game.bird.routine.location = "room";
        localStorage.setItem(key, exportSave(game));
      }, { key: saveKey, cropRows: crops });
      await page.reload({ waitUntil: "networkidle" });
      await page.locator('[data-hotspot="exit"]').click();
      await page.locator(".garden-viewport").evaluate((element) => { element.scrollLeft = 0; });

      for (const crop of crops) {
        const plot = page.locator(`[data-plot="${crop.plotId}"]`);
        const art = plot.locator(".crop-art");
        assert.equal(await plot.getAttribute("data-phase"), "ready");
        assert.ok((await art.getAttribute("src"))?.endsWith(crop.path));
        assert.equal(await art.evaluate((image) => image.complete && image.naturalWidth > 0), true);

        const [plotBox, artBox] = await Promise.all([plot.boundingBox(), art.boundingBox()]);
        assert.ok(plotBox && artBox);
        assert.ok(artBox.x >= plotBox.x - 1 && artBox.x + artBox.width <= plotBox.x + plotBox.width + 1);
        assert.ok(artBox.y + artBox.height <= plotBox.y + plotBox.height + 1);
      }

      const dimensions = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      assert.equal(dimensions.documentWidth, dimensions.viewportWidth);
      await page.screenshot({ path: `${outputDir}/ready-${viewport.width}x${viewport.height}.png` });

      const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
      for (const crop of crops) {
        await page.locator(`[data-plot="${crop.plotId}"]`).click();
        await page.locator(".growth-detail button").click();
        assert.equal(await page.locator(`[data-plot="${crop.plotId}"]`).getAttribute("data-phase"), "empty");
      }
      const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
      for (const crop of crops) {
        assert.equal(after.inventory.materials[crop.cropId], before.inventory.materials[crop.cropId] + 2);
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: three mature crop images load, stay in plot bounds, and harvest once`);
    } catch (error) {
      failures.push(`${viewport.width}x${viewport.height}: ${error.stack ?? error.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log("PASS all mature crop browser acceptance checks");
}
