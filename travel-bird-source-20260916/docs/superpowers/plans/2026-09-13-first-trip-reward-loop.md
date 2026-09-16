# 第一次旅行与奖励闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 v1 游戏与存档上打通“选择目的地和食物 → 出发 → 归来 → 一次性领取首张明信片与新种子”的第一次旅行闭环。

**Architecture:** 保留 `travel-bird-save-v1`、现有 `GameState.currentJourney` 和种植/烹饪接口；给行囊补上目的地选择，并用纯领域函数从 `bag + currentJourney + now` 推导 `home / preparing / travelling / returned`。旅行事件、目的地明信片池和奖励配置集中在 `config.ts`，React 只展示和派发动作；旧存档缺少新字段时在导入阶段补默认值。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、Vitest 3、jsdom、CSS。

## Global Constraints

- 只做第 3 部分，不修改庭院设计、全局语言架构、按钮设计系统或美术资产。
- 普通玩家不再看到任何“明信片预览”入口；相册只展示已经获得的明信片。
- 第一次旅行固定保证 1 张 `first-dandelion-hill-selfie` 明信片和 1 个可用的胡萝卜种子。
- 旅行奖励在明确领取前保持 pending，领取后只写入一次；刷新、重复点击和快速点击不能重复发放。
- 不加入现实小时级时间、货币、体力、稀有度、付费加速或复杂经济系统。
- 保留旧存档键 `travel-bird-save-v1`，旧存档缺失新字段时不得清档。
- 继续保持纸张、水彩、安静的现有视觉语言，不加入宝箱爆炸、金币雨或抽卡式表现。

---

### Task 1: 旅行状态、数据配置与首次奖励

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/config.ts`
- Modify: `src/domain/game.ts`
- Create: `src/domain/firstTrip.test.ts`

**Interfaces:**
- Produces: `getTravelPhase(state, now)`, `setBagDestination(state, destinationId, now)`, and destination-aware `startTravel(state, now, rng)`.
- Produces: persisted `bag.destinationId`, `Journey.reward` pending payload, and album snapshot fields copied from departure.

- [x] **Step 1: Write failing domain tests**

```ts
expect(getTravelPhase(state, t0).kind).toBe("home");
state = setBagDestination(state, "wind_field", t0);
expect(getTravelPhase(state, t0).kind).toBe("preparing");
state = startTravel(withPackedStarterFood(state), t0, () => 0.99);
expect(state.currentJourney?.postcardId).toBe(FIRST_TRIP_POSTCARD_ID);
expect(state.currentJourney?.reward.seeds.carrot).toBe(1);
expect(state.inventory.seeds.carrot).toBe(0);
```

- [x] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/domain/firstTrip.test.ts`

Expected: FAIL because `getTravelPhase` and `setBagDestination` do not exist and the first postcard is not yet guaranteed.

- [x] **Step 3: Implement minimal data-driven domain logic**

```ts
export type TravelPhase = "home" | "preparing" | "travelling" | "returned";

export const getTravelPhase = (state: GameState, now = Date.now()) => {
  if (state.currentJourney) return getJourneyPhase(state.currentJourney, now);
  return state.bag.destinationId || state.bag.foodId
    ? { kind: "preparing" as const, progress: 0, remainingMs: 0 }
    : { kind: "home" as const, progress: 1, remainingMs: 0 };
};
```

Configure each destination with its postcard pool, select events from configuration using food tags, and keep first-trip/regular reward tables in `config.ts`. `startTravel` consumes food exactly once and stores all random results before leaving; `claimTravel` copies the departure name/date snapshot to the album and clears the pending journey only after applying the reward.

- [x] **Step 4: Verify GREEN and compatibility**

Run: `pnpm exec vitest run src/domain/firstTrip.test.ts src/domain/game.test.ts src/domain/foodPostcard.test.ts`

Expected: all tests pass.

---

### Task 2: 旧存档兼容与防重复领取

**Files:**
- Modify: `src/domain/game.ts`
- Extend: `src/domain/firstTrip.test.ts`

**Interfaces:**
- Consumes: `bag.destinationId`, `Journey.reward`, `getTravelPhase`.
- Produces: normalized old saves with `bag.destinationId: null` and validated pending travel data.

