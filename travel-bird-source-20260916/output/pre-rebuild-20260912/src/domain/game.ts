import {
  ALL_CROP_IDS,
  ALL_DESTINATION_IDS,
  ALL_POSTCARD_IDS,
  ALL_RECIPE_IDS,
  CROPS,
  MODE_TIMINGS,
  POSTCARDS,
  RECIPES,
  SAVE_VERSION,
  TRAVEL_EVENTS
} from "./config";
import type {
  AlbumEntry,
  CookingTask,
  CountMap,
  CropId,
  DestinationId,
  FoodId,
  GameState,
  Inventory,
  Journey,
  JourneyReward,
  Mode,
  Plot,
  PostcardId,
  RecipeId
} from "./types";

type Rng = () => number;

const emptyCounts = <T extends string>(ids: readonly T[]): CountMap<T> =>
  Object.fromEntries(ids.map((id) => [id, 0])) as CountMap<T>;

const clone = <T>(value: T): T => structuredClone(value);

const touch = (game: GameState, now: number): GameState => ({
  ...game,
  updatedAt: Math.max(game.updatedAt, now)
});

const createReward = (): JourneyReward => ({
  seeds: {},
  materials: {},
  unlocks: { crops: [], recipes: [], destinations: [] }
});

const addUnique = <T extends string>(items: T[], item: T): T[] =>
  items.includes(item) ? items : [...items, item];

const addCounts = <T extends string>(counts: CountMap<T>, additions: Partial<CountMap<T>>) => {
  for (const [id, amount] of Object.entries(additions) as [T, number][]) {
    counts[id] = Math.max(0, counts[id] + Math.max(0, amount));
  }
};

const hasEnough = (inventory: Inventory, ingredients: Partial<CountMap<CropId>>) =>
  Object.entries(ingredients).every(([cropId, amount]) => inventory.materials[cropId as CropId] >= (amount ?? 0));

export const createNewGame = (now = Date.now(), mode: Mode = "demo"): GameState => ({
  version: SAVE_VERSION,
  createdAt: now,
  updatedAt: now,
  bird: { name: "啾啾" },
  inventory: {
    seeds: { ...emptyCounts(ALL_CROP_IDS), wheat: 3 },
    materials: { ...emptyCounts(ALL_CROP_IDS), wheat: 2 },
    foods: emptyCounts(ALL_RECIPE_IDS)
  },
  plots: ["plot-1", "plot-2", "plot-3"].map((id) => ({ id, cropId: null, plantedAt: null, readyAt: null })),
  cooking: null,
  unlocked: {
    crops: ["wheat"],
    recipes: ["bread"],
    destinations: ["wind_field"]
  },
  bag: { foodId: null },
  currentJourney: null,
  album: { collected: [] },
  travelLog: [],
  settings: { mode, seenIntro: false }
});

export const getCropDuration = (cropId: CropId, mode: Mode) =>
  mode === "demo" ? CROPS[cropId].demoMs : CROPS[cropId].normalMs;

export const getCookingDuration = (mode: Mode) => MODE_TIMINGS[mode].cookingMs;

export const getTravelDuration = (mode: Mode) => MODE_TIMINGS[mode].travelMs;

export const getCropPhase = (plot: Plot, now = Date.now()) => {
  if (!plot.cropId || plot.plantedAt === null || plot.readyAt === null) {
    return { kind: "empty" as const, progress: 0, remainingMs: 0 };
  }
  const total = Math.max(1, plot.readyAt - plot.plantedAt);
  const elapsed = Math.max(0, now - plot.plantedAt);
  const progress = Math.min(1, elapsed / total);
  const remainingMs = Math.max(0, plot.readyAt - now);
  return {
    kind: remainingMs === 0 ? ("ready" as const) : ("growing" as const),
    progress,
    remainingMs
  };
};

export const getCookingPhase = (task: CookingTask | null, now = Date.now()) => {
  if (!task) return { kind: "empty" as const, progress: 0, remainingMs: 0 };
  const total = Math.max(1, task.readyAt - task.startedAt);
  const progress = Math.min(1, Math.max(0, now - task.startedAt) / total);
  const remainingMs = Math.max(0, task.readyAt - now);
  return {
    kind: remainingMs === 0 ? ("ready" as const) : ("cooking" as const),
    progress,
    remainingMs
  };
};

