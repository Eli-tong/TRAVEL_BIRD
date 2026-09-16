import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const url = process.argv[2] || 'http://127.0.0.1:5175';
const out = 'output/playwright/food-postcard';
await mkdir(out, { recursive: true });
const key = 'travel-bird-save-v1';
const ids = ['strawberry-cloud-bun', 'carrot-crescent-crisp', 'tricolor-travel-bites'];
const names = ['草莓云朵麦包', '胡萝卜月牙脆饼', '三色旅行小团子'];
const old = {
  version: 1, createdAt: 1700000000000, updatedAt: 1700000000000, bird: { name: '小蓝' },
  inventory: { seeds: { wheat: 3, carrot: 2, strawberry: 1 }, materials: { wheat: 3, carrot: 2, strawberry: 2 }, foods: { bread: 2, carrot_cake: 3, strawberry_bento: 4 } },
  plots: ['plot-1', 'plot-2', 'plot-3'].map(id => ({ id, cropId: null, plantedAt: null, readyAt: null })),
  cooking: null, unlocked: { crops: ['wheat', 'carrot', 'strawberry'], recipes: ['bread', 'carrot_cake', 'strawberry_bento'], destinations: ['wind_field'] },
  bag: { foodId: 'bread' }, currentJourney: null, album: { collected: [] }, travelLog: [], settings: { mode: 'demo', seenIntro: true }, coins: 137,
};
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], badResponses = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) badResponses.push([r.status(), r.url()]); });
const record = (name, details = true) => { checks.push({ name, details }); console.log('PASS', name); };
const save = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const raw = () => page.evaluate(k => localStorage.getItem(k), key);
const settleVisual = async () => {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  await page.waitForTimeout(280);
};
const capture = async name => { await settleVisual(); await page.screenshot({ path: `${out}/${name}.png` }); };
const close = async () => { await page.getByRole('button', { name: '关闭弹层' }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); };
const openPreview = async () => {
  await page.getByRole('button', { name: '打开菜单', exact: true }).click();
  await page.getByRole('button', { name: /^(相册|Postcard album)$/ }).click();
  await page.getByRole('button', { name: /^(预览第一张明信片|Preview the first postcard)$/ }).click();
};
try {
  await page.goto(url);
  // Isolated browser context only: seed an actual old-format save, then reload.
  await page.evaluate(({ key, old }) => localStorage.setItem(key, JSON.stringify(old)), { key, old });
  await page.reload();
  await page.getByRole('button', { name: '打开行囊', exact: true }).waitFor();
  const migrated = await save();
  assert.deepEqual(migrated.inventory.foods, Object.fromEntries(ids.map((id, i) => [id, i + 2])));
  assert.equal(migrated.bag.foodId, ids[0]); assert.equal(migrated.coins, 137);
  assert.equal(migrated.foodMigration.originalRaw, JSON.stringify(old));
  record('old save migrates quantities and selected food; original backup retained');
  await capture('room');
  await page.getByRole('button', { name: '打开料理台', exact: true }).click();
  assert.equal(await page.locator('.room-recipe-row').count(), 3);
  await capture('kitchen');
  for (let i = 0; i < ids.length; i++) {
    const before = await save();
    const recipe = page.locator('.room-recipe-row').filter({ has: page.getByRole('heading', { name: names[i], exact: true }) });
    const cook = recipe.getByRole('button', { name: '制作', exact: true });
    assert.equal(await cook.isEnabled(), true);
    await cook.click();
    const cooking = await save();
    assert.equal(cooking.inventory.materials.wheat, before.inventory.materials.wheat - 1);
    assert.equal(cooking.inventory.materials.carrot, before.inventory.materials.carrot - (i === 0 ? 0 : 1));
    assert.equal(cooking.inventory.materials.strawberry, before.inventory.materials.strawberry - (i === 1 ? 0 : 1));
    assert.equal(await cook.isDisabled(), true);
    await page.getByRole('button', { name: '领取食物', exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '领取食物' && !b.disabled));
    await page.getByRole('button', { name: '领取食物', exact: true }).click();
    const claimed = await save();
    assert.deepEqual(claimed.inventory.materials, cooking.inventory.materials);
    assert.equal(claimed.inventory.foods[ids[i]], before.inventory.foods[ids[i]] + 1);
    assert.equal(claimed.coins, 137);
  }
  assert.equal(await page.locator('.room-recipe-row button:not(:disabled)').count(), 0);
  record('all three recipes debit ingredients once, claim actual foods, preserve currency, reject insufficient ingredients');
  await close();
  await page.getByRole('button', { name: '打开行囊', exact: true }).click();
  for (let i = 0; i < ids.length; i++) {
    await page.locator('.room-food-list button').nth(i).click();
    assert.equal((await save()).bag.foodId, ids[i]);
  }
  await capture('bag');
  const packed = await raw();
  await close(); await page.reload();
  await page.getByRole('button', { name: '打开菜单' }).waitFor();
  assert.equal(await raw(), packed);
  record('bag reads real inventory, selects all three foods and survives refresh without departure');
  await page.getByRole('button', { name: '打开储物柜', exact: true }).click();
  await capture('inventory'); await close();
  await openPreview();
  const beforePreview = await raw();
  await capture('postcard-front');
  await page.locator('.postcard-front').screenshot({ path: `${out}/postcard-front-card.png` });
  await page.getByRole('button', { name: '翻到背面', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.postcard-back').count(), 1);
  assert.equal(await page.locator('.postcard-signature').innerText(), '——小蓝');
  await capture('postcard-back-zh');
  await page.locator('.postcard-back').screenshot({ path: `${out}/postcard-back-zh-card.png` });
  await page.getByRole('button', { name: 'English', exact: true }).click();
  assert.ok((await page.locator('.postcard-message').innerText()).includes('I’ve already remembered the way home.'));
  await capture('postcard-back-en');
  await page.locator('.postcard-back').screenshot({ path: `${out}/postcard-back-en-card.png` });
  record('front/back keyboard flip, Chinese/English bodies and snapshot signature');
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Turn to the front', exact: true }).click();
    await capture(`postcard-front-${viewport.width}x${viewport.height}`);
    await page.getByRole('button', { name: 'Turn to the back', exact: true }).click();
    await capture(`postcard-back-en-${viewport.width}x${viewport.height}`);
    await page.locator('.postcard-back').screenshot({ path: `${out}/postcard-back-en-${viewport.width}-full-card.png` });
    for (const language of ['en', 'zh']) {
      if (language === 'zh') await page.getByRole('button', { name: '中文', exact: true }).click();
      const layout = await page.evaluate(() => {
        const card = document.querySelector('.postcard-back'), dialog = document.querySelector('[role="dialog"]');
        const d = dialog.getBoundingClientRect();
        return { documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, cardWidth: card.clientWidth, cardScrollWidth: card.scrollWidth, cardHeight: card.clientHeight, cardScrollHeight: card.scrollHeight, dialog: { x: d.x, y: d.y, right: d.right, bottom: d.bottom }, transforms: [...document.querySelectorAll('.postcard-message, .postcard-address')].map(e => getComputedStyle(e).transform), animation: getComputedStyle(card).animationName };
      });
      assert.equal(layout.documentWidth, viewport.width);
      assert.ok(layout.cardScrollWidth <= layout.cardWidth + 1); assert.ok(layout.cardScrollHeight <= layout.cardHeight + 1);
      assert.ok(layout.dialog.x >= 0 && layout.dialog.right <= viewport.width && layout.dialog.y >= 0 && layout.dialog.bottom <= viewport.height);
      assert.deepEqual(layout.transforms, ['none', 'none']); assert.equal(layout.animation, 'none');
      record(`mobile ${viewport.width} ${language}: no overflow/clipped card/mirrored text; reduced motion`, layout);
    }
    await capture(`postcard-back-zh-${viewport.width}x${viewport.height}`);
    await page.getByRole('button', { name: 'English', exact: true }).click();
  }
  assert.equal(await raw(), beforePreview);
  record('all preview operations leave the entire serialized save byte-for-byte unchanged');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').getByText('内测预览', { exact: true }).waitFor();
  assert.equal((await save()).album.collected.length, 0); assert.equal((await save()).currentJourney, null);
  await close();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.getByRole('button', { name: '打开菜单' }).click();
  await page.getByRole('button', { name: '设置与存档', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click(); await close();
  await page.getByRole('button', { name: '打开料理台' }).click();
  for (const name of ['Strawberry Cloud Bun', 'Carrot Crescent Crisp', 'Three-Color Travel Bites']) assert.equal(await page.getByRole('heading', { name, exact: true }).count(), 1);
  await capture('kitchen-en'); await close();
  await page.reload(); assert.equal((await save()).settings.language, 'en');
  record('food names/descriptions switch through saved language setting');
  // New player empty state, in a separate tab/context: no existing player data reset.
  const emptyContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const empty = await emptyContext.newPage(); await empty.goto(url);
  await empty.getByRole('button', { name: '打开行囊' }).click();
  assert.ok((await empty.getByRole('dialog').innerText()).includes('柜中还没有做好的食物'));
  assert.equal(await empty.locator('.room-food-list button:not(:disabled)').count(), 0);
  await empty.screenshot({ path: `${out}/bag-empty.png` }); await emptyContext.close();
  record('new player bag has a real empty state and no selectable foods');
  assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
  record('no browser exceptions or failed HTTP resource loads');
} finally {
  await writeFile(`${out}/browser-checks.json`, JSON.stringify({ url, checks, errors, badResponses }, null, 2));
  await browser.close();
}
