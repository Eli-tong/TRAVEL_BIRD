import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const out = process.env.VISUAL_REPAIR_OUT ?? "output/visual-repair";
const baseUrl = process.env.VISUAL_REPAIR_BASE_URL ?? "http://127.0.0.1:5175/";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [width, height, name] of [[320, 568, "room-320x568"], [390, 844, "room-390x844"], [1440, 1000, "room-1440x1000"]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  await page.locator('button[aria-label*="轻轻招呼"]').click();
  await page.screenshot({ path: `${out}/${name}-after-interaction.png`, fullPage: false });
  await page.locator('button[aria-label="打开菜单"]').click();
  await page.getByRole("button", { name: "相册", exact: true }).click();
  await page.getByRole("button", { name: "预览第一张明信片", exact: true }).click();
  await page.locator('.postcard-front img').waitFor({ state: 'visible' });
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${out}/postcard-front-${width}x${height}.png`, fullPage: false });
  await page.close();
}
await browser.close();
