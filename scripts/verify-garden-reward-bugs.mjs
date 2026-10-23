import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

// Isolated browser contexts: never touch the player's existing browser save.
const baseUrl = "http://127.0.0.1:5173/";
const outputDir = "output/playwright/garden-reward-bugs";
const saveKey = "travel-bird-save-v1";
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
const doubleClaim = (page, text) => page.getByRole("button", { name: text, exact: true })
  .evaluate((button) => { button.click(); button.click(); });
const openGarden = (page) => page.locator('[data-hotspot="exit"]').click();
const openBag = (page) => page.locator('[data-hotspot="travelBag"]').click();
const openMail = (page) => page.locator('[data-garden-hotspot="mailbox"]').click();
const enterHome = (page) => page.locator('[data-garden-hotspot="entrance"]').click();
const closePanel = async (page) => {
  await page.getByRole("button", { name: "关闭弹层", exact: true }).click();
  await page.clock.runFor(300);
  await page.locator('[role="dialog"]').waitFor({ state: "hidden" });
};

try {
  for (const viewport of viewports) {
    for (const order of ["mail-first", "seeds-first"]) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.clock.install({ time: new Date("2026-10-14T08:00:00Z") });
        await page.goto(baseUrl);
        await page.evaluate(async (key) => {
          const { createNewGame, exportSave } = await import("/src/domain/game.ts");
          const game = createNewGame(Date.now());
          game.inventory.foods["strawberry-cloud-bun"] = 1;
          game.settings.seenIntro = true;
          localStorage.setItem(key, exportSave(game));
        }, saveKey);
        await page.reload();
        await openBag(page);
        await page.getByRole("button", { name: /风车田野/ }).click();
        await page.getByRole("button", { name: /草莓云朵麦包/ }).click();
        assert.equal(await page.getByRole("button", { name: /出发|Depart|Start Trip/ }).count(), 0);
        await page.getByRole("button", { name: "行囊准备好了", exact: true }).click();
        await closePanel(page);
        let timed = await saved(page);
        assert.equal(timed.travel.status, "ready");
        assert.equal(await page.locator('[data-hotspot="bird"]').count(), 1);
        await page.clock.runFor(timed.travel.plannedDepartureAt - await page.evaluate(() => Date.now()) + 600);
        assert.equal(await page.locator('[data-hotspot="bird"]').count(), 0);
        await openGarden(page);
        assert.equal(await page.locator('.garden-background[src$="background-away.png"]').count(), 1);
        assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 0);
        await page.screenshot({ path: outputDir + "/away-" + viewport.width + "-" + order + ".png" });
        await enterHome(page);
        assert.equal(await page.locator('[data-hotspot="bird"]').count(), 0);
        timed = await saved(page);
        await page.clock.runFor(timed.travel.plannedReturnAt - await page.evaluate(() => Date.now()) + 600);
        await page.getByRole("status").filter({ hasText: "小鸟回来了" }).waitFor();
        await page.locator('[data-hotspot="bird"]').waitFor();
        assert.equal(await page.locator('[data-hotspot="travelBag"][data-pending-seeds="true"]').count(), 1);
        await openGarden(page);
        assert.equal(await page.locator('.garden-background[src$="background-away.png"]').count(), 1);
        // Returning restores the autonomous room routine; changing the player's
        // view does not drag the bird into the garden.
        assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 0);
        assert.equal(await page.locator(".garden-mail-envelope").count(), 1);
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth
        }));
        assert.equal(dimensions.documentWidth, dimensions.viewport);

        if (order === "mail-first") {
          await openMail(page);
          const text = await page.getByRole("dialog").innerText();
          assert.match(text, /蒲公英风坡/);
          assert.doesNotMatch(text, /胡萝卜种子|新食谱/);
          const before = await saved(page);
          await doubleClaim(page, "收好明信片");
          let game = await saved(page);
          assert.deepEqual(game.inventory, before.inventory);
          assert.equal(game.album.collected.length, 1);
          assert.equal(game.travel.pendingBagRewards.length, 1);
          await page.reload();
          await openGarden(page);
          assert.equal(await page.locator(".garden-mail-envelope").count(), 0);
          await openMail(page);
          assert.match(await page.locator('[role="status"]').innerText(), /今天没有新的信/);
          assert.equal(await page.getByRole("dialog").count(), 0);
          await enterHome(page);
          await openBag(page);
          const bagText = await page.getByRole("dialog").innerText();
          assert.match(bagText, /胡萝卜种子/);
          assert.match(bagText, /胡萝卜月牙脆饼/);
          assert.doesNotMatch(bagText, /蒲公英风坡|明信片/);
          await doubleClaim(page, "收好带回的东西");
        } else {
          await enterHome(page);
          await openBag(page);
          const text = await page.getByRole("dialog").innerText();
          assert.match(text, /胡萝卜种子/);
          assert.match(text, /胡萝卜月牙脆饼/);
          assert.doesNotMatch(text, /蒲公英风坡|明信片/);
          await doubleClaim(page, "收好带回的东西");
          let game = await saved(page);
          assert.equal(game.inventory.seeds.carrot, 1);
          assert.equal(game.unlocked.recipes.includes("carrot-crescent-crisp"), true);
          assert.equal(game.album.collected.length, 0);
          assert.equal(game.travel.pendingPostcards.length, 1);
          await page.reload();
          await openBag(page);
          assert.match(await page.getByRole("dialog").innerText(), /没有待领取的东西/);
          assert.equal(await page.getByRole("button", { name: "收好带回的东西", exact: true }).count(), 0);
          await closePanel(page);
          await openGarden(page);
          assert.equal(await page.locator(".garden-mail-envelope").count(), 1);
          await openMail(page);
          assert.doesNotMatch(await page.getByRole("dialog").innerText(), /胡萝卜种子|新食谱/);
          await doubleClaim(page, "收好明信片");
        }
        await page.reload();
        const completed = await saved(page);
        assert.equal(completed.inventory.seeds.carrot, 1);
        assert.equal(completed.album.collected.length, 1);
        assert.equal(completed.currentJourney, null);
        assert.equal(completed.travelLog.length, 1);
        await openGarden(page);
        assert.equal(await page.locator(".garden-mail-envelope").count(), 0);
        await page.screenshot({ path: outputDir + "/returned-" + viewport.width + "-" + order + ".png" });
        assert.deepEqual(errors, []);
        console.log("PASS " + viewport.width + "px " + order + ": bird visibility, separate rewards, double click, reload");
      } catch (error) {
        failures.push(viewport.width + "px " + order + ": " + (error.stack ?? error.message));
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
