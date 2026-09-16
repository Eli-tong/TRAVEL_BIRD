import { describe, expect, test } from "vitest";
import { ALL_POSTCARD_IDS, RECIPES, POSTCARDS } from "./config";
import { claimCooking, createNewGame, exportSave, importSave, setBagFood, startCooking } from "./game";

const bun = "strawberry-cloud-bun";
const crisp = "carrot-crescent-crisp";
const bites = "tricolor-travel-bites";
const t0 = 1_700_000_000_000;
const legacy = () => ({
  ...createNewGame(t0),
  inventory: { seeds: { wheat: 3, carrot: 2, strawberry: 1 }, materials: { wheat: 8, carrot: 6, strawberry: 4 }, foods: { bread: 2, carrot_cake: 3, strawberry_bento: 4 } },
  unlocked: { crops: ["wheat", "carrot", "strawberry"], recipes: ["bread", "carrot_cake", "strawberry_bento"], destinations: ["wind_field"] },
  bag: { foodId: "bread" },
  cooking: { recipeId: "strawberry_bento", startedAt: t0, readyAt: t0 + 3_000, claimed: false },
  currentJourney: { id: "old-trip", foodId: "carrot_cake", destinationId: "wind_field", eventId: "carrot_cake_wind_field", postcardId: "wind_field_01", story: "历史正文保持原样", reward: { seeds: {}, materials: {}, unlocks: { crops: [], recipes: ["strawberry_bento"], destinations: [] } }, startedAt: t0, returnsAt: t0 + 15_000, claimed: false },
  travelLog: [{ journeyId: "old-log", foodId: "bread", story: "原始故事", reward: { seeds: {}, materials: {}, unlocks: { crops: [], recipes: ["carrot_cake"], destinations: [] } } }],
  album: { collected: [{ postcardId: "wind_field_01", firstCollectedAt: t0, firstJourneyId: "old-log", firstStory: "原始故事" }] },
});

describe("formal foods and preview-only postcard", () => {
  test("legacy inventory, selections, cooking and reward references migrate without losing history", () => {
    const raw = JSON.stringify(legacy());
    const result = importSave(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const g = result.game;
    expect(g.inventory.foods).toEqual({ [bun]: 2, [crisp]: 3, [bites]: 4 });
    expect(g.bag.foodId).toBe(bun);
    expect(g.cooking?.recipeId).toBe(bites);
    expect(g.currentJourney?.foodId).toBe(crisp);
    expect(g.currentJourney?.reward.unlocks.recipes).toEqual([bites]);
    expect(g.currentJourney?.story).toBe("历史正文保持原样");
    expect(g.travelLog[0].foodId).toBe(bun);
    expect(g.travelLog[0].reward.unlocks.recipes).toEqual([crisp]);
    expect(g.album).toEqual(legacy().album);
    expect(g.foodMigration?.originalRaw).toBe(raw);
    expect(importSave(exportSave(g))).toEqual({ ok: true, game: g });
    expect(claimCooking(g, t0 + 3_000).inventory.foods[bites]).toBe(5);
  });
  test("mixed canonical and name aliases add counts once, without touching ingredients or extra currency", () => {
    const old = legacy();
    const raw = JSON.stringify({ ...old, coins: 137, inventory: { ...old.inventory, foods: { bread: 2, [bun]: 5, "旅行面包": 1, carrot_cake: 3, strawberry_bento: 4 } } });
    const result = importSave(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.inventory.foods[bun]).toBe(8);
    expect(result.game.inventory.materials).toEqual(old.inventory.materials);
    expect(JSON.parse(exportSave(result.game)).coins).toBe(137);
    const again = importSave(exportSave(result.game));
    expect(again).toEqual(result);
  });
  test.each([-1, 0.5, "3", Number.MAX_SAFE_INTEGER + 1])("invalid migrated quantity %s is rejected", count => {
    const old = legacy();
    expect(importSave(JSON.stringify({ ...old, inventory: { ...old.inventory, foods: { ...old.inventory.foods, bread: count } } })).ok).toBe(false);
  });
  test("each recipe consumes exactly its ingredients, claims once and bag selection does not depart", () => {
    for (const id of [bun, crisp, bites] as const) {
      const game = createNewGame(t0);
      game.unlocked.recipes = [bun, crisp, bites];
      game.inventory.materials = { wheat: 3, carrot: 2, strawberry: 2 };
      const before = exportSave(game);
      const cooking = startCooking(game, id, t0);
      const expected = { wheat: 2, carrot: id === bun ? 2 : 1, strawberry: id === crisp ? 2 : 1 };
      expect(cooking.inventory.materials).toEqual(expected);
      expect(() => startCooking(cooking, id, t0)).toThrow();
      expect(exportSave(game)).toBe(before);
      const cooked = claimCooking(cooking, t0 + 3_000);
      expect(cooked.inventory.materials).toEqual(expected);
      expect(cooked.inventory.foods[id]).toBe(1);
      expect(() => claimCooking(cooked, t0 + 3_000)).toThrow();
      const packed = setBagFood(cooked, id);
      expect(packed.inventory).toEqual(cooked.inventory);
      expect(packed.currentJourney).toBeNull();
      expect(packed.album.collected).toEqual([]);
      expect(importSave(exportSave(packed))).toEqual({ ok: true, game: packed });
      game.inventory.materials.wheat = 0;
      expect(() => startCooking(game, id, t0)).toThrow("材料不足");
    }
  });
  test("unowned food cannot be selected and starter food can be cooked from a new save", () => {
    const game = createNewGame(t0);
    expect(() => setBagFood(game, bun)).toThrow("食物库存不足");
    expect(startCooking(game, bun, t0).cooking?.recipeId).toBe(bun);
  });
  test("first postcard is registered with explicit bird gaps but is absent from the ordinary pool", () => {
    const card = POSTCARDS["first-dandelion-hill-selfie"];
    expect(card?.isFirstTripGuaranteed).toBe(true);
    expect(card?.foodAffinity).toContain(bun);
    expect(card?.birdArtVariants["blue-quaker"]).toBeTruthy();
    expect(card?.birdArtVariants.cockatiel).toBeNull();
    expect(ALL_POSTCARD_IDS).not.toContain("first-dandelion-hill-selfie");
    expect(RECIPES[bun]?.isStarterFood).toBe(true);
    expect(createNewGame(t0).album.collected).toEqual([]);
  });
});