export const getJourneyPhase = (journey: Journey | null, now = Date.now()) => {
  if (!journey) return { kind: "home" as const, progress: 1, remainingMs: 0 };
  const total = Math.max(1, journey.returnsAt - journey.startedAt);
  const progress = Math.min(1, Math.max(0, now - journey.startedAt) / total);
  const remainingMs = Math.max(0, journey.returnsAt - now);
  return {
    kind: remainingMs === 0 ? ("returned" as const) : ("traveling" as const),
    progress,
    remainingMs
  };
};

export const startPlanting = (state: GameState, plotId: string, cropId: CropId, now = Date.now()): GameState => {
  if (!state.unlocked.crops.includes(cropId)) throw new Error("作物尚未解锁");
  if (state.inventory.seeds[cropId] <= 0) throw new Error("种子不足");
  const plot = state.plots.find((item) => item.id === plotId);
  if (!plot) throw new Error("土地不存在");
  if (plot.cropId) throw new Error("这块土地已经种下作物");

  const game = clone(state);
  game.inventory.seeds[cropId] -= 1;
  game.plots = game.plots.map((item) =>
    item.id === plotId
      ? {
          id: item.id,
          cropId,
          plantedAt: now,
          readyAt: now + getCropDuration(cropId, state.settings.mode)
        }
      : item
  );
  return touch(game, now);
};

export const harvestPlot = (state: GameState, plotId: string, now = Date.now()): GameState => {
  const plot = state.plots.find((item) => item.id === plotId);
  if (!plot || !plot.cropId || plot.readyAt === null) throw new Error("没有可收获的作物");
  if (getCropPhase(plot, now).kind !== "ready") throw new Error("作物还没有成熟");

  const cropId = plot.cropId;
  const game = clone(state);
  game.inventory.materials[cropId] += 2;
  game.inventory.seeds[cropId] += 1;
  game.plots = game.plots.map((item) =>
    item.id === plotId ? { id: item.id, cropId: null, plantedAt: null, readyAt: null } : item
  );
  return touch(game, now);
};

export const getMissingIngredients = (state: GameState, recipeId: RecipeId) => {
  const recipe = RECIPES[recipeId];
  return Object.entries(recipe.ingredients)
    .map(([cropId, amount]) => ({
      cropId: cropId as CropId,
      needed: amount ?? 0,
      owned: state.inventory.materials[cropId as CropId]
    }))
    .filter((item) => item.owned < item.needed);
};

export const startCooking = (state: GameState, recipeId: RecipeId, now = Date.now()): GameState => {
  if (state.cooking) throw new Error("厨房正在忙碌");
  if (!state.unlocked.recipes.includes(recipeId)) throw new Error("食谱尚未解锁");
  const recipe = RECIPES[recipeId];
  if (!hasEnough(state.inventory, recipe.ingredients)) throw new Error("材料不足");

  const game = clone(state);
  for (const [cropId, amount] of Object.entries(recipe.ingredients) as [CropId, number][]) {
    game.inventory.materials[cropId] -= amount;
  }
  game.cooking = {
    recipeId,
    startedAt: now,
    readyAt: now + getCookingDuration(state.settings.mode),
    claimed: false
  };
  return touch(game, now);
};

export const claimCooking = (state: GameState, now = Date.now()): GameState => {
  if (!state.cooking || state.cooking.claimed) throw new Error("没有可领取的食物");
  if (getCookingPhase(state.cooking, now).kind !== "ready") throw new Error("食物还没做好");
  const game = clone(state);
  game.inventory.foods[state.cooking.recipeId] += 1;
  game.cooking = null;
  return touch(game, now);
};

export const setBagFood = (state: GameState, foodId: FoodId | null): GameState => ({
  ...clone(state),
  bag: { foodId },
  updatedAt: Date.now()
});

const weightedDestination = (unlocked: DestinationId[], foodId: FoodId, rng: Rng): DestinationId => {
  const preferred = RECIPES[foodId].preferredDestinationId;
  const weighted = unlocked.flatMap((id) => Array(id === preferred ? 3 : 1).fill(id)) as DestinationId[];
  const index = Math.min(weighted.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * weighted.length));
  return weighted[index];
};

