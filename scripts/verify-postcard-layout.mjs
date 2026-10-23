import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.POSTCARD_BASE_URL ?? "http://127.0.0.1:5173/";
const outputDir = "output/postcard-layout";
const language = process.env.POSTCARD_LANGUAGE === "en" ? "en" : "zh-CN";
const copyVariant = process.env.POSTCARD_COPY_VARIANT === "short" ? "short" : "long";
const labels = language === "en"
  ? { menu: "Open menu", album: "Postcard album", postcard: copyVariant === "short" ? "Morning Windmill" : "Dandelion Breeze Hill", flip: "Turn to the back" }
  : { menu: "打开菜单", album: "相册", postcard: copyVariant === "short" ? "晨风风车" : "蒲公英风坡", flip: "翻到背面" };
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 }
];

const now = Date.UTC(2026, 8, 13, 12);
const savedGame = {
  version: 1,
  createdAt: now,
  updatedAt: now,
  bird: { name: "啾啾" },
  inventory: {
    seeds: { wheat: 3, carrot: 0, strawberry: 0 },
    materials: { wheat: 2, carrot: 0, strawberry: 1 },
    foods: { "strawberry-cloud-bun": 0, "carrot-crescent-crisp": 0, "tricolor-travel-bites": 0 }
  },
  plots: ["plot-1", "plot-2", "plot-3"].map((id) => ({ id, cropId: null, plantedAt: null, readyAt: null })),
  cooking: null,
  unlocked: { crops: ["wheat"], recipes: ["strawberry-cloud-bun"], destinations: ["wind_field"] },
  bag: { foodId: null, destinationId: null },
  currentJourney: null,
  album: {
    collected: [{
      postcardId: "first-dandelion-hill-selfie",
      firstCollectedAt: now,
      firstJourneyId: "layout-check-trip",
      firstStory: "",
      birdNameSnapshot: "啾啾",
      birdVariant: "blue-quaker",
      travelDate: now
    }, {
      postcardId: "wind_field_01",
      firstCollectedAt: now,
      firstJourneyId: "short-layout-check-trip",
      firstStory: "",
      birdNameSnapshot: "啾啾"
    }]
  },
  travelLog: [],
  settings: { language, mode: "demo", seenIntro: true }
};

const contains = (outer, inner, tolerance = 1) =>
  inner.x >= outer.x - tolerance
  && inner.y >= outer.y - tolerance
  && inner.x + inner.width <= outer.x + outer.width + tolerance
  && inner.y + inner.height <= outer.y + outer.height + tolerance;

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ["travel-bird-save-v1", JSON.stringify(savedGame)]);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: labels.menu }).click();
  await page.getByRole("button", { name: labels.album, exact: true }).click();
  await page.getByRole("button", { name: labels.postcard, exact: true }).click();
  await page.locator(".postcard-front").waitFor({ state: "visible" });
  await page.waitForTimeout(280);

  const frontHasOverlay = await page.locator(".postcard-front .postcard-location-tag").count();
  if (frontHasOverlay !== 0) failures.push(`${viewport.width}: location title overlays the front artwork`);
  await page.screenshot({ path: `${outputDir}/front-${language}-${viewport.width}x${viewport.height}.png`, fullPage: false });

  await page.getByRole("button", { name: labels.flip }).click();
  await page.locator(".postcard-back").waitFor({ state: "visible" });
  await page.waitForTimeout(280);

  const metrics = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect) throw new Error(`Missing ${selector}`);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const modal = document.querySelector(".postcard-viewer-modal");
    const body = document.querySelector(".postcard-viewer-modal .modal-body");
    const back = document.querySelector(".postcard-back");
    const address = document.querySelector(".postcard-address");
    const stamp = document.querySelector(".postcard-mobile-stamp");
    if (!modal || !body || !back || !address) throw new Error("Postcard layout is incomplete");
    return {
      bodyOverflow: getComputedStyle(document.body).overflow,
      modalOverflow: getComputedStyle(modal).overflowY,
      modalScrolls: modal.scrollHeight > modal.clientHeight + 1,
      bodyScrolls: body.scrollHeight > body.clientHeight + 1,
      cardScrolls: back.scrollHeight > back.clientHeight + 1 || back.scrollWidth > back.clientWidth + 1,
      backgroundSize: getComputedStyle(back).backgroundSize,
      dividerWidth: getComputedStyle(address).borderTopWidth,
      stampDisplay: stamp ? getComputedStyle(stamp).display : "missing",
      card: box(".postcard-back"),
      message: box(".postcard-message"),
      address: box(".postcard-address"),
      stamp: stamp ? box(".postcard-mobile-stamp") : null
    };
  });

  if (metrics.bodyOverflow !== "hidden") failures.push(`${viewport.width}: page body is not scroll-locked`);
  if (metrics.modalOverflow !== "hidden") failures.push(`${viewport.width}: postcard dialog overflow is not constrained`);
  if (metrics.modalScrolls || metrics.bodyScrolls) failures.push(`${viewport.width}: postcard dialog needs vertical scrolling`);
  if (metrics.cardScrolls) failures.push(`${viewport.width}: postcard content overflows its card`);
  if (metrics.backgroundSize !== "200% 100%") failures.push(`${viewport.width}: desktop center line remains in the mobile paper background`);
  if (metrics.dividerWidth === "0px") failures.push(`${viewport.width}: mobile information area has no horizontal divider`);
  if (metrics.stampDisplay === "missing" || metrics.stampDisplay === "none") failures.push(`${viewport.width}: mobile stamp is not in the information area`);
  if (!contains(metrics.card, metrics.message)) failures.push(`${viewport.width}: message escapes postcard bounds`);
  if (!contains(metrics.card, metrics.address)) failures.push(`${viewport.width}: address escapes postcard bounds`);
  if (metrics.stamp && !contains(metrics.address, metrics.stamp)) failures.push(`${viewport.width}: stamp escapes mobile information area`);
  if (metrics.card.y < 0 || metrics.card.y + metrics.card.height > viewport.height) failures.push(`${viewport.width}: postcard back escapes the viewport`);

  await page.screenshot({ path: `${outputDir}/back-${language}-${copyVariant}-${viewport.width}x${viewport.height}.png`, fullPage: false });
  await page.close();
}

