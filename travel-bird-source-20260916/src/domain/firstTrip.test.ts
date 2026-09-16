import { describe, expect, test } from "vitest";
import { DESTINATIONS, FIRST_TRIP_POSTCARD_ID, RECIPES, TEACHING_TRIP_REWARDS, TRAVEL_EVENTS } from "./config";
import {
  claimCooking,
  claimTravel,
  createNewGame,
  exportSave,
  getTravelPhase,
  importSave,
  setBagDestination,
  setBagFood,
  startCooking,
  startTravel
} from "./game";

const t0 = Date.UTC(2026, 8, 13, 10, 0, 0);

const withStarterMeal = () => {
  let game = createNewGame(t0);
  game = startCooking(game, "strawberry-cloud-bun", t0);
  game = claimCooking(game, t0 + 3_000);
  return game;
};

describe("first-trip travel state and rewards", () => {
  test("moves from home through preparation and fixes the teaching reward at departure", () => {
    let game = withStarterMeal();

    expect(getTravelPhase(game, t0 + 3_000).kind).toBe("home");
    game = setBagDestination(game, "wind_field", t0 + 3_000);
    expect(getTravelPhase(game, t0 + 3_000).kind).toBe("preparing");
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);

    game = startTravel(game, t0 + 4_000, () => 0.99);

    expect(getTravelPhase(game, t0 + 4_000).kind).toBe("travelling");
    expect(game.currentJourney?.destinationId).toBe("wind_field");
    expect(game.currentJourney?.postcardId).toBe(FIRST_TRIP_POSTCARD_ID);
    expect(game.currentJourney?.reward.seeds.carrot).toBe(1);
    expect(game.inventory.seeds.carrot).toBe(0);
    expect(game.album.collected).toEqual([]);
  });

  test("persists the pending return and applies its rewards exactly once", () => {
    let game = withStarterMeal();
    game = setBagDestination(game, "wind_field", t0 + 3_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);
    game = startTravel(game, t0 + 4_000, () => 0.99);
    const returnsAt = game.currentJourney!.returnsAt;

    const reopened = importSave(exportSave(game));
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(getTravelPhase(reopened.game, returnsAt).kind).toBe("returned");
    expect(reopened.game.inventory.seeds.carrot).toBe(0);

    const claimed = claimTravel(reopened.game, returnsAt);
    expect(claimed.inventory.seeds.carrot).toBe(1);
    expect(claimed.currentJourney).toBeNull();
    expect(claimed.travelLog).toHaveLength(1);
    expect(claimed.album.collected).toEqual([
      expect.objectContaining({
        postcardId: FIRST_TRIP_POSTCARD_ID,
        birdNameSnapshot: "啾啾",
        birdVariant: "blue-quaker",
        travelDate: t0 + 4_000
      })
    ]);
    expect(() => claimTravel(claimed, returnsAt)).toThrow("没有可领取的旅行奖励");
    expect(importSave(exportSave(claimed))).toEqual({ ok: true, game: claimed });
  });

  test("normalizes an old bag without a destination without changing progress", () => {
    const original = withStarterMeal();
    const legacy = JSON.parse(exportSave(original));
    delete legacy.bag.destinationId;

    const imported = importSave(JSON.stringify(legacy));

    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.game.bag).toEqual({ foodId: null, destinationId: null });
    expect(imported.game.inventory).toEqual(original.inventory);
    expect(imported.game.plots).toEqual(original.plots);
    expect(imported.game.album).toEqual(original.album);
  });

  test("requires an explicit unlocked destination before departure", () => {
    let game = withStarterMeal();
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);

    expect(() => startTravel(game, t0 + 4_000, () => 0)).toThrow("请先选择目的地");

    const lockedDestinationSave = JSON.parse(exportSave(game));
    lockedDestinationSave.bag.destinationId = "moss_forest";
    expect(importSave(JSON.stringify(lockedDestinationSave)).ok).toBe(false);
  });

  test("upgrades a legacy pending first journey to the guaranteed teaching postcard", () => {
    let game = withStarterMeal();
    game = setBagDestination(game, "wind_field", t0 + 3_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);
    const legacy = JSON.parse(exportSave(startTravel(game, t0 + 4_000, () => 0)));
    legacy.currentJourney.postcardId = "wind_field_01";
    legacy.currentJourney.story = "旧版首趟途中存档";
    delete legacy.currentJourney.birdNameSnapshot;
    delete legacy.currentJourney.birdVariant;

    const imported = importSave(JSON.stringify(legacy));

    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.game.currentJourney?.postcardId).toBe(FIRST_TRIP_POSTCARD_ID);
    expect(imported.game.currentJourney?.reward).toEqual(TEACHING_TRIP_REWARDS[1]);
    expect(imported.game.currentJourney?.foodId).toBe(legacy.currentJourney.foodId);
    expect(imported.game.currentJourney?.startedAt).toBe(legacy.currentJourney.startedAt);
    expect(imported.game.currentJourney?.returnsAt).toBe(legacy.currentJourney.returnsAt);
    expect(importSave(exportSave(imported.game))).toEqual(imported);

    const claimed = claimTravel(imported.game, imported.game.currentJourney!.returnsAt);
    expect(claimed.album.collected.map((entry) => entry.postcardId)).toEqual([FIRST_TRIP_POSTCARD_ID]);
    expect(claimed.inventory.seeds.carrot).toBe(1);
  });

  test("uses destination postcard pools and avoids repeats until unseen cards are exhausted", () => {
    expect(DESTINATIONS.wind_field.postcardPool).toEqual([
      "wind_field_01",
      "wind_field_02",
      "wind_field_03"
    ]);
    expect(RECIPES["strawberry-cloud-bun"].eventTags.length).toBeGreaterThan(0);
    expect(TRAVEL_EVENTS.every((event) => event.foodTags.length > 0)).toBe(true);

    let game = withStarterMeal();
    game = setBagDestination(game, "wind_field", t0 + 3_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);
    game = claimTravel(startTravel(game, t0 + 4_000, () => 0), t0 + 19_000);
    game.inventory.foods["strawberry-cloud-bun"] = 2;

    game = setBagDestination(game, "wind_field", t0 + 20_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 20_000);
    game = claimTravel(startTravel(game, t0 + 20_000, () => 0), t0 + 35_000);
    expect(game.travelLog[0].postcardId).toBe("wind_field_01");

    game = setBagDestination(game, "wind_field", t0 + 36_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 36_000);
    game = startTravel(game, t0 + 36_000, () => 0);
    expect(game.currentJourney?.postcardId).toBe("wind_field_02");
  });

  test("does not select an event owned by another food when event tags overlap", () => {
    const conflictingEvent = {
      ...TRAVEL_EVENTS.find((event) => event.foodId === "carrot-crescent-crisp" && event.destinationId === "wind_field")!,
      id: "overlapping-food-tag",
      foodTags: ["near-sharing" as const]
    };
    TRAVEL_EVENTS.push(conflictingEvent);
    try {
      let game = withStarterMeal();
      game = setBagDestination(game, "wind_field", t0 + 3_000);
      game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);
      game = startTravel(game, t0 + 4_000, () => 0.99);

      expect(game.currentJourney?.eventId).not.toBe(conflictingEvent.id);
      expect(game.currentJourney?.eventId).toContain("strawberry-cloud-bun");
    } finally {
      TRAVEL_EVENTS.pop();
    }
  });

  test.each([
    (save: any) => { save.bag.destinationId = "unknown-place"; },
    (save: any) => { save.currentJourney.returnsAt = save.currentJourney.startedAt - 1; },
    (save: any) => { save.currentJourney.reward.seeds.carrot = -1; },
    (save: any) => { save.currentJourney.postcardId = "unknown-card"; },
    (save: any) => { save.currentJourney.claimed = true; }
  ])("rejects malformed persisted travel data without normalizing it into progress", mutate => {
    let game = withStarterMeal();
    game = setBagDestination(game, "wind_field", t0 + 3_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);
    const save = JSON.parse(exportSave(startTravel(game, t0 + 4_000, () => 0)));
    mutate(save);

    expect(importSave(JSON.stringify(save)).ok).toBe(false);
  });

  test("keeps regular bonus rewards within the postcard, seed and recipe categories", () => {
    let game = withStarterMeal();
    game = setBagDestination(game, "wind_field", t0 + 3_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 3_000);
    game = claimTravel(startTravel(game, t0 + 4_000, () => 0), t0 + 19_000);
    game.inventory.foods["strawberry-cloud-bun"] = 2;

    game = setBagDestination(game, "wind_field", t0 + 20_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 20_000);
    game = claimTravel(startTravel(game, t0 + 20_000, () => 0), t0 + 35_000);
    game = setBagDestination(game, "wind_field", t0 + 36_000);
    game = setBagFood(game, "strawberry-cloud-bun", t0 + 36_000);
    game = startTravel(game, t0 + 36_000, () => 0.99);

    expect(game.currentJourney?.reward.materials).toEqual({});
    expect(game.currentJourney?.reward.seeds.wheat).toBe(1);
  });
});
