import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BIRD_ROUTINE_URL ?? "http://127.0.0.1:4176/";
const saveKey = "travel-bird-save-v1";
const outputDir = "output/playwright/bird-routine-authentic";
const criticalGardenArt = [
  "/art/bird-routine/garden-walk-left-v3.png",
  "/art/bird-routine/garden-walk-right-v3.png",
  "/art/bird-routine/garden-preen-v2.png",
  "/art/bird-routine/garden-water-pickup-v3.png",
  "/art/bird-routine/garden-water-pour-v3.png",
  "/art/bird-routine/garden-water-putdown-v3.png",
];
const gardenFootRatio = 509 / 540;
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1100, height: 900 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
const advanceToDecision = async (page) => {
  const game = await saved(page);
  const delta = game.bird.routine.nextDecisionAt - await page.evaluate(() => Date.now());
  // App samples the wall clock every 500 ms; leave room for the next interval
  // and the following persistence effect without crossing a 4 s transition.
  await page.clock.runFor(Math.max(0, delta) + 1_600);
  return saved(page);
};

const replaceRoutine = async (page, routine) => {
  await page.evaluate(async ({ key, routine }) => {
    const { exportSave, importSave } = await import("/src/domain/game.ts");
    const parsed = importSave(localStorage.getItem(key));
    if (!parsed.ok) throw new Error(parsed.error);
    parsed.game.bird.routine = routine;
    localStorage.setItem(key, exportSave(parsed.game));
  }, { key: saveKey, routine });
  await page.reload({ waitUntil: "networkidle" });
};

