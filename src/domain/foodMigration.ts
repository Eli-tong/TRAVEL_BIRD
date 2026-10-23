import type { FoodId } from "./types";

export const LEGACY_FOOD_IDS: Record<string, FoodId> = {
  bread: "strawberry-cloud-bun", "旅行面包": "strawberry-cloud-bun",
  carrot_cake: "carrot-crescent-crisp", "胡萝卜饼": "carrot-crescent-crisp",
  strawberry_bento: "tricolor-travel-bites", "草莓饭盒": "tricolor-travel-bites",
};
const ids: FoodId[] = ["strawberry-cloud-bun", "carrot-crescent-crisp", "tricolor-travel-bites"];
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => !!value && typeof value === "object" && !Array.isArray(value);

/** Only food references change. Never settle tasks, grant ingredients or rewrite stories. */
export function migrateFoodReferences(value: unknown, originalRaw: string): unknown {
  if (!object(value) || value.version !== 1 || !object(value.inventory) || !object(value.inventory.foods)) return value;
  const game = structuredClone(value);
  const inventory = game.inventory as ObjectValue;
  const counts = inventory.foods as ObjectValue;
  let migrated = false;
  const mapId = (id: unknown): FoodId => {
    if (typeof id !== "string") throw new Error("食物 ID 格式不正确");
    if (ids.includes(id as FoodId)) return id as FoodId;
    if (!Object.hasOwn(LEGACY_FOOD_IDS, id)) throw new Error(`无法识别食物 ID：${id}；原存档已保留`);
    migrated = true;
    return LEGACY_FOOD_IDS[id];
  };
  const totals = Object.fromEntries(ids.map(id => [id, 0])) as Record<FoodId, number>;
  const present = new Set<FoodId>();
  for (const [key, amount] of Object.entries(counts)) {
    const id = mapId(key);
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) throw new Error("食物库存格式不正确");
    totals[id] += amount;
    if (!Number.isSafeInteger(totals[id])) throw new Error("食物库存数量超出范围");
    present.add(id);
  }
  // A partial legacy inventory may omit empty categories; a malformed new save
  // must still be rejected by the existing count-map validator.
  if (migrated || present.size === ids.length) inventory.foods = totals;
  const mapList = (holder: unknown) => {
    if (object(holder) && Array.isArray(holder.recipes)) holder.recipes = [...new Set(holder.recipes.map(mapId))];
  };
  mapList(game.unlocked);
  if (object(game.bag) && game.bag.foodId !== null) game.bag.foodId = mapId(game.bag.foodId);
  if (object(game.cooking)) game.cooking.recipeId = mapId(game.cooking.recipeId);
  const mapJourney = (journey: unknown) => {
    if (!object(journey)) return;
    journey.foodId = mapId(journey.foodId);
    if (object(journey.reward)) mapList(journey.reward.unlocks);
    // eventId and story are historical snapshots; the old event ID stays intact.
  };
  if (game.currentJourney) mapJourney(game.currentJourney);
  if (Array.isArray(game.travelLog)) game.travelLog.forEach(mapJourney);
  if (migrated && !game.foodMigration) game.foodMigration = { revision: 1, originalRaw };
  return game;
}
