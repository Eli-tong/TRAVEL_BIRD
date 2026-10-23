import { describe, expect, test } from "vitest";
import {
  claimTravelPostcard,
  claimTravelSeeds,
  createNewGame,
  exportSave,
  hasPendingTravelPostcard,
  hasPendingTravelSeeds,
  importSave,
  setBagDestination,
  setBagFood,
  settleTravel,
  startTravel
} from "./game";

const t0 = Date.UTC(2026, 9, 14, 8, 0, 0);

const returnedFirstJourney = () => {
  let game = createNewGame(t0);
  game.inventory.foods["strawberry-cloud-bun"] = 1;
  game = setBagDestination(game, "wind_field", t0);
  game = setBagFood(game, "strawberry-cloud-bun", t0);
  game = startTravel(game, t0, () => 0);
  return { game, returnedAt: game.currentJourney!.returnsAt };
};

describe("independent travel reward channels", () => {
  test("return creates persisted pending rewards without granting them", () => {
    const { game, returnedAt } = returnedFirstJourney();
    const returned = settleTravel(game, returnedAt);

    expect(returned.travel.status).toBe("returned");
    expect(returned.travel.pendingPostcards).toHaveLength(1);
    expect(returned.travel.pendingBagRewards).toHaveLength(1);
    expect(returned.album.collected).toHaveLength(0);
    expect(returned.inventory.seeds.carrot).toBe(0);
    expect(returned.unlocked.recipes).not.toContain("carrot-crescent-crisp");

    const reopened = importSave(exportSave(returned));
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.game.travel.pendingPostcards).toEqual(returned.travel.pendingPostcards);
    expect(reopened.game.travel.pendingBagRewards).toEqual(returned.travel.pendingBagRewards);
  });

  test("claiming the postcard leaves the seed pending across reload", () => {
    const { game, returnedAt } = returnedFirstJourney();

    const postcardClaimed = claimTravelPostcard(game, returnedAt);

    expect(postcardClaimed.album.collected).toHaveLength(1);
    expect(postcardClaimed.inventory.seeds.carrot).toBe(0);
    expect(postcardClaimed.currentJourney).not.toBeNull();
    expect(hasPendingTravelPostcard(postcardClaimed, returnedAt)).toBe(false);
    expect(hasPendingTravelSeeds(postcardClaimed, returnedAt)).toBe(true);
    expect(claimTravelPostcard(postcardClaimed, returnedAt)).toEqual(postcardClaimed);

    const reopened = importSave(exportSave(postcardClaimed));
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(hasPendingTravelPostcard(reopened.game, returnedAt)).toBe(false);
    expect(hasPendingTravelSeeds(reopened.game, returnedAt)).toBe(true);

    const seedsClaimed = claimTravelSeeds(reopened.game, returnedAt);
    expect(seedsClaimed.inventory.seeds.carrot).toBe(1);
    expect(seedsClaimed.album.collected).toHaveLength(1);
    expect(seedsClaimed.currentJourney).toBeNull();
    expect(seedsClaimed.travelLog).toHaveLength(1);
  });

  test("claiming seeds first leaves the postcard pending and cannot duplicate inventory", () => {
    const { game, returnedAt } = returnedFirstJourney();

    const seedsClaimed = claimTravelSeeds(game, returnedAt);

    expect(seedsClaimed.inventory.seeds.carrot).toBe(1);
    expect(seedsClaimed.album.collected).toHaveLength(0);
    expect(seedsClaimed.currentJourney).not.toBeNull();
    expect(hasPendingTravelSeeds(seedsClaimed, returnedAt)).toBe(false);
    expect(hasPendingTravelPostcard(seedsClaimed, returnedAt)).toBe(true);
    expect(claimTravelSeeds(seedsClaimed, returnedAt)).toEqual(seedsClaimed);

    const reopened = importSave(exportSave(seedsClaimed));
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(hasPendingTravelSeeds(reopened.game, returnedAt)).toBe(false);
    expect(hasPendingTravelPostcard(reopened.game, returnedAt)).toBe(true);
    expect(claimTravelSeeds(reopened.game, returnedAt)).toEqual(reopened.game);
    const completed = claimTravelPostcard(reopened.game, returnedAt);
    expect(completed.inventory.seeds.carrot).toBe(1);
    expect(completed.album.collected).toHaveLength(1);
    expect(completed.currentJourney).toBeNull();
    expect(completed.travelLog).toHaveLength(1);
    expect(importSave(exportSave(completed))).toEqual({ ok: true, game: completed });
  });

  test("neither channel is available before return and failed claims preserve the save", () => {
    const { game, returnedAt } = returnedFirstJourney();
    const original = exportSave(game);
    expect(hasPendingTravelPostcard(game, returnedAt - 1)).toBe(false);
    expect(hasPendingTravelSeeds(game, returnedAt - 1)).toBe(false);
    expect(() => claimTravelPostcard(game, returnedAt - 1)).toThrow("小鸟还没有归来");
    expect(() => claimTravelSeeds(game, returnedAt - 1)).toThrow("小鸟还没有归来");
    expect(exportSave(game)).toBe(original);
  });

  test("mail without seeds cannot grant inventory items from a legacy reward object", () => {
    const { game, returnedAt } = returnedFirstJourney();
    game.currentJourney!.reward.seeds = {};
    game.currentJourney!.reward.materials = { carrot: 2 };
    const claimed = claimTravelPostcard(game, returnedAt);
    expect(claimed.inventory).toEqual(game.inventory);
    expect(claimed.album.collected).toHaveLength(1);
    expect(claimed.currentJourney).not.toBeNull();
    expect(claimed.travel.pendingBagRewards).toHaveLength(1);

    const bagClaimed = claimTravelSeeds(claimed, returnedAt);
    expect(bagClaimed.inventory.materials.carrot).toBe(game.inventory.materials.carrot + 2);
    expect(bagClaimed.currentJourney).toBeNull();
  });

  test.each(["postcardClaimed", "seedRewardsClaimed"])("rejects a corrupted %s marker", (marker) => {
    const { game } = returnedFirstJourney();
    const save = JSON.parse(exportSave(game));
    save.currentJourney[marker] = "true";
    expect(importSave(JSON.stringify(save)).ok).toBe(false);
  });
});