try {
  for (const viewport of viewports) {
    const reducedMotion = viewport.width === 390 ? "reduce" : "no-preference";
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width < 500,
      hasTouch: viewport.width < 500,
      reducedMotion,
    });
    await context.addInitScript(() => {
      globalThis.__birdRoutineRng = 1;
      Math.random = () => globalThis.__birdRoutineRng;
      globalThis.__birdImageSources = [];
      const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
      if (descriptor?.get && descriptor.set) {
        Object.defineProperty(HTMLImageElement.prototype, "src", {
          configurable: descriptor.configurable,
          enumerable: descriptor.enumerable,
          get: descriptor.get,
          set(value) {
            globalThis.__birdImageSources.push(String(value));
            descriptor.set.call(this, value);
          },
        });
      }
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));

    try {
      await page.clock.install({ time: new Date("2026-10-21T08:00:00Z") });
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      const preloadedGardenArt = await page.evaluate((paths) => {
        const sources = globalThis.__birdImageSources ?? [];
        return paths.filter((path) => !sources.some((source) => source.endsWith(path)));
      }, criticalGardenArt);
      assert.deepEqual(preloadedGardenArt, []);
      await page.evaluate(async (key) => {
        const { createNewGame, exportSave } = await import("/src/domain/game.ts");
        const game = createNewGame(Date.now(), "demo");
        game.settings.seenIntro = true;
        localStorage.setItem(key, exportSave(game));
      }, saveKey);
      await page.reload({ waitUntil: "networkidle" });

      assert.equal(await page.locator('[data-hotspot="bird"]').count(), 1);
      const roomBirdBox = await page.locator('[data-hotspot="bird"]').boundingBox();
      assert.ok(roomBirdBox && roomBirdBox.width >= 44);
      assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 0);
      const roomReadStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "room", activity: "room-read", previousActivity: "room-idle",
        activityStartedAt: roomReadStartedAt, nextDecisionAt: roomReadStartedAt + 20_000, sequenceStep: 1,
        roomSpot: "branch", flightFrom: null, flightTo: null, plannedActivity: null,
      });
      assert.equal(await page.locator(".room-trunk-occluder").count(), 0);
      const readingBird = page.locator('[data-hotspot="bird"]');
      const readingFrame = readingBird.locator(".bird-routine-frame");
      const readingAnimation = await readingFrame.evaluate((element) => ({
        name: getComputedStyle(element).animationName,
        duration: getComputedStyle(element).animationDuration,
      }));
      assert.equal(readingAnimation.name, "room-read-long");
      assert.equal(readingAnimation.duration, reducedMotion === "reduce" ? "48s" : "16s");
      const readingDurationMs = reducedMotion === "reduce" ? 48_000 : 16_000;
      await readingFrame.evaluate((element, currentTime) => {
        const animation = element.getAnimations()[0];
        if (!animation) throw new Error("room reading animation is missing");
        animation.currentTime = currentTime;
      }, readingDurationMs * 0.31);
      const quietReadingPosition = await readingFrame.evaluate((element) => getComputedStyle(element).backgroundPositionX);
      assert.match(quietReadingPosition, /14\.286%|28\.571%/);
      await page.screenshot({ path: `${outputDir}/room-read-grounded-${viewport.width}x${viewport.height}.png` });
      await readingFrame.evaluate((element, currentTime) => {
        const animation = element.getAnimations()[0];
        if (!animation) throw new Error("room reading animation is missing");
        animation.currentTime = currentTime;
      }, readingDurationMs * 0.75);
      assert.match(await readingFrame.evaluate((element) => getComputedStyle(element).backgroundPositionX), /57\.143%/);
      await page.screenshot({ path: `${outputDir}/room-read-page-turn-${viewport.width}x${viewport.height}.png` });
      await readingBird.click();
      assert.equal(await readingBird.getAttribute("data-mood"), "happy");
      assert.match(await page.locator(".bird-routine-reaction").getAttribute("src"), /bird-reaction-happy-branch-v3\.png$/);
      const roomBubble = readingBird.locator(".bird-routine-bubble");
      assert.equal(await roomBubble.count(), 1);
      assert.ok((await roomBubble.textContent())?.trim().length);
      assert.equal(await page.locator(".room-toast").count(), 0);
      await page.screenshot({ path: `${outputDir}/room-read-reaction-${viewport.width}x${viewport.height}.png` });
      for (let click = 0; click < 5; click += 1) await readingBird.click();
      assert.equal(await readingBird.getAttribute("data-mood"), "angry");
      assert.match(await page.locator(".bird-routine-reaction").getAttribute("src"), /bird-reaction-angry-branch-v3\.png$/);
      await page.waitForFunction(() => /安静|鼓起|生气/.test(document.querySelector(".bird-routine-bubble")?.textContent ?? ""));
      assert.match((await roomBubble.textContent()) ?? "", /安静|鼓起|生气/);
      await page.clock.runFor(7_900);
      assert.equal(await readingBird.getAttribute("data-mood"), "angry");
      await readingBird.click();
      await page.clock.runFor(7_900);
      assert.equal(await readingBird.getAttribute("data-mood"), "angry");
      assert.equal(await roomBubble.count(), 1);
      await page.clock.runFor(500);
      assert.equal(await readingBird.getAttribute("data-mood"), "calm");
      assert.equal(await roomBubble.count(), 0);

      const roomWriteStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "room", activity: "room-write", previousActivity: "room-read",
        activityStartedAt: roomWriteStartedAt, nextDecisionAt: roomWriteStartedAt + 20_000, sequenceStep: 2,
        roomSpot: "branch", flightFrom: null, flightTo: null, plannedActivity: null,
      });
      const writingFrame = page.locator('.bird-routine-sprite[data-activity="room-write"] .bird-routine-frame');
      const writingAnimation = await writingFrame.evaluate((element) => ({
        name: getComputedStyle(element).animationName,
        duration: getComputedStyle(element).animationDuration,
      }));
      assert.equal(writingAnimation.name, "room-write-long");
      assert.equal(writingAnimation.duration, reducedMotion === "reduce" ? "36s" : "12s");
      // Playwright's virtual wall clock advances app timers, not compositor CSS
      // time. Seek the actual CSS animation to inspect its long-held middle.
      await writingFrame.evaluate((element) => {
        const animation = element.getAnimations()[0];
        if (!animation) throw new Error("room writing animation is missing");
        animation.currentTime = 4_000;
      });
      const writingPosition = await writingFrame.evaluate((element) => getComputedStyle(element).backgroundPositionX);
      assert.match(writingPosition, /42\.857%|57\.143%|71\.429%|85\.714%/);
      await page.screenshot({ path: `${outputDir}/room-write-long-${viewport.width}x${viewport.height}.png` });

      const roomFlightStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "room", activity: "room-flight", previousActivity: "room-idle",
        activityStartedAt: roomFlightStartedAt, nextDecisionAt: roomFlightStartedAt + 5_000, sequenceStep: 1,
        roomSpot: "branch", flightFrom: "branch", flightTo: "bed", plannedActivity: "room-sleep",
      });
      const roomFlight = page.locator('.room-bird-routine[data-route="branch-bed"]');
      assert.equal(await roomFlight.getAttribute("data-flight-facing"), "left");
      assert.match(await roomFlight.locator(".bird-routine-asset-probe").getAttribute("src"), /room-flight-left\.png$/);
      const flightStart = await roomFlight.boundingBox();
      await page.clock.runFor(1_000);
      const flightMid = await roomFlight.boundingBox();
      if (reducedMotion !== "reduce") {
        assert.ok(flightStart && flightMid && flightMid.x < flightStart.x && flightMid.y < flightStart.y);
      }
      await page.screenshot({ path: `${outputDir}/room-flight-${viewport.width}x${viewport.height}.png` });
      await page.reload({ waitUntil: "networkidle" });
      const resumedRoomFlight = page.locator('.room-bird-routine[data-route="branch-bed"]');
      assert.ok(Number.parseInt(await resumedRoomFlight.evaluate((element) => element.style.getPropertyValue("--room-route-delay"))) <= -1_000);
      await page.clock.runFor(5_100);
      let game = await saved(page);
      assert.equal(game.bird.routine.activity, "room-sleep");
      assert.equal(game.bird.routine.roomSpot, "bed");
      assert.match(await page.locator(".bird-routine-asset-probe").getAttribute("src"), /room-sleep-side-v3\.png$/);
      const sleepBox = await page.locator('[data-hotspot="bird"]').boundingBox();
      assert.ok(sleepBox && roomBirdBox && Math.abs((sleepBox.width / 600) / (roomBirdBox.width / 540) - 1) < 0.06);
      const roomCanvasBox = await page.locator(".room-canvas").boundingBox();
      assert.ok(sleepBox && roomCanvasBox && sleepBox.x - roomCanvasBox.x > roomCanvasBox.width * 0.28);
      assert.ok(sleepBox && roomCanvasBox && sleepBox.y - roomCanvasBox.y < roomCanvasBox.height * 0.15);
      const sleepAnimationDuration = await page.locator(".bird-routine-frame").evaluate((element) => getComputedStyle(element).animationDuration);
      assert.equal(sleepAnimationDuration, reducedMotion === "reduce" ? "24s" : "8s");
      await page.screenshot({ path: `${outputDir}/room-sleep-calm-${viewport.width}x${viewport.height}.png` });
      const sleepingBird = page.locator('[data-hotspot="bird"]');
      await sleepingBird.click();
      assert.equal(await sleepingBird.getAttribute("data-mood"), "happy");
      assert.match(await page.locator(".bird-routine-reaction").getAttribute("src"), /room-sleep-look-side-v3\.png$/);
      for (let click = 0; click < 5; click += 1) await sleepingBird.click();
      assert.equal(await sleepingBird.getAttribute("data-mood"), "angry");
      assert.match(await page.locator(".bird-routine-reaction").getAttribute("src"), /room-sleep-angry-side-v3\.png$/);
      const sleepBubbleBox = await sleepingBird.locator(".bird-routine-bubble").boundingBox();
      assert.ok(sleepBubbleBox && sleepBubbleBox.x >= 0 && sleepBubbleBox.x + sleepBubbleBox.width <= viewport.width);
      await page.screenshot({ path: `${outputDir}/room-sleep-${viewport.width}x${viewport.height}.png` });
      await page.clock.runFor(8_400);
      assert.equal(await sleepingBird.getAttribute("data-mood"), "calm");

      game = await advanceToDecision(page);
      assert.equal(game.bird.routine.activity, "room-wake");
      game = await advanceToDecision(page);
      assert.equal(game.bird.routine.activity, "room-flight");
      assert.equal(game.bird.routine.flightFrom, "bed");
      assert.equal(game.bird.routine.flightTo, "branch");
      const returnFlight = page.locator('.room-bird-routine[data-route="bed-branch"]');
      assert.equal(await returnFlight.getAttribute("data-flight-facing"), "right");
      assert.match(await returnFlight.locator(".bird-routine-asset-probe").getAttribute("src"), /room-flight-right\.png$/);
      const flightToLanding = await saved(page);
      await page.clock.runFor(Math.max(0, flightToLanding.bird.routine.nextDecisionAt - await page.evaluate(() => Date.now())) + 600);
      game = await saved(page);
      assert.equal(game.bird.routine.activity, "room-land");
      assert.equal(game.bird.routine.roomSpot, "branch");
      assert.match(await page.locator(".bird-routine-asset-probe").getAttribute("src"), /room-land-branch-v1\.png$/);
      await page.screenshot({ path: `${outputDir}/room-land-duang-${viewport.width}x${viewport.height}.png` });
      const landingSequenceStep = game.bird.routine.sequenceStep;
      await page.reload({ waitUntil: "networkidle" });
      game = await saved(page);
      assert.equal(game.bird.routine.roomSpot, "branch");
      assert.ok(game.bird.routine.sequenceStep >= landingSequenceStep);
      assert.ok(["room-land", "room-idle"].includes(game.bird.routine.activity));
      if (game.bird.routine.activity === "room-land") game = await advanceToDecision(page);
      assert.equal(game.bird.routine.activity, "room-idle");
      const initialRoutine = game.bird.routine;

      const roomLeaveStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "room", activity: "room-leave", previousActivity: "room-ruffle",
        activityStartedAt: roomLeaveStartedAt, nextDecisionAt: roomLeaveStartedAt + 5_000, sequenceStep: 8,
        roomSpot: "branch", flightFrom: "branch", flightTo: "trunk", plannedActivity: "garden-arrive",
      });
      const roomLeave = page.locator('.room-bird-routine[data-route="branch-trunk"]');
      assert.equal(await roomLeave.count(), 1);
      assert.equal(await roomLeave.getAttribute("data-flight-facing"), "right");
      assert.match(await roomLeave.locator(".bird-routine-asset-probe").getAttribute("src"), /room-flight-right\.png$/);
      assert.equal(await page.locator(".room-trunk-occluder").count(), 1);
      await page.clock.runFor(3_500);
      await page.screenshot({ path: `${outputDir}/room-trunk-exit-${viewport.width}x${viewport.height}.png` });

      await replaceRoutine(page, initialRoutine);

      await page.locator('[data-hotspot="exit"]').click();
      assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 0);
      await page.locator('[data-garden-hotspot="entrance"]').click();
      assert.deepEqual((await saved(page)).bird.routine, initialRoutine);

      let routeStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "garden", activity: "garden-arrive", previousActivity: "room-leave",
        activityStartedAt: routeStartedAt, nextDecisionAt: routeStartedAt + 8_000, sequenceStep: 2,
        gardenSpot: "door-inside", walkFrom: null, walkTo: null, plannedActivity: null,
      });
      await page.locator('[data-hotspot="exit"]').click();
      const doorArrival = page.locator('.garden-bird-routine[data-route="door-hidden-door"]');
      assert.equal(await doorArrival.count(), 1);
      assert.equal(await doorArrival.getAttribute("data-walk-facing"), "left");
      assert.match(await doorArrival.locator(".bird-routine-asset-probe").getAttribute("src"), /garden-walk-left-v3\.png$/);
      assert.equal(await doorArrival.evaluate((element) => element.style.getPropertyValue("--garden-route-x-0")), "104%");
      assert.equal(await doorArrival.evaluate((element) => element.style.getPropertyValue("--garden-route-x-1")), "99.2%");
      assert.equal(await page.locator(".garden-door-occluder").count(), 1);
      await page.clock.runFor(2_400);
      await page.screenshot({ path: `${outputDir}/garden-door-entry-${viewport.width}x${viewport.height}.png` });

      routeStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "garden", activity: "garden-walk", previousActivity: "garden-arrive",
        activityStartedAt: routeStartedAt, nextDecisionAt: routeStartedAt + 28_000, sequenceStep: 3,
        gardenSpot: "door", walkFrom: "door", walkTo: "soil", plannedActivity: "garden-water-pickup",
      });
      await page.locator('[data-hotspot="exit"]').click();
      game = await saved(page);
      assert.equal(game.bird.routine.activity, "garden-walk");
      assert.equal(game.bird.routine.previousActivity, "garden-arrive");
      const entryWalk = page.locator('.garden-bird-routine[data-route="door-soil"]');
      assert.equal(await entryWalk.count(), 1);
      assert.equal(await entryWalk.getAttribute("data-walk-facing"), "left");
      assert.match(await entryWalk.locator(".bird-routine-asset-probe").getAttribute("src"), /garden-walk-left-v3\.png$/);
      const walkCadence = await entryWalk.evaluate((element) => ({
        route: getComputedStyle(element).animationTimingFunction,
        routeDuration: getComputedStyle(element).animationDuration,
        routeFill: getComputedStyle(element).animationFillMode,
        routeIterations: getComputedStyle(element).animationIterationCount,
        routeDelay: getComputedStyle(element).animationDelay,
        frameDuration: getComputedStyle(element.querySelector(".bird-routine-frame")).animationDuration,
        frameDelay: getComputedStyle(element.querySelector(".bird-routine-frame")).animationDelay,
        frameFill: getComputedStyle(element.querySelector(".bird-routine-frame")).animationFillMode,
        frameIterations: getComputedStyle(element.querySelector(".bird-routine-frame")).animationIterationCount,
        cycleCount: element.style.getPropertyValue("--garden-route-cycle-count"),
      }));
      if (reducedMotion !== "reduce") {
        assert.match(walkCadence.route, /steps\(224/);
        assert.equal(walkCadence.routeDuration, "28s");
        assert.equal(walkCadence.routeFill, "both");
        assert.equal(walkCadence.routeIterations, "1");
        assert.equal(walkCadence.frameDuration, "2s");
        assert.equal(walkCadence.frameDelay, walkCadence.routeDelay);
        assert.equal(walkCadence.frameFill, "both");
        assert.equal(walkCadence.frameIterations, "14");
      }
      assert.equal(walkCadence.cycleCount, "14");
      const entryStart = await entryWalk.boundingBox();
      await page.clock.runFor(1_000);
      const entryMid = await entryWalk.boundingBox();
      if (reducedMotion !== "reduce") {
        assert.ok(entryStart && entryMid && entryMid.x < entryStart.x && entryMid.y > entryStart.y);
      }
      await page.screenshot({ path: `${outputDir}/garden-walk-grounded-${viewport.width}x${viewport.height}.png` });
      const elapsedDelay = await entryWalk.evaluate((element) => element.style.getPropertyValue("--garden-route-delay"));
      assert.match(elapsedDelay, /^-\d+ms$/);
      await page.reload({ waitUntil: "networkidle" });
      await page.locator('[data-hotspot="exit"]').click();
      const resumedWalk = page.locator('.garden-bird-routine[data-route="door-soil"]');
      assert.equal(await resumedWalk.count(), 1);
      assert.ok(Number.parseInt(await resumedWalk.evaluate((element) => element.style.getPropertyValue("--garden-route-delay"))) <= -1_000);
      await page.clock.runFor(27_100);
      game = await saved(page);
      assert.equal(game.bird.routine.activity, "garden-water-pickup");
      const gardenBirdBox = await page.locator('[data-garden-hotspot="bird"]').boundingBox();
      assert.ok(gardenBirdBox && roomBirdBox && Math.abs((gardenBirdBox.width / 540) / (roomBirdBox.width / 540) - 1) < 0.06);
      const pickupFootY = gardenBirdBox.y + gardenBirdBox.height * gardenFootRatio;

      game = await advanceToDecision(page);
      assert.equal(game.bird.routine.activity, "garden-water-pour");
      assert.match(await page.locator(".bird-routine-asset-probe").getAttribute("src"), /garden-water-pour-v3\.png$/);
      const pourBirdBox = await page.locator('[data-garden-hotspot="bird"]').boundingBox();
      assert.ok(pourBirdBox);
      assert.ok(Math.abs(pourBirdBox.width / gardenBirdBox.width - 1.13) < 0.02);
      assert.ok(Math.abs(pourBirdBox.y + pourBirdBox.height * gardenFootRatio - pickupFootY) < 1);
      const beforeClick = game.bird.routine;
      const gardenViewport = page.locator(".garden-viewport");
      await gardenViewport.evaluate((element) => { element.scrollLeft = 0; });
      const gardenBird = page.locator('[data-garden-hotspot="bird"]');
      assert.equal(await gardenBird.getAttribute("data-interaction-locked"), "true");
      assert.equal(await gardenBird.locator("xpath=..").getAttribute("data-water-target"), "plot-1");
      await page.screenshot({ path: `${outputDir}/garden-water-action-${viewport.width}x${viewport.height}.png` });
      await gardenBird.click();
      assert.deepEqual((await saved(page)).bird.routine, beforeClick);
      assert.equal(await gardenBird.evaluate((element) => element.classList.contains("is-responding")), false);
      const gardenBubble = gardenBird.locator(".bird-routine-bubble");
      await gardenBubble.waitFor();
      assert.ok((await gardenBubble.textContent())?.trim().length);
      assert.equal(await page.locator(".room-toast").count(), 0);

      game = await advanceToDecision(page);
      assert.equal(game.bird.routine.activity, "garden-water-putdown");
      const putdownBirdBox = await page.locator('[data-garden-hotspot="bird"]').boundingBox();
      assert.ok(putdownBirdBox);
      assert.ok(Math.abs(putdownBirdBox.width / gardenBirdBox.width - 1) < 0.01);
      assert.ok(Math.abs(putdownBirdBox.y + putdownBirdBox.height * gardenFootRatio - pickupFootY) < 1);
      game = await advanceToDecision(page);
      assert.equal(game.bird.routine.activity, "garden-walk");
      assert.equal(game.bird.routine.walkFrom, "soil");
      assert.equal(game.bird.routine.walkTo, "door");
      const returnWalk = page.locator('.garden-bird-routine[data-route="soil-door"]');
      assert.equal(await returnWalk.getAttribute("data-walk-facing"), "right");
      assert.match(await returnWalk.locator(".bird-routine-asset-probe").getAttribute("src"), /garden-walk-right-v3\.png$/);

      assert.equal(await page.locator('.garden-background[src$="background-away.png"]').count(), 1);
      await page.screenshot({ path: `${outputDir}/garden-water-${viewport.width}x${viewport.height}.png` });

      const beforeReload = (await saved(page)).bird.routine;
      await page.reload({ waitUntil: "networkidle" });
      const afterReload = (await saved(page)).bird.routine;
      assert.equal(afterReload.location, "garden");
      assert.ok(afterReload.sequenceStep >= beforeReload.sequenceStep);
      await page.locator('[data-hotspot="exit"]').click();
      await page.locator(".garden-viewport").evaluate((element) => { element.scrollLeft = 0; });
      const afterNavigation = (await saved(page)).bird.routine;
      assert.equal(afterNavigation.location, "garden");
      assert.ok(afterNavigation.sequenceStep >= afterReload.sequenceStep);
      assert.equal(await page.locator(`[data-activity="${afterNavigation.activity}"]`).count(), 1);

      const dimensions = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      assert.equal(dimensions.documentWidth, dimensions.viewportWidth);
      const birdBox = await page.locator('[data-garden-hotspot="bird"]').boundingBox();
      assert.ok(birdBox && birdBox.width > 44 && birdBox.height > 44);

      const forageStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "garden", activity: "garden-forage", previousActivity: "garden-walk",
        activityStartedAt: forageStartedAt, nextDecisionAt: forageStartedAt + 18_000, sequenceStep: 18,
        gardenSpot: "forage", walkFrom: null, walkTo: null, plannedActivity: null,
      });
      await page.locator('[data-hotspot="exit"]').click();
      const forageBox = await page.locator('[data-garden-hotspot="bird"]').boundingBox();
      const gardenCanvasBox = await page.locator(".garden-canvas").boundingBox();
      const waterStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "garden", activity: "garden-water-pour", previousActivity: "garden-water-pickup",
        activityStartedAt: waterStartedAt, nextDecisionAt: waterStartedAt + 4_000, sequenceStep: 19,
        gardenSpot: "soil", walkFrom: null, walkTo: null, plannedActivity: null,
      });
      await page.locator('[data-hotspot="exit"]').click();
      const waterBox = await page.locator('[data-garden-hotspot="bird"]').boundingBox();
      assert.ok(forageBox && waterBox && gardenCanvasBox && Math.abs(forageBox.x - waterBox.x) >= gardenCanvasBox.width * 0.08);
      assert.match(await page.locator(".bird-routine-asset-probe").getAttribute("src"), /garden-water-pour-v3\.png$/);

      const sunStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "garden", activity: "garden-sunbathe", previousActivity: "garden-walk",
        activityStartedAt: sunStartedAt, nextDecisionAt: sunStartedAt + 18_000, sequenceStep: 19,
        gardenSpot: "sun", walkFrom: null, walkTo: null, plannedActivity: null,
      });
      await page.locator('[data-hotspot="exit"]').click();
      const sunBird = page.locator('[data-garden-hotspot="bird"]');
      const sunStartBox = await sunBird.boundingBox();
      const sunDuration = await sunBird.locator(".bird-routine-frame").evaluate((element) => getComputedStyle(element).animationDuration);
      assert.equal(sunDuration, reducedMotion === "reduce" ? "24s" : "8s");
      await page.clock.runFor(2_000);
      const sunLaterBox = await sunBird.boundingBox();
      assert.ok(sunStartBox && sunLaterBox && Math.abs(sunStartBox.width - sunLaterBox.width) / sunStartBox.width < 0.03);
      await page.screenshot({ path: `${outputDir}/garden-sun-calm-${viewport.width}x${viewport.height}.png` });

      const calmStartedAt = await page.evaluate(() => Date.now());
      await replaceRoutine(page, {
        location: "garden", activity: "garden-preen", previousActivity: "garden-walk",
        activityStartedAt: calmStartedAt, nextDecisionAt: calmStartedAt + 30_000, sequenceStep: 20,
        gardenSpot: "sun", walkFrom: null, walkTo: null, plannedActivity: null,
      });
      await page.locator('[data-hotspot="exit"]').click();
      assert.match(await page.locator(".bird-routine-asset-probe").getAttribute("src"), /garden-preen-v2\.png$/);
      const interactiveBird = page.locator('[data-garden-hotspot="bird"]');
      const preenStartBox = await interactiveBird.boundingBox();
      await page.clock.runFor(1_200);
      const preenLaterBox = await interactiveBird.boundingBox();
      assert.ok(preenStartBox && preenLaterBox && Math.abs(preenStartBox.y - preenLaterBox.y) < 1);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal((await saved(page)).bird.routine.activity, "garden-preen");
      await page.locator('[data-hotspot="exit"]').click();
      await page.screenshot({ path: `${outputDir}/garden-preen-natural-${viewport.width}x${viewport.height}.png` });
      await interactiveBird.click();
      assert.equal(await interactiveBird.getAttribute("data-mood"), "happy");
      assert.match(await page.locator(".bird-routine-reaction").getAttribute("src"), /bird-reaction-happy-v2\.png$/);
      for (let click = 0; click < 5; click += 1) await interactiveBird.click();
      assert.equal(await interactiveBird.getAttribute("data-mood"), "angry");
      assert.match(await page.locator(".bird-routine-reaction").getAttribute("src"), /bird-reaction-angry-v2\.png$/);
      await page.clock.runFor(8_400);
      assert.equal(await interactiveBird.getAttribute("data-mood"), "calm");
      const framePlayback = await page.locator(".bird-routine-frame").evaluate((element) => ({
        name: getComputedStyle(element).animationName,
        duration: getComputedStyle(element).animationDuration,
        timing: getComputedStyle(element).animationTimingFunction,
        position: getComputedStyle(element).backgroundPositionX,
      }));
      assert.equal(framePlayback.name, "garden-preen-sustained");
      assert.equal(framePlayback.duration, reducedMotion === "reduce" ? "14.4s" : "4.8s");
      assert.match(framePlayback.timing, /steps\(1/);
      const preenDurationMs = reducedMotion === "reduce" ? 14_400 : 4_800;
      const preenPositions = await page.locator(".bird-routine-frame").evaluate((element, duration) => {
        const animation = element.getAnimations()[0];
        if (!animation) throw new Error("garden preen animation is missing");
        return [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((progress) => {
          animation.currentTime = duration * progress;
          return Number.parseFloat(getComputedStyle(element).backgroundPositionX);
        });
      }, preenDurationMs);
      const neutralPreenFrames = [0, 21.739, 52.174, 91.304, 95.652, 100];
      assert.ok(preenPositions.every((position) => Number.isFinite(position)));
      assert.ok(preenPositions.every((position) => neutralPreenFrames.every((neutral) => Math.abs(position - neutral) > 0.5)));

      await page.evaluate(async (key) => {
        const { exportSave, importSave, prepareTravel, setBagDestination, setBagFood } = await import("/src/domain/game.ts");
        const parsed = importSave(localStorage.getItem(key));
        if (!parsed.ok) throw new Error(parsed.error);
        let game = parsed.game;
        game.inventory.foods["strawberry-cloud-bun"] = 1;
        game = setBagDestination(game, "wind_field", Date.now());
        game = setBagFood(game, "strawberry-cloud-bun", Date.now());
        game = prepareTravel(game, Date.now(), () => 0);
        localStorage.setItem(key, exportSave(game));
      }, saveKey);
      await page.reload({ waitUntil: "networkidle" });
      assert.equal((await saved(page)).travel.status, "ready");
      assert.equal(await page.locator('[data-hotspot="bird"]').count(), 0);
      await page.locator('[data-hotspot="exit"]').click();
      assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 1);

      const ready = await saved(page);
      await page.clock.runFor(ready.travel.plannedDepartureAt - await page.evaluate(() => Date.now()) + 1_600);
      assert.equal((await saved(page)).travel.status, "travelling");
      assert.equal(await page.locator('[data-garden-hotspot="bird"]').count(), 0);
      await page.locator('[data-garden-hotspot="entrance"]').click();
      assert.equal(await page.locator('[data-hotspot="bird"]').count(), 0);

      const away = await saved(page);
      await page.clock.runFor(away.travel.plannedReturnAt - await page.evaluate(() => Date.now()) + 1_600);
      await page.getByRole("status").filter({ hasText: "小鸟回来了" }).waitFor();
      const returned = await saved(page);
      assert.equal(returned.travel.status, "returned");
      assert.equal(returned.bird.routine.location, "room");
      assert.equal(await page.locator('[data-activity="room-idle"]').count(), 1);

      if (reducedMotion === "reduce") {
        const animationName = await page.locator(".bird-routine-frame").evaluate((element) => getComputedStyle(element).animationName);
        assert.match(animationName, /bird-routine/);
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: autonomous room→garden routine, persistence, click response, travel hide/return${reducedMotion === "reduce" ? ", reduced motion" : ""}`);
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
  console.log("PASS all bird routine browser acceptance checks");
}
