import {
  ALL_CROP_IDS,
  ALL_DESTINATION_IDS,
  ALL_POSTCARD_IDS,
  ALL_REGISTERED_POSTCARD_IDS,
  ALL_RECIPE_IDS,
  CROPS,
  DESTINATIONS,
  FIRST_TRIP_POSTCARD_ID,
  MODE_TIMINGS,
  POSTCARDS,
  RECIPES,
  REGULAR_TRAVEL_REWARD_POOLS,
  SAVE_VERSION,
  TEACHING_TRIP_REWARDS,
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
import { migrateFoodReferences } from "./foodMigration";

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
    materials: { ...emptyCounts(ALL_CROP_IDS), wheat: 2, strawberry: 1 },
    foods: emptyCounts(ALL_RECIPE_IDS)
  },
  plots: ["plot-1", "plot-2", "plot-3"].map((id) => ({ id, cropId: null, plantedAt: null, readyAt: null })),
  cooking: null,
  unlocked: {
    crops: ["wheat"],
    recipes: ["strawberry-cloud-bun"],
    destinations: ["wind_field"]
  },
  bag: { foodId: null, destinationId: null },
  currentJourney: null,
  album: { collected: [] },
  travelLog: [],
  settings: { language: "zh-CN", mode, seenIntro: false }
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

export const getTravelPhase = (state: GameState, now = Date.now()) => {
  if (state.currentJourney) {
    const phase = getJourneyPhase(state.currentJourney, now);
    return phase.kind === "traveling" ? { ...phase, kind: "travelling" as const } : phase;
  }
  if (state.bag.destinationId || state.bag.foodId) {
    return { kind: "preparing" as const, progress: 0, remainingMs: 0 };
  }
  return { kind: "home" as const, progress: 1, remainingMs: 0 };
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

export const setBagFood = (state: GameState, foodId: FoodId | null, now = Date.now()): GameState => {
  if (state.currentJourney) throw new Error("旅程中的行囊暂不可更改");
  if (foodId !== null && (!ALL_RECIPE_IDS.includes(foodId) || state.inventory.foods[foodId] < 1)) throw new Error("食物库存不足");
  return touch({ ...clone(state), bag: { ...state.bag, foodId } }, now);
};

export const setBagDestination = (state: GameState, destinationId: DestinationId, now = Date.now()): GameState => {
  if (state.currentJourney) throw new Error("旅程中的行囊暂不可更改");
  if (!state.unlocked.destinations.includes(destinationId)) throw new Error("目的地尚未解锁");
  return touch({ ...clone(state), bag: { ...state.bag, destinationId } }, now);
};

const choosePostcard = (state: GameState, destinationId: DestinationId, rng: Rng): PostcardId => {
  const candidates = DESTINATIONS[destinationId].postcardPool.filter((id) => ALL_POSTCARD_IDS.includes(id));
  const collected = new Set(state.album.collected.map((entry) => entry.postcardId));
  const unseen = candidates.filter((id) => !collected.has(id));
  const pool = unseen.length > 0 ? unseen : candidates;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * pool.length));
  return pool[index];
};

const chooseTravelEvent = (foodId: FoodId, destinationId: DestinationId, rng: Rng) => {
  const foodTags = new Set(RECIPES[foodId].eventTags);
  const candidates = TRAVEL_EVENTS.filter((event) =>
    event.foodId === foodId
      && event.destinationId === destinationId
      && event.foodTags.some((tag) => foodTags.has(tag))
  );
  const totalWeight = candidates.reduce((total, event) => total + event.weight, 0);
  if (candidates.length === 0 || totalWeight <= 0) return null;
  if (candidates.length === 1) return candidates[0];
  let cursor = Math.max(0, Math.min(0.999999, rng())) * totalWeight;
  for (const event of candidates) {
    cursor -= event.weight;
    if (cursor < 0) return event;
  }
  return candidates[candidates.length - 1];
};

const createJourneyId = (now: number, rng: Rng) => `journey-${now.toString(36)}-${Math.floor(rng() * 1_000_000).toString(36)}`;

const createTravelReward = (state: GameState, destinationId: DestinationId): JourneyReward => {
  const travelNumber = state.travelLog.length + 1;
  if (travelNumber === 1 || travelNumber === 2) return clone(TEACHING_TRIP_REWARDS[travelNumber]);

  const reward = createReward();
  const pool = REGULAR_TRAVEL_REWARD_POOLS[destinationId];
  reward.seeds[pool.cropId] = 1;
  return reward;
};

