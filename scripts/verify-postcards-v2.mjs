import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.POSTCARDS_URL ?? "http://127.0.0.1:5173/";
const saveKey = "travel-bird-save-v1";
const outputDir = "output/playwright/postcards-v2";
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1100, height: 900 },
];
const languages = [
  { id: "zh-CN", menu: "打开菜单", album: "相册", flip: "翻到背面", close: "关闭弹层" },
  { id: "en", menu: "Open menu", album: "Postcard album", flip: "Turn to the back", close: "Close dialog" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const viewport of viewports) {
    for (const language of languages) {
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
        const registry = await page.evaluate(async ({ key, languageId }) => {
          const { createNewGame, exportSave } = await import("/src/domain/game.ts");
          const { ALL_REGISTERED_POSTCARD_IDS, POSTCARDS } = await import("/src/domain/config.ts");
          const game = createNewGame(Date.now(), "demo");
          game.settings.seenIntro = true;
          game.settings.language = languageId;
          game.album.collected = ALL_REGISTERED_POSTCARD_IDS.map((postcardId, index) => ({
            postcardId,
            firstCollectedAt: Date.UTC(2026, 9, 1 + index),
            firstJourneyId: `postcard-v2-${index}`,
            firstStory: POSTCARDS[postcardId].storySeed,
            birdNameSnapshot: "啾啾",
          }));
          localStorage.setItem(key, exportSave(game));
          return ALL_REGISTERED_POSTCARD_IDS.map((id) => ({
            id,
            friend: POSTCARDS[id].friend,
            frontArtKey: POSTCARDS[id].frontArtKey,
          }));
        }, { key: saveKey, languageId: language.id });
        await page.reload({ waitUntil: "networkidle" });

        assert.equal(registry.length, 10);
        assert.deepEqual(registry.filter((card) => card.friend).map((card) => [card.id, card.friend]), [
          ["wind_field_02", "rabbit"],
          ["moss_forest_02", "deer"],
          ["salt_town_02", "seal"],
        ]);
        assert.equal(registry.filter((card) => card.id !== "first-dandelion-hill-selfie")
          .every((card) => card.frontArtKey === `/art/postcards/v2/${card.id}.png`), true);

        await page.getByRole("button", { name: language.menu }).click();
        await page.getByRole("button", { name: language.album, exact: true }).click();
        assert.equal(await page.locator(".postcard-tile.earned").count(), 10);

        for (let index = 0; index < registry.length; index += 1) {
          await page.locator(".postcard-tile.earned").nth(index).click();
          const viewer = page.locator(".postcard-viewer-modal");
          const front = viewer.locator(".postcard-front");
          const art = front.locator(".postcard-art");
          assert.equal(await art.evaluate((image) => image.complete && image.naturalWidth > 0), true);
          assert.equal(await front.locator(".postcard-location-tag").count(), 0);
          if (registry[index].id !== "first-dandelion-hill-selfie") {
            assert.ok((await art.getAttribute("src"))?.includes("/art/postcards/v2/"));
            assert.equal((await art.getAttribute("src"))?.endsWith(".webp"), false);
          }

          await viewer.getByRole("button", { name: language.flip }).click();
          const back = viewer.locator(".postcard-back");
          const fit = await back.evaluate((element) => ({
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            paragraphs: element.querySelectorAll(".postcard-message p").length,
            titleOutside: Boolean(element.closest(".postcard-viewer")?.querySelector(":scope > .postcard-location-tag")),
          }));
          assert.ok(fit.paragraphs >= 2);
          assert.equal(fit.titleOutside, true);
          assert.ok(fit.scrollHeight <= fit.clientHeight + 1, `vertical overflow on ${registry[index].id}`);
          assert.ok(fit.scrollWidth <= fit.clientWidth + 1, `horizontal overflow on ${registry[index].id}`);

          if (registry[index].id === "salt_town_02" && language.id === "en") {
            await page.screenshot({ path: `${outputDir}/seal-back-${viewport.width}x${viewport.height}-${language.id}.png` });
          }
          await viewer.getByRole("button", { name: language.close }).click();
        }

        await page.reload({ waitUntil: "networkidle" });
        const collected = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).album.collected, saveKey);
        assert.equal(collected.length, 10);
        assert.equal(new Set(collected.map((entry) => entry.postcardId)).size, 10);
        assert.deepEqual(errors, []);
        console.log(`PASS ${viewport.width}x${viewport.height} ${language.id}: ten fronts, backs, bilingual letters, friend registry, reload persistence`);
      } catch (error) {
        failures.push(`${viewport.width}x${viewport.height} ${language.id}: ${error.stack ?? error.message}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log("PASS complete ten-postcard browser acceptance checks");
}
