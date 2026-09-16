import { describe, expect, test } from "vitest";
import {
  claimCooking,
  claimTravel,
  createNewGame,
  getCookingPhase,
  getCropPhase,
  getJourneyPhase,
  harvestPlot,
  importSave,
  setBagFood,
  startCooking,
  startPlanting,
  startTravel
} from "./game";

const t0 = Date.UTC(2026, 8, 9, 10, 0, 0);

describe("旅行小鸟核心循环", () => {
  test("种植只扣指定种子，空库存失败不修改数据", () => {
    const original = createNewGame(t0);
    const planted = startPlanting(original, "plot-2", "wheat", t0);
    expect(planted.inventory.materials).toEqual(original.inventory.materials);
    expect(planted.inventory.foods).toEqual(original.inventory.foods);
    expect(planted.inventory.seeds.wheat).toBe(original.inventory.seeds.wheat - 1);
    expect(planted.plots[0]).toEqual(original.plots[0]);
    expect(planted.plots[1].cropId).toBe("wheat");
    original.inventory.seeds.wheat = 0;
    const before = JSON.stringify(original);
    expect(() => startPlanting(original, "plot-1", "wheat", t0)).toThrow("种子不足");
    expect(JSON.stringify(original)).toBe(before);
  });
  test("旧 v1 活跃存档无迁移往返，成熟种植与旅行可离线领取", () => {
    let original = createNewGame(t0);
    original = startPlanting(original, "plot-2", "wheat", t0);
    original = startCooking(original, "bread", t0);
    original = claimCooking(original, t0 + 3000);
    original = setBagFood(original, "bread");
    original = startTravel(original, t0 + 3000);
    const loaded = importSave(JSON.stringify(original));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.game).toEqual(original);
    let continued = harvestPlot(loaded.game, "plot-2", t0 + 60000);
    continued = claimTravel(continued, t0 + 60000);
    expect(continued.travelLog).toHaveLength(1);
    expect(continued.inventory.materials.wheat).toBeGreaterThan(0);
  });
  test("新玩家可以立即制作旅行面包且不会出现负库存", () => {
    let game = createNewGame(t0);

    game = startCooking(game, "bread", t0);
    expect(game.inventory.materials.wheat).toBe(0);
    expect(() => startCooking(game, "bread", t0)).toThrow("厨房正在忙碌");

    expect(getCookingPhase(game.cooking, t0 + 2_999).kind).toBe("cooking");
    game = claimCooking(game, t0 + 3_000);

    expect(game.inventory.foods.bread).toBe(1);
    expect(game.cooking).toBeNull();
    expect(game.inventory.materials.wheat).toBe(0);
  });

  test("种植消耗种子，离线到期后收获获得原料并返还种子", () => {
    let game = createNewGame(t0);
    game = startPlanting(game, "plot-1", "wheat", t0);

    expect(game.inventory.seeds.wheat).toBe(2);
    expect(getCropPhase(game.plots[0], t0 - 60_000).progress).toBe(0);
    expect(getCropPhase(game.plots[0], t0 + 4_999).kind).toBe("growing");
    expect(getCropPhase(game.plots[0], t0 + 5_000).kind).toBe("ready");

    game = harvestPlot(game, "plot-1", t0 + 5_000);

    expect(game.inventory.materials.wheat).toBe(4);
    expect(game.inventory.seeds.wheat).toBe(3);
    expect(game.plots[0].cropId).toBeNull();
  });

  test("出发时才扣食物，首次和第二次旅行按规则解锁且同一旅程只能领取一次", () => {
    let game = createNewGame(t0);
    game = startCooking(game, "bread", t0);
    game = claimCooking(game, t0 + 3_000);
    game = setBagFood(game, "bread");

    expect(game.inventory.foods.bread).toBe(1);
    game = startTravel(game, t0 + 11_000, () => 0);
    expect(game.inventory.foods.bread).toBe(0);
    expect(getJourneyPhase(game.currentJourney, t0 + 20_000).kind).toBe("traveling");
    expect(getJourneyPhase(game.currentJourney, t0 + 26_000).kind).toBe("returned");

    const journeyId = game.currentJourney?.id;
    game = claimTravel(game, t0 + 26_000);
    expect(game.unlocked.crops).toContain("carrot");
    expect(game.unlocked.recipes).toContain("carrot_cake");
    expect(game.unlocked.destinations).toContain("moss_forest");
    expect(game.album.collected.length).toBe(1);
    expect(game.travelLog.length).toBe(1);
    expect(game.travelLog[0].journeyId).toBe(journeyId);
    expect(() => claimTravel(game, t0 + 26_000)).toThrow("没有可领取的旅行奖励");

    game = startPlanting(game, "plot-1", "carrot", t0 + 27_000);
    game = startPlanting(game, "plot-2", "wheat", t0 + 27_000);
    game = harvestPlot(game, "plot-1", t0 + 32_000);
    game = harvestPlot(game, "plot-2", t0 + 32_000);
    game = startCooking(game, "carrot_cake", t0 + 33_000);
    game = claimCooking(game, t0 + 43_000);
    game = setBagFood(game, "carrot_cake");
    game = startTravel(game, t0 + 44_000, () => 0.99);
    game = claimTravel(game, t0 + 60_000);

    expect(game.unlocked.crops).toContain("strawberry");
    expect(game.unlocked.recipes).toContain("strawberry_bento");
    expect(game.unlocked.destinations).toContain("salt_town");
    expect(game.travelLog.length).toBe(2);
  });

  test("食物对已解锁目的地加权，旅程结果在出发时固定保存", () => {
    let game = createNewGame(t0);
    game.unlocked.destinations = ["wind_field", "moss_forest", "salt_town"];
    game.inventory.foods.strawberry_bento = 1;
    game = setBagFood(game, "strawberry_bento");

    game = startTravel(game, t0, () => 0.62);

    expect(game.currentJourney?.destinationId).toBe("salt_town");
    expect(game.currentJourney?.eventId).toContain("strawberry_bento");
    expect(game.currentJourney?.story).toContain("草莓饭盒");
  });

  test("合法存档可以导入，非法存档不会覆盖当前进度", () => {
    const current = createNewGame(t0);
    const exported = JSON.stringify(current);
    const imported = importSave(exported);

    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.game.version).toBe(1);
      expect(imported.game.bird.name).toBe("啾啾");
    }

    const invalid = importSave(JSON.stringify({ version: 1, inventory: { seeds: { wheat: -99 } } }));
    expect(invalid.ok).toBe(false);
  });
});
