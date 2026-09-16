import { describe, expect, test } from "vitest";
import * as game from "./game";
import * as config from "./config";

const t0 = Date.UTC(2026, 8, 12, 10);
const pack = (at = t0) => {
  let state = game.createNewGame(at);
  state = game.cookFood(state, "millet_bites", at);
  state = game.setBagFood(state, "millet_bites", at);
  return game.prepareBag(state, at, () => 0.37);
};

describe("v2 resources and packing", () => {
  test("a new player has three plots, every starter seed and one cook of each recipe", () => {
    const state = game.createNewGame(t0);
    expect(state.schemaVersion).toBe(2);
    expect(state.coins).toBe(500);
    expect(state.inventory.seeds).toEqual({ millet: 3, pumpkin: 3, berries: 3 });
    expect(state.inventory.materials).toEqual({ millet: 2, pumpkin: 2, berries: 2 });
    expect(state.plots).toHaveLength(3);
    expect(game.markIntroSeen(game.markIntroSeen(state, t0), t0).inventory).toEqual(state.inventory);
  });
  test("cooking is immediate, conserves ingredients, and a repeated unaffordable action cannot mutate state", () => {
    const before = game.createNewGame(t0);
    const cooked = game.cookFood(before, "pumpkin_cakes", t0);
    expect(cooked.inventory.materials.pumpkin).toBe(0);
    expect(cooked.inventory.foods.pumpkin_cakes).toBe(1);
    expect(() => game.cookFood(cooked, "pumpkin_cakes", t0)).toThrow("error.noMaterials");
    expect(before.inventory.materials.pumpkin).toBe(2);
    expect(cooked.inventory.foods.pumpkin_cakes).toBe(1);
  });
  test("planting and harvesting charge a seed exactly once and give two materials plus six coins", () => {
    const original = game.createNewGame(t0);
    const planted = game.startPlanting(original, "plot-2", "pumpkin", t0);
    expect(planted.inventory.seeds.pumpkin).toBe(2);
    expect(planted.plots[0]).toEqual(original.plots[0]);
    expect(game.getCropPhase(planted.plots[1], t0 - 100).progress).toBe(0);
    expect(() => game.harvestPlot(planted, "plot-2", t0 + 89_999)).toThrow("error.cropGrowing");
    const harvested = game.harvestPlot(planted, "plot-2", t0 + 90_000);
    expect(harvested.inventory.materials.pumpkin).toBe(4);
    expect(harvested.inventory.seeds.pumpkin).toBe(2);
    expect(harvested.coins).toBe(506);
    expect(() => game.harvestPlot(harvested, "plot-2", t0 + 90_000)).toThrow("error.noCrop");
  });
  test("food moves between cupboard and bag; replacing, cancelling and unpacking cannot duplicate it", () => {
    let state = game.cookFood(game.createNewGame(t0), "millet_bites", t0);
    state = game.cookFood(state, "berry_picnic", t0);
    state = game.setBagFood(state, "millet_bites", t0);
    expect(state.inventory.foods.millet_bites).toBe(0);
    state = game.setBagFood(state, "berry_picnic", t0);
    expect(state.inventory.foods.millet_bites).toBe(1);
    expect(state.inventory.foods.berry_picnic).toBe(0);
    state = game.prepareBag(state, t0, () => 0);
    expect(() => game.setBagFood(state, "millet_bites", t0)).toThrow("error.cancelPacking");
    state = game.cancelPacking(state, t0 + 1_000);
    expect(state.bag.foodId).toBe("berry_picnic");
    expect(state.inventory.foods.berry_picnic).toBe(0);
    state = game.setBagFood(state, null, t0 + 1_000);
    expect(state.inventory.foods.berry_picnic).toBe(1);
    expect(game.setBagFood(state, null, t0 + 1_000).inventory).toEqual(state.inventory);
  });
});