export const startTravel = (state: GameState, now = Date.now(), rng: Rng = Math.random): GameState => {
  if (state.currentJourney && !state.currentJourney.claimed) throw new Error("小鸟正在旅行或等待领取奖励");
  const foodId = state.bag.foodId;
  if (!foodId) throw new Error("请先准备一份食物");
  if (state.inventory.foods[foodId] <= 0) throw new Error("食物库存不足");
  const destinationId = state.bag.destinationId;
  if (!destinationId) throw new Error("请先选择目的地");
  if (!state.unlocked.destinations.includes(destinationId)) throw new Error("目的地尚未解锁");

  const event = chooseTravelEvent(foodId, destinationId, rng);
  if (!event) throw new Error("旅行事件配置缺失");
  const postcardId = state.travelLog.length === 0
    ? FIRST_TRIP_POSTCARD_ID
    : choosePostcard(state, destinationId, rng);
  const reward = createTravelReward(state, destinationId);
  const story = `${event.text} ${POSTCARDS[postcardId].storySeed}`;

  const game = clone(state);
  game.inventory.foods[foodId] -= 1;
  game.currentJourney = {
    birdNameSnapshot: state.bird.name,
    birdVariant: "blue-quaker",
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
      firstStory: journey.story,
      birdNameSnapshot: journey.birdNameSnapshot,
      birdVariant: journey.birdVariant,
      travelDate: journey.startedAt
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
  game.bag = { foodId: null, destinationId: null };
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

const hasPartialCountMap = <T extends string>(value: unknown, ids: readonly T[]) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, amount]) =>
    (ids as readonly string[]).includes(id) && isNonNegativeInteger(amount)
  );
};

const hasJourneyReward = (value: unknown): value is JourneyReward => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const reward = value as Partial<JourneyReward>;
  return hasPartialCountMap(reward.seeds, ALL_CROP_IDS)
    && hasPartialCountMap(reward.materials, ALL_CROP_IDS)
    && Boolean(reward.unlocks)
    && isStringArraySubset(reward.unlocks?.crops, ALL_CROP_IDS)
    && isStringArraySubset(reward.unlocks?.recipes, ALL_RECIPE_IDS)
    && isStringArraySubset(reward.unlocks?.destinations, ALL_DESTINATION_IDS);
};

const hasValidJourney = (value: unknown): value is Journey => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const journey = value as Partial<Journey>;
  return typeof journey.id === "string" && journey.id.length > 0
    && typeof journey.foodId === "string" && ALL_RECIPE_IDS.includes(journey.foodId as FoodId)
    && typeof journey.destinationId === "string" && ALL_DESTINATION_IDS.includes(journey.destinationId as DestinationId)
    && typeof journey.eventId === "string" && journey.eventId.length > 0
    && typeof journey.postcardId === "string" && ALL_REGISTERED_POSTCARD_IDS.includes(journey.postcardId as PostcardId)
    && typeof journey.story === "string"
    && Number.isSafeInteger(journey.startedAt) && Number(journey.startedAt) >= 0
    && Number.isSafeInteger(journey.returnsAt) && Number(journey.returnsAt) >= Number(journey.startedAt)
    && journey.claimed === false
    && (journey.birdNameSnapshot === undefined || typeof journey.birdNameSnapshot === "string")
    && (journey.birdVariant === undefined || journey.birdVariant === "blue-quaker" || journey.birdVariant === "cockatiel")
    && hasJourneyReward(journey.reward);
};

export type ImportResult = { ok: true; game: GameState } | { ok: false; error: string };

export const importSave = (raw: string): ImportResult => {
  try {
    const parsed: unknown = JSON.parse(raw);
    let value: GameState;
    try { value = migrateFoodReferences(parsed, raw) as GameState; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "食物数据迁移失败" }; }
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
    if (value.settings.language !== undefined && value.settings.language !== "zh-CN" && value.settings.language !== "en") {
      return { ok: false, error: "语言设置不正确" };
    }
    if (!value.album || !Array.isArray(value.album.collected) || !Array.isArray(value.travelLog)) {
      return { ok: false, error: "相册或日志格式不正确" };
    }
    if (!value.bag || typeof value.bag !== "object"
      || (value.bag.foodId !== null && !ALL_RECIPE_IDS.includes(value.bag.foodId))
      || (value.bag.destinationId !== undefined && value.bag.destinationId !== null
        && (!ALL_DESTINATION_IDS.includes(value.bag.destinationId)
          || !value.unlocked.destinations.includes(value.bag.destinationId)))) {
      return { ok: false, error: "旅行行囊格式不正确" };
    }
    if (value.currentJourney !== null && !hasValidJourney(value.currentJourney)) {
      return { ok: false, error: "旅行状态格式不正确" };
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
  game.bag = { foodId: game.bag?.foodId ?? null, destinationId: game.bag?.destinationId ?? null };
  game.settings.language ??= "zh-CN";
  if (game.travelLog.length === 0 && game.currentJourney) {
    game.currentJourney.birdNameSnapshot ??= game.bird.name;
    game.currentJourney.birdVariant ??= "blue-quaker";
    if (game.currentJourney.postcardId !== FIRST_TRIP_POSTCARD_ID) {
      const event = TRAVEL_EVENTS.find((candidate) => candidate.id === game.currentJourney?.eventId);
      game.currentJourney.postcardId = FIRST_TRIP_POSTCARD_ID;
      if (event) game.currentJourney.story = `${event.text} ${POSTCARDS[FIRST_TRIP_POSTCARD_ID].storySeed}`;
    }
  }
  // Do not filter historical collection entries during a food-only migration.
  return game;
};

export const exportSave = (state: GameState) => JSON.stringify(state, null, 2);