- [x] **Step 1: Write failing persistence tests**

```ts
const reopened = importSave(exportSave(travelling));
expect(reopened.ok && getTravelPhase(reopened.game, returnAt).kind).toBe("returned");
const claimed = claimTravel(reopened.game, returnAt);
expect(claimed.inventory.seeds.carrot).toBe(1);
expect(() => claimTravel(claimed, returnAt)).toThrow();
```

Also remove `destinationId` from a legacy bag object and verify import fills `null` without changing inventory, album, crop, cooking, or postcard history.

- [x] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/domain/firstTrip.test.ts`

Expected: FAIL until bag normalization and nested journey validation are present.

- [x] **Step 3: Implement minimal normalization and validation**

Validate known destination, food, postcard, timestamps and non-negative pending rewards. Normalize only missing optional v1 additions; reject malformed present values without clearing or overwriting the original browser save.

- [x] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run src/domain/firstTrip.test.ts src/domain/foodPostcard.test.ts src/i18n/languageSave.test.ts`

Expected: all tests pass.

---

### Task 3: 玩家可操作的三步行囊与归来界面

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/i18n/dictionary.ts`
- Modify: `src/ui/Art.tsx`
- Modify: `src/panelSurface.css`
- Create: `src/App.travel.test.tsx`

**Interfaces:**
- Consumes: `getTravelPhase`, `setBagDestination`, `startTravel`, `claimTravel`.
- Produces: destination → food → confirmation flow, travelling status, returned pending rewards, and a post-claim receipt.

- [x] **Step 1: Write failing UI tests**

```tsx
click('[data-hotspot="travelBag"]');
clickText("风车田野");
clickText("草莓云朵麦包");
expect(dialog.textContent).toContain("确认行囊");
clickText("出发");
advanceToReturn();
click('[data-hotspot="travelBag"]');
expect(dialog.textContent).toContain("小鸟回来了");
clickText("收下旅行礼物");
```

Then verify localStorage contains one travel log entry, one first postcard album entry, and exactly one new carrot seed after rapid duplicate clicks.

- [x] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/App.travel.test.tsx`

Expected: FAIL because the current room bag only picks food and exposes no departure/return flow.

- [x] **Step 3: Implement minimal UI**

Use the existing `PanelSurface kind="travel-bag"`. At home/preparing show numbered destination, food, and confirmation sections; while travelling show route and remaining time; when returned show the postcard/seed/recipe pending list and one collect action. Immediately update `gameRef` before rendering the receipt so a second click cannot reuse stale state.

- [x] **Step 4: Remove ordinary preview entry and fix first-card art**

Delete `album-preview-entry`, `previewSnapshot`, and the `postcardPreview` panel route from `App.tsx`. Make `PostcardArt` use `FIRST_TRIP_POSTCARD.frontArtKey` for the earned first postcard. Keep the existing viewer file only as an unused developer-capable renderer; do not expose it to players.

- [x] **Step 5: Verify GREEN**

Run: `pnpm exec vitest run src/App.travel.test.tsx src/App.i18n.test.tsx src/ui/PostcardPreview.test.tsx`

Expected: all tests pass.

---

### Task 4: Final regression and visual acceptance

**Files:**
- Modify only if a verified defect is found in Task 1–3 files.

- [x] **Step 1: Run relevant automated tests**

Run: `pnpm exec vitest run src/domain/firstTrip.test.ts src/domain/game.test.ts src/domain/foodPostcard.test.ts src/App.travel.test.tsx src/App.i18n.test.tsx src/ui/PostcardPreview.test.tsx src/ui/RoomScene.test.tsx`

Expected: all listed tests pass.

- [x] **Step 2: Run production build**

Run: `pnpm build`

Expected: TypeScript and Vite both exit 0.

- [x] **Step 3: Browser smoke test**

At 390×844 and 320×568: prepare the starter food, select the only unlocked destination, depart, reload while travelling, wait for return, collect once, reload, confirm the seed and postcard remain and the preview entry is absent.

- [x] **Step 4: Scope audit**

Run: `git diff --name-only` and `git diff --check`.

Expected: only Phase 3 files plus pre-existing user changes are present; no Phase 1, 2, or 4 behavior was introduced by this task.