const choosePostcard = (state: GameState, destinationId: DestinationId, rng: Rng): PostcardId => {
  const candidates = ALL_POSTCARD_IDS.filter((id) => POSTCARDS[id].destinationId === destinationId);
  const collected = new Set(state.album.collected.map((entry) => entry.postcardId));
  const unseen = candidates.filter((id) => !collected.has(id));
  const pool = unseen.length > 0 ? unseen : candidates;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * pool.length));
  return pool[index];
};

const createJourneyId = (now: number, rng: Rng) => `journey-${now.toString(36)}-${Math.floor(rng() * 1_000_000).toString(36)}`;

const createTravelReward = (state: GameState, destinationId: DestinationId, rng: Rng): JourneyReward => {
  const reward = createReward();
  const travelNumber = state.travelLog.length + 1;
  if (travelNumber === 1) {
    reward.seeds.carrot = 1;
    reward.unlocks.crops.push("carrot");
    reward.unlocks.recipes.push("carrot_cake");
    reward.unlocks.destinations.push("moss_forest");
    return reward;
  }
  if (travelNumber === 2) {
    reward.seeds.strawberry = 1;
    reward.unlocks.crops.push("strawberry");
    reward.unlocks.recipes.push("strawberry_bento");
    reward.unlocks.destinations.push("salt_town");
    return reward;
  }

  const bonusCrop: CropId =
    destinationId === "moss_forest" ? "carrot" : destinationId === "salt_town" ? "strawberry" : "wheat";
  if (rng() < 0.55) {
    reward.seeds[bonusCrop] = 1;
  } else {
    reward.materials[bonusCrop] = 1;
  }
  return reward;
};

export const startTravel = (state: GameState, now = Date.now(), rng: Rng = Math.random): GameState => {
  if (state.currentJourney && !state.currentJourney.claimed) throw new Error("小鸟正在旅行或等待领取奖励");
  const foodId = state.bag.foodId;
  if (!foodId) throw new Error("请先准备一份食物");
  if (state.inventory.foods[foodId] <= 0) throw new Error("食物库存不足");

  const destinationId = weightedDestination(state.unlocked.destinations, foodId, rng);
  const event = TRAVEL_EVENTS.find((item) => item.foodId === foodId && item.destinationId === destinationId);
  if (!event) throw new Error("旅行事件配置缺失");
  const postcardId = choosePostcard(state, destinationId, rng);
  const reward = createTravelReward(state, destinationId, rng);
  const story = `${event.text} ${POSTCARDS[postcardId].storySeed}`;

  const game = clone(state);
  game.inventory.foods[foodId] -= 1;
  game.currentJourney = {
    id: createJourneyId(now, rng),
    foodId,
    destinationId,
    eventId: event.id,
    postcardId,
    story,
    reward,
    startedAt: now,
    returnsAt: now + getTravelDuration(state.settings.mode),
    claimed: false
  };
  return touch(game, now);
};

export const claimTravel = (state: GameState, now = Date.now()): GameState => {
  if (!state.currentJourney || state.currentJourney.claimed) throw new Error("没有可领取的旅行奖励");
  if (getJourneyPhase(state.currentJourney, now).kind !== "returned") throw new Error("小鸟还没有归来");

  const game = clone(state);
  const journey = game.currentJourney;
  if (!journey) throw new Error("没有可领取的旅行奖励");

  addCounts(game.inventory.seeds, journey.reward.seeds);
  addCounts(game.inventory.materials, journey.reward.materials);
  for (const cropId of journey.reward.unlocks.crops) game.unlocked.crops = addUnique(game.unlocked.crops, cropId);
  for (const recipeId of journey.reward.unlocks.recipes) {
    game.unlocked.recipes = addUnique(game.unlocked.recipes, recipeId);
  }
  for (const destinationId of journey.reward.unlocks.destinations) {
    game.unlocked.destinations = addUnique(game.unlocked.destinations, destinationId);
  }

  const alreadyCollected = game.album.collected.some((entry) => entry.postcardId === journey.postcardId);
  if (!alreadyCollected) {
    const entry: AlbumEntry = {
      postcardId: journey.postcardId,
      firstCollectedAt: now,
      firstJourneyId: journey.id,
      firstStory: journey.story
    };
    game.album.collected.push(entry);
  }

  game.travelLog.unshift({
    journeyId: journey.id,
    date: now,
    foodId: journey.foodId,
    destinationId: journey.destinationId,
    eventId: journey.eventId,
    postcardId: journey.postcardId,
    reward: journey.reward,
    story: journey.story
  });
  game.currentJourney = null;
  game.bag.foodId = null;
  return touch(game, now);
};