const desktopViewport = { width: 1024, height: 768 };
const desktopPage = await browser.newPage({ viewport: desktopViewport });
await desktopPage.addInitScript(([key, value]) => localStorage.setItem(key, value), ["travel-bird-save-v1", JSON.stringify(savedGame)]);
await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
await desktopPage.getByRole("button", { name: labels.menu }).click();
await desktopPage.getByRole("button", { name: labels.album, exact: true }).click();
await desktopPage.getByRole("button", { name: labels.postcard, exact: true }).click();
await desktopPage.getByRole("button", { name: labels.flip }).click();
await desktopPage.locator(".postcard-back").waitFor({ state: "visible" });
await desktopPage.waitForTimeout(280);
const desktopMetrics = await desktopPage.evaluate(() => {
  const back = document.querySelector(".postcard-back");
  const address = document.querySelector(".postcard-address");
  const stamp = document.querySelector(".postcard-mobile-stamp");
  if (!back || !address || !stamp) throw new Error("Desktop postcard layout is incomplete");
  const rect = back.getBoundingClientRect();
  return {
    aspectIsLandscape: rect.width > rect.height,
    columns: getComputedStyle(back).gridTemplateColumns.split(" ").filter(Boolean).length,
    backgroundSize: getComputedStyle(back).backgroundSize,
    dividerWidth: getComputedStyle(address).borderTopWidth,
    stampDisplay: getComputedStyle(stamp).display
  };
});
if (!desktopMetrics.aspectIsLandscape || desktopMetrics.columns !== 2) failures.push("1024: desktop postcard no longer uses the landscape two-column layout");
if (desktopMetrics.backgroundSize !== "100% 100%") failures.push("1024: desktop postcard paper treatment changed");
if (desktopMetrics.dividerWidth !== "0px") failures.push("1024: mobile horizontal divider leaked into desktop");
if (desktopMetrics.stampDisplay !== "none") failures.push("1024: mobile stamp leaked into desktop");
await desktopPage.screenshot({ path: `${outputDir}/back-${language}-${copyVariant}-1024x768.png`, fullPage: false });
await desktopPage.close();

await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Postcard layout (${language}, ${copyVariant}) passed at ${viewports.map(({ width }) => width).join(" / ")} px.`);
}
