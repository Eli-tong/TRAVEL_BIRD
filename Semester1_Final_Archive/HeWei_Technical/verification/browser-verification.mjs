import assert from "node:assert/strict";
import { chromium, devices, webkit } from "playwright";

const base = process.env.TB_TEST_URL ?? "http://127.0.0.1:4312/";
const engine = process.env.TB_TEST_ENGINE ?? "chrome";
const browser = engine === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
const context = await browser.newContext(engine === "webkit"
  ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
context.setDefaultTimeout(12_000);
const key = "travel-bird-save-v1";

async function gameFlow() {
  let page = await context.newPage();
  const faults = [];
  const track = current => current.on("pageerror", error => faults.push(error.message));
  track(page);
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const status = name => page.waitForFunction(
    ({ key, name }) => JSON.parse(localStorage.getItem(key))?.travel?.status === name, { key, name });
  const now = () => page.evaluate(() => Date.now());
  const advanceTo = async at => page.clock.fastForward(Math.max(0, at - await now()) + 1200);
  const button = name => page.getByRole("button", { name, exact: true });
  const hotspot = id => page.locator('[data-hotspot="' + id + '"]').click();
  const garden = id => page.locator('[data-garden-hotspot="' + id + '"]').click();
  const close = async () => {
    await button("关闭弹层").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  };
  const cook = async id => {
    await hotspot("pot");
    await page.locator('[data-recipe="' + id + '"]').click();
    await button("制作").click();
    await advanceTo((await saved()).cooking.readyAt);
    await button("领取食物").click();
    assert.equal((await saved()).inventory.foods[id], 1);
    await close();
  };
  const pack = async (destination, food) => {
    await hotspot("travelBag");
    await page.getByRole("button", { name: destination }).click();
    await page.getByRole("button", { name: food }).click();
    await button("行囊准备好了").click();
    await status("ready");
    const game = await saved();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    return game;
  };

  await page.clock.install();
  await page.goto(base);
  await page.locator("img.room-background").evaluate(img => img.decode());
  assert.equal((await saved()).settings.mode, "normal");
  await cook("strawberry-cloud-bun");
  const trip = await pack(/风车田野/, /草莓云朵麦包/);
  await page.reload();
  await status("ready");
  assert.equal((await saved()).currentJourney.id, trip.currentJourney.id);
  await advanceTo(trip.travel.plannedDepartureAt);
  await status("travelling");
  assert.equal(await page.locator('[data-hotspot="bird"], .travel-bird').count(), 0);
  await hotspot("exit");
  assert.equal(await page.locator('[data-garden-hotspot="bird"], .travel-bird').count(), 0);

  // Reopen the same origin after the scheduled return with the page previously closed.
  await page.close();
  page = await context.newPage();
  track(page);
  await page.clock.install({ time: new Date(trip.travel.plannedReturnAt + 1200) });
  await page.goto(base);
  await status("returned");
  assert.equal((await saved()).travel.pendingPostcards.length, 1);
  assert.equal((await saved()).travel.pendingBagRewards.length, 1);
  await hotspot("exit");
  await garden("mailbox");
  await button("抽出明信片").click();
  await button("收好明信片").evaluate(el => { el.click(); el.click(); });
  assert.equal((await saved()).album.collected.length, 1);
  assert.equal((await saved()).inventory.seeds.carrot, 0);
  await page.reload();
  await status("returned");
  await hotspot("travelBag");
  await button("收好带回的东西").evaluate(el => { el.click(); el.click(); });
  await status("home");
  assert.equal((await saved()).inventory.seeds.carrot, 1);
  assert.equal((await saved()).travelLog.length, 1);
  await hotspot("exit");
  const plot = page.locator('[data-plot="plot-1"]');
  await plot.click();
  await page.getByRole("button", { name: /胡萝卜种子/ }).click();
  assert.equal((await saved()).inventory.seeds.carrot, 0);
  await advanceTo((await saved()).plots[0].readyAt);
  await plot.click();
  await button("收获作物").click();
  assert.equal((await saved()).inventory.materials.carrot, 2);
  assert.equal((await saved()).inventory.seeds.carrot, 1);
  await page.locator(".garden-viewport").evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await garden("entrance");
  await cook("carrot-crescent-crisp");
  const second = await pack(/苔光森林/, /胡萝卜月牙脆饼/);
  assert.equal(second.currentJourney.foodId, "carrot-crescent-crisp");
  assert.equal(second.inventory.foods["carrot-crescent-crisp"], 0);
  await advanceTo(second.travel.plannedDepartureAt);
  await status("travelling");
  assert.equal((await saved()).currentJourney.destinationId, "moss_forest");

  await page.locator(".room-menu").click();
  await button("设置与存档").click();
  const textarea = page.getByRole("dialog").locator("textarea");
  await button("导出").click();
  const exported = JSON.parse(await textarea.inputValue());
  assert.equal(exported.currentJourney.id, second.currentJourney.id);
  await textarea.fill("{invalid");
  await button("导入").click();
  assert.equal((await saved()).currentJourney.id, second.currentJourney.id);
  assert.equal(await page.getByRole("dialog").count(), 1);
  exported.bird.name = "验证鸟";
  await textarea.fill(JSON.stringify(exported));
  await button("导入").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.reload();
  await status("travelling");
  assert.equal((await saved()).bird.name, "验证鸟");
  assert.deepEqual(faults, []);
  await page.close();
  console.log("PASS two departures, hidden away bird, same-origin reload/reopen, offline settlement, double-click claim protection, carrot plot and crisp, JSON export, invalid and valid import");
}

async function backgroundRetry(scene, failTwice) {
  const page = await context.newPage();
  const garden = scene === "garden";
  const name = garden ? "background-away.png" : "background.png";
  const urls = [];
  const warnings = [];
  page.on("console", message => {
    if (message.text().includes("Scene background failed")) warnings.push(message.text());
  });
  await page.route(url => url.pathname.endsWith("/" + name), route => {
    const url = new URL(route.request().url());
    urls.push(url.pathname + url.search);
    return !url.search || failTwice ? route.abort("failed") : route.continue();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  if (garden) await page.locator('[data-hotspot="exit"]').click();
  if (failTwice) {
    await page.locator("." + scene + "-image-error").waitFor();
    assert.equal(await page.locator(garden ? '[data-garden-hotspot="mailbox"]' : '[data-hotspot="exit"]').isDisabled(), true);
  } else {
    const image = page.locator("img." + scene + "-background[src$='?retry=1']");
    const width = await image.evaluate(img => img.decode().then(() => img.naturalWidth));
    assert.equal(width, garden ? 1024 : 941);
    assert.equal(await page.locator("." + scene + "-image-error").count(), 0);
  }
  assert.equal(urls.length, 2);
  assert.ok(urls[1].endsWith("?retry=1"));
  assert.equal(warnings.length, failTwice ? 2 : 1);
  console.log("PASS", scene, failTwice ? "two failures then existing alert" : "recovers after first request fails", urls.join(" -> "));
  await page.close();
}

try {
  console.log("Target", base, "Engine", engine, browser.version(), new Date().toISOString());
  if (process.argv.includes("--retry-only")) {
    for (const scene of ["room", "garden"]) {
      await backgroundRetry(scene, false);
      await backgroundRetry(scene, true);
    }
  } else {
    await gameFlow();
  }
} finally {
  await context.close();
  await browser.close();
}