describe("timestamp travel, mail and gifts", () => {
  test("first departure uses its planned time, even when reopening after return", () => {
    const ready = pack();
    expect(game.getTravelStatus(ready)).toBe("packed");
    expect(ready.bag.departAt).toBe(t0 + 5_000);
    expect(game.getTravelStatus(game.settleGame(ready, t0 + 4_999))).toBe("packed");
    const reopened = game.settleGame(ready, t0 + 120_000);
    expect(reopened.currentJourney?.startedAt).toBe(t0 + 5_000);
    expect(reopened.currentJourney?.mailAt).toBe(t0 + 65_000);
    expect(reopened.currentJourney?.returnsAt).toBe(t0 + 95_000);
    expect(reopened.currentJourney?.destinationId).toBe("forest");
    expect(game.getTravelStatus(reopened)).toBe("returned_unclaimed");
    expect(reopened.mail).toHaveLength(1);
    expect(reopened.album.collected).toHaveLength(1);
    expect(reopened.inventory.seeds).toEqual(ready.inventory.seeds);
    expect(reopened.bag.foodId).toBeNull();
  });
  test("the same packed save resolves identical random results and no refresh rerolls a journey", () => {
    const ready = pack();
    const early = game.settleGame(ready, t0 + 5_000);
    const late = game.settleGame(JSON.parse(JSON.stringify(ready)), t0 + 120_000);
    expect(late.currentJourney?.postcardId).toBe(early.currentJourney?.postcardId);
    expect(late.currentJourney?.reward).toEqual(early.currentJourney?.reward);
    expect(late.currentJourney?.id).toBe(early.currentJourney?.id);
    expect(game.settleGame(late, t0 + 180_000).mail).toHaveLength(1);
  });
  test("reading a letter does not claim gifts; gift claim leaves unread letters and is idempotent", () => {
    const returned = game.settleGame(pack(), t0 + 95_000);
    const read = game.readMail(returned, returned.mail[0].id, t0 + 95_000);
    expect(read.mail[0].readAt).toBe(t0 + 95_000);
    expect(read.inventory).toEqual(returned.inventory);
    const claimed = game.claimTravel(returned, t0 + 95_000);
    expect(claimed.mail[0].readAt).toBeNull();
    expect(Object.values(claimed.inventory.seeds).reduce((a,b) => a+b,0)).toBe(10);
    expect(claimed.inventory.souvenirs.pinecone).toBe(1);
    expect(claimed.travelLog).toHaveLength(1);
    expect(game.getTravelStatus(claimed)).toBe("home");
    expect(game.claimTravel(claimed, t0 + 95_000).inventory).toEqual(claimed.inventory);
    expect(game.settleGame(claimed, t0 + 10_000_000).currentJourney).toBeNull();
  });
  test("regular travel packs for ten seconds, lasts six to ten minutes and mails at sixty percent", () => {
    let state = game.claimTravel(game.settleGame(pack(), t0 + 95_000), t0 + 95_000);
    state = game.cookFood(state, "berry_picnic", t0 + 96_000);
    state = game.setBagFood(state, "berry_picnic", t0 + 96_000);
    state = game.prepareBag(state, t0 + 96_000, () => 0.83);
    expect(state.bag.departAt).toBe(t0 + 106_000);
    state = game.settleGame(state, t0 + 106_000);
    const trip = state.currentJourney!;
    expect(trip.returnsAt-trip.startedAt).toBeGreaterThanOrEqual(360_000);
    expect(trip.returnsAt-trip.startedAt).toBeLessThanOrEqual(600_000);
    expect(trip.mailAt-trip.startedAt).toBe(Math.round((trip.returnsAt-trip.startedAt)*0.6));
  });
  test("historical bird names and species survive renaming and switching after return", () => {
    let state = game.renameBird(pack(), "棉花", t0);
    expect(() => game.switchBird(state, "cockatiel", t0)).toThrow("error.cancelPacking");
    state = game.settleGame(state, t0 + 95_000);
    expect(() => game.switchBird(state, "cockatiel", t0 + 95_000)).toThrow("error.packagePending");
    state = game.claimTravel(state, t0 + 95_000);
    state = game.switchBird(state, "cockatiel", t0 + 95_000);
    state = game.renameBird(state, "小葵", t0 + 95_000);
    expect(state.mail[0].birdName).toBe("棉花");
    expect(state.mail[0].birdSpecies).toBe("blue_quaker");
    expect(state.travelLog[0].birdName).toBe("棉花");
    expect(game.switchBird(state,"blue_quaker",t0+95_000).bird.name).toBe("棉花");
  });
  test("clock rollback cannot undo settlement, duplicate rewards or create negative progress", () => {
    const returned = game.settleGame(pack(), t0 + 95_000);
    const rolledBack = game.settleGame(returned, t0);
    expect(rolledBack.lastSettledAt).toBe(t0 + 95_000);
    expect(game.getTravelStatus(rolledBack)).toBe("returned_unclaimed");
    expect(rolledBack.mail).toHaveLength(1);
    expect(game.claimTravel(rolledBack, t0).inventory.souvenirs.pinecone).toBe(1);
  });
  test("beta time tools settle normal mail and return flags and never directly grant rewards", () => {
    let state = game.startPlanting(pack(), "plot-1", "millet", t0);
    state = game.runBetaTool(state, "mature_crops", t0);
    expect(game.getCropPhase(state.plots[0], t0).kind).toBe("ready");
    expect(state.inventory.materials.millet).toBe(0);
    state = game.runBetaTool(state, "mail", t0);
    expect(state.mail).toHaveLength(1);
    expect(state.inventory.souvenirs.pinecone).toBe(0);
    state = game.runBetaTool(state, "return", t0);
    expect(game.getTravelStatus(state)).toBe("returned_unclaimed");
    expect(state.mail).toHaveLength(1);
    expect(state.inventory.souvenirs.pinecone).toBe(0);
    state = game.claimTravel(state, t0);
    expect(state.inventory.souvenirs.pinecone).toBe(1);
    expect(game.runBetaTool(state, "coins", t0).coins).toBe(1000);
  });
});

