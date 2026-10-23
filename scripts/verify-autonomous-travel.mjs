import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.AUTONOMOUS_TRAVEL_URL ?? "http://127.0.0.1:4173/";
const saveKey = "travel-bird-save-v1";
const outputDir = "output/playwright/autonomous-travel";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const requestFailures = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("requestfailed", (request) => requestFailures.push(`${request.url()}: ${request.failure()?.errorText}`));

const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
const closePanel = async () => {
  await page.getByRole("button", { name: "关闭弹层", exact: true }).click();
  await page.clock.runFor(300);
};
const openBag = () => page.locator('[data-hotspot="travelBag"]').click();
const openGarden = () => page.locator('[data-hotspot="exit"]').click();
const enterHome = () => page.locator('[data-garden-hotspot="entrance"]').click();
const doubleClickDomButton = (name) => page.getByRole("button", { name, exact: true })
  .evaluate((button) => { button.click(); button.click(); });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1_000);
  const initialText = await page.locator("body").innerText();
  const browserState = await page.evaluate(() => ({
    readyState: document.readyState,
    rootHtml: document.querySelector("#root")?.innerHTML,
    scripts: [...document.scripts].map((script) => script.src)
  }));
  assert.match(browserState.rootHtml ?? "", /room-shell/, JSON.stringify({ pageErrors, consoleErrors, requestFailures, browserState, url: page.url() }));
  assert.doesNotMatch(initialText, /快速试玩|Quick play|立即出发|Start Trip|Fast Play/);
  await page.clock.install({ time: new Date() });
  await page.locator(".room-menu").click();
  await page.getByRole("button", { name: "设置与存档", exact: true }).click();
  assert.doesNotMatch(await page.getByRole("dialog").innerText(), /快速试玩|Quick play|立即回来|Return now|跳过等待|Skip waiting/);
  await closePanel();

  await page.locator('[data-hotspot="pot"]').click();
  const starterRecipe = page.locator("article.recipe").filter({ hasText: "草莓云朵麦包" });
  await starterRecipe.getByRole("button", { name: "制作", exact: true }).click();
  await page.clock.runFor(10_100);
  await page.getByRole("button", { name: "领取食物", exact: true }).click();
  await closePanel();

  await openBag();
  await page.getByRole("button", { name: /风车田野/ }).click();
  await page.getByRole("button", { name: /草莓云朵麦包/ }).click();
  assert.equal(await page.getByRole("button", { name: /出发|Depart|Start Trip/ }).count(), 0);
  await page.getByRole("button", { name: "行囊准备好了", exact: true }).click();
  assert.match(await page.getByRole("dialog").innerText(), /行囊已经准备好/);
  assert.doesNotMatch(await page.getByRole("dialog").innerText(), /距离出发|秒后出发|depart in/i);
  await closePanel();
  assert.equal(await page.locator('[data-hotspot="bird"]').count(), 1);

  const readySave = await saved();
  assert.equal(readySave.travel.status, "ready");
  assert.equal(readySave.inventory.foods["strawberry-cloud-bun"], 0);
  await page.reload();
  assert.equal((await saved()).travel.status, "ready");
  assert.equal(await page.locator('[data-hotspot="bird"]').count(), 1);

  await page.clock.runFor(readySave.travel.plannedDepartureAt - await page.evaluate(() => Date.now()) + 600);
  assert.equal(await page.locator('[data-hotspot="bird"]').count(), 0);
  await openBag();
  const awayText = await page.getByRole("dialog").innerText();
  assert.match(awayText, /小鸟现在不在家/);
  assert.doesNotMatch(awayText, /后回来|倒计时|Return in/i);
  assert.equal(await page.getByRole("dialog").locator(".progress").count(), 0);
  await closePanel();
  await openGarden();
  assert.equal(await page.locator('.garden-background[src$="background-away.png"]').count(), 1);
  assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 0);

  await page.reload();
  assert.equal((await saved()).travel.status, "travelling");
  assert.equal(await page.locator('[data-hotspot="bird"]').count(), 0);
  await openGarden();
  assert.equal(await page.locator('.garden-background[src$="background-away.png"]').count(), 1);
  assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 0);
  const travellingSave = await saved();
  await page.clock.runFor(travellingSave.travel.plannedReturnAt - await page.evaluate(() => Date.now()) + 600);
  await page.getByRole("status").filter({ hasText: "小鸟回来了" }).waitFor();
  assert.equal((await saved()).travel.status, "returned");
  assert.equal(await page.locator(".garden-mail-envelope").count(), 1);
  const returnedSave = await saved();
  assert.equal(returnedSave.travel.status, "returned");
  assert.equal(returnedSave.travel.pendingPostcards.length, 1);
  assert.equal(returnedSave.travel.pendingBagRewards.length, 1);
  assert.equal(returnedSave.album.collected.length, 0);
  assert.equal(returnedSave.inventory.seeds.carrot, 0);

  await page.clock.runFor(2_500);
  await page.reload();
  assert.equal(await page.getByRole("status").filter({ hasText: "小鸟回来了" }).count(), 0);
  await openBag();
  const bagText = await page.getByRole("dialog").innerText();
  assert.match(bagText, /胡萝卜种子/);
  assert.match(bagText, /胡萝卜月牙脆饼/);
  assert.doesNotMatch(bagText, /蒲公英风坡|新明信片/);
  await doubleClickDomButton("收好带回的东西");
  const bagClaimed = await saved();
  assert.equal(bagClaimed.inventory.seeds.carrot, 1);
  assert.equal(bagClaimed.unlocked.recipes.includes("carrot-crescent-crisp"), true);
  assert.equal(bagClaimed.travel.pendingBagRewards.length, 0);
  assert.equal(bagClaimed.album.collected.length, 0);

  await openGarden();
  await page.locator('[data-garden-hotspot="mailbox"]').click();
  const mailText = await page.getByRole("dialog").innerText();
  assert.match(mailText, /蒲公英风坡/);
  assert.doesNotMatch(mailText, /胡萝卜种子|新食谱/);
  await doubleClickDomButton("收好明信片");
  let completed = await saved();
  assert.equal(completed.album.collected.length, 1);
  assert.equal(completed.inventory.seeds.carrot, 1);
  assert.equal(completed.currentJourney, null);
  assert.equal(completed.travel.status, "home");
  assert.equal(completed.travelLog.length, 1);

  await page.reload();
  completed = await saved();
  assert.equal(completed.album.collected.length, 1);
  assert.equal(completed.inventory.seeds.carrot, 1);
  assert.equal(completed.travelLog.length, 1);
  await openGarden();
  await page.locator('[data-plot="plot-1"]').click();
  await page.getByRole("button", { name: /胡萝卜种子/ }).click();
  await page.clock.runFor(180_100);
  await page.locator('[data-plot="plot-1"][data-phase="ready"]').click();
  await page.getByRole("button", { name: "收获作物", exact: true }).click();
  completed = await saved();
  assert.equal(completed.inventory.materials.carrot, 2);
  assert.equal(completed.inventory.seeds.carrot, 1);

  await enterHome();
  await page.locator('[data-hotspot="pot"]').click();
  const carrotRecipe = page.locator("article.recipe").filter({ hasText: "胡萝卜月牙脆饼" });
  await carrotRecipe.getByRole("button", { name: "制作", exact: true }).click();
  await page.clock.runFor(10_100);
  await page.getByRole("button", { name: "领取食物", exact: true }).click();
  await closePanel();

  await openBag();
  await page.getByRole("button", { name: /苔光森林/ }).click();
  await page.getByRole("button", { name: /胡萝卜月牙脆饼/ }).click();
  await page.getByRole("button", { name: "行囊准备好了", exact: true }).click();
  const secondReady = await saved();
  assert.equal(secondReady.travel.status, "ready");
  assert.equal(secondReady.currentJourney.foodId, "carrot-crescent-crisp");
  assert.equal(secondReady.inventory.foods["carrot-crescent-crisp"], 0);
  assert.equal(await page.getByRole("button", { name: /出发|Depart|Start Trip/ }).count(), 0);
  await page.screenshot({ path: `${outputDir}/second-trip-ready.png`, fullPage: true });

  assert.deepEqual(pageErrors, []);
  console.log("PASS fresh save -> first autonomous trip -> pending mailbox/backpack -> carrot harvest -> crisp -> second bag ready");
  console.log(`PASS persisted timestamps: ${readySave.travel.plannedDepartureAt} -> ${readySave.travel.plannedReturnAt}`);
  console.log("PASS no formal depart/countdown/quick-play controls and no duplicate rewards after reload/double click");
} finally {
  await context.close();
  await browser.close();
}