export const renameBird = (state: GameState, name: string, now = Date.now()): GameState => {
  const clean = name.trim().slice(0, 8);
  if (!clean) throw new Error("名字不能为空");
  return touch({ ...clone(state), bird: { name: clean } }, now);
};

export const setMode = (state: GameState, mode: Mode, now = Date.now()): GameState =>
  touch({ ...clone(state), settings: { ...state.settings, mode } }, now);

export const markIntroSeen = (state: GameState, now = Date.now()): GameState =>
  touch({ ...clone(state), settings: { ...state.settings, seenIntro: true } }, now);

const isNonNegativeInteger = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;

const hasCountMap = <T extends string>(value: unknown, ids: readonly T[]) => {
  if (!value || typeof value !== "object") return false;
  return ids.every((id) => isNonNegativeInteger((value as Record<string, unknown>)[id]));
};

const isStringArraySubset = <T extends string>(value: unknown, ids: readonly T[]) =>
  Array.isArray(value) && value.every((item) => typeof item === "string" && (ids as readonly string[]).includes(item));

export type ImportResult = { ok: true; game: GameState } | { ok: false; error: string };

export const importSave = (raw: string): ImportResult => {
  try {
    const value = JSON.parse(raw) as GameState;
    if (!value || value.version !== SAVE_VERSION) return { ok: false, error: "存档版本不兼容" };
    if (!value.inventory || !hasCountMap(value.inventory.seeds, ALL_CROP_IDS)) {
      return { ok: false, error: "种子库存格式不正确" };
    }
    if (!hasCountMap(value.inventory.materials, ALL_CROP_IDS) || !hasCountMap(value.inventory.foods, ALL_RECIPE_IDS)) {
      return { ok: false, error: "库存格式不正确" };
    }
    if (!Array.isArray(value.plots) || value.plots.length !== 3) return { ok: false, error: "土地数据不正确" };
    if (!value.unlocked || !isStringArraySubset(value.unlocked.crops, ALL_CROP_IDS)) {
      return { ok: false, error: "解锁作物数据不正确" };
    }
    if (!isStringArraySubset(value.unlocked.recipes, ALL_RECIPE_IDS)) {
      return { ok: false, error: "解锁食谱数据不正确" };
    }
    if (!isStringArraySubset(value.unlocked.destinations, ALL_DESTINATION_IDS)) {
      return { ok: false, error: "解锁目的地数据不正确" };
    }
    if (!value.bird || typeof value.bird.name !== "string" || !value.settings) {
      return { ok: false, error: "基础设置不正确" };
    }
    if (value.settings.mode !== "demo" && value.settings.mode !== "normal") {
      return { ok: false, error: "演示模式设置不正确" };
    }
    if (!value.album || !Array.isArray(value.album.collected) || !Array.isArray(value.travelLog)) {
      return { ok: false, error: "相册或日志格式不正确" };
    }
    return { ok: true, game: normalizeImportedGame(value) };
  } catch {
    return { ok: false, error: "JSON 解析失败" };
  }
};

const normalizeImportedGame = (value: GameState): GameState => {
  const game = clone(value);
  game.inventory.seeds = { ...emptyCounts(ALL_CROP_IDS), ...game.inventory.seeds };
  game.inventory.materials = { ...emptyCounts(ALL_CROP_IDS), ...game.inventory.materials };
  game.inventory.foods = { ...emptyCounts(ALL_RECIPE_IDS), ...game.inventory.foods };
  game.album.collected = game.album.collected.filter((entry) => ALL_POSTCARD_IDS.includes(entry.postcardId));
  return game;
};

export const exportSave = (state: GameState) => JSON.stringify(state, null, 2);