describe("content and shop", () => {
  test("food destination probability rows match the requested weights", () => {
    expect(config.FOODS.millet_bites.weights).toEqual({forest:45,creek:15,countryside:30,cliffs:10});
    expect(config.FOODS.pumpkin_cakes.weights).toEqual({forest:15,creek:15,countryside:35,cliffs:35});
    expect(config.FOODS.berry_picnic.weights).toEqual({forest:20,creek:50,countryside:20,cliffs:10});
    expect(config.FOODS.emergency_meal.weights).toEqual({forest:25,creek:25,countryside:25,cliffs:25});
  });
  test("eight postcard stories have distinct Chinese and English bodies", () => {
    const cards = Object.values(config.POSTCARDS);
    expect(cards).toHaveLength(8);
    expect(new Set(cards.map(card => card.body.en)).size).toBe(8);
    expect(new Set(cards.map(card => card.body["zh-CN"])).size).toBe(8);
    expect(config.ALL_DESTINATION_IDS.every(id => cards.filter(card => card.destinationId===id).length===2)).toBe(true);
  });
  test("shop prices are charged once, decorations toggle visibly and insufficient funds are atomic", () => {
    let state = game.buySeed(game.createNewGame(t0), "berries", t0);
    expect(state.coins).toBe(497);
    expect(state.inventory.seeds.berries).toBe(4);
    state = game.buyEmergencyMeal(state, t0);
    expect(state.coins).toBe(491);
    expect(state.inventory.foods.emergency_meal).toBe(1);
    state = game.buyDecoration(state, "leaf_rug", t0);
    expect(state.coins).toBe(446);
    expect(state.decorations.leaf_rug).toEqual({owned:true,visible:true});
    expect(() => game.buyDecoration(state,"leaf_rug",t0)).toThrow("error.alreadyOwned");
    state = game.toggleDecoration(state,"leaf_rug",t0);
    expect(state.decorations.leaf_rug.visible).toBe(false);
    state.coins=0;
    expect(() => game.buyEmergencyMeal(state,t0)).toThrow("error.noCoins");
    expect(state.inventory.foods.emergency_meal).toBe(1);
  });
});
