import type {
  CropDefinition,
  CropId,
  DestinationDefinition,
  DestinationId,
  FoodId,
  FirstTripPostcardDefinition,
  JourneyReward,
  PostcardDefinition,
  PostcardId,
  RecipeDefinition,
  TravelEventDefinition
} from "./types";
import { translate } from "../i18n/dictionary";

export const SAVE_VERSION = 1;

// 角色表现与存档经济独立；全部以毫秒计。
export const BIRD_TIMINGS = {
  happyMs: 3_000,
  idleMs: 60_000,
  clickWindowMs: 3_000,
  angryClicks: 6,
  calmDownMs: 8_000,
  tickMs: 200
} as const;

export const MODE_TIMINGS = {
  demo: {
    cookingMs: 3_000,
    travelMs: 15_000
  },
  normal: {
    cookingMs: 10_000,
    travelMs: 5 * 60_000
  }
} as const;

export const CROPS: Record<CropId, CropDefinition> = {
  wheat: {
    id: "wheat",
    name: "小麦",
    seedName: "小麦种子",
    materialName: "小麦",
    demoMs: 5_000,
    normalMs: 2 * 60_000
  },
  carrot: {
    id: "carrot",
    name: "胡萝卜",
    seedName: "胡萝卜种子",
    materialName: "胡萝卜",
    demoMs: 5_000,
    normalMs: 3 * 60_000
  },
  strawberry: {
    id: "strawberry",
    name: "草莓",
    seedName: "草莓种子",
    materialName: "草莓",
    demoMs: 5_000,
    normalMs: 5 * 60_000
  }
};

// Compatibility display properties for the retained v1 history views are derived
// from the same dictionary. Cooking and packing share this one configuration.
const defineFood = (food: Omit<RecipeDefinition, "name" | "effect">): RecipeDefinition => ({
  ...food, name: translate("zh-CN", food.nameKey), effect: translate("zh-CN", food.descriptionKey),
});
export const FIRST_TRIP_FOOD_ID = "strawberry-cloud-bun" as const;
export const FOODS: Record<FoodId, RecipeDefinition> = {
  "strawberry-cloud-bun": defineFood({
    id: "strawberry-cloud-bun", nameKey: "food.bun.name", descriptionKey: "food.bun.description",
    ingredients: { wheat: 1, strawberry: 1 }, referenceValue: 10,
    artKey: "/art/foods/food-strawberry-cloud-bun.png",
    travelBand: "near", postcardCountMin: 1, postcardCountMax: 1,
    returnTimeMultiplier: 1, friendChanceModifier: 0, destinationTags: ["sunny", "shady"],
    eventTags: ["near-sharing"],
    unlockCondition: { type: "recipe-unlocked" }, isStarterFood: true, preferredDestinationId: "wind_field",
  }),
  "carrot-crescent-crisp": defineFood({
    id: "carrot-crescent-crisp", nameKey: "food.crisp.name", descriptionKey: "food.crisp.description",
    ingredients: { wheat: 1, carrot: 1 }, referenceValue: 20,
    artKey: "/art/foods/food-carrot-crescent-crisp.png",
    travelBand: "middle", postcardCountMin: 1, postcardCountMax: 2,
    returnTimeMultiplier: 0.9, friendChanceModifier: 0.03, destinationTags: ["shady", "waterside"],
    eventTags: ["trail-picnic"],
    unlockCondition: { type: "recipe-unlocked" }, isStarterFood: false, preferredDestinationId: "moss_forest",
  }),
  "tricolor-travel-bites": defineFood({
    id: "tricolor-travel-bites", nameKey: "food.bites.name", descriptionKey: "food.bites.description",
    ingredients: { wheat: 1, carrot: 1, strawberry: 1 }, referenceValue: 50,
    artKey: "/art/foods/food-tricolor-travel-bites.png",
    travelBand: "far", postcardCountMin: 2, postcardCountMax: 3,
    returnTimeMultiplier: 1.15, friendChanceModifier: 0.10, destinationTags: ["sunny", "waterside", "highland"],
    eventTags: ["far-feast"],
    unlockCondition: { type: "recipe-unlocked" }, isStarterFood: false, preferredDestinationId: "salt_town",
  }),
};
export const RECIPES = FOODS;

export const DESTINATIONS: Record<DestinationId, DestinationDefinition> = {
  wind_field: {
    id: "wind_field",
    name: "风车田野",
    description: "麦浪沿着风车脚下铺开，邮路从田埂旁经过。",
    postcardPool: ["wind_field_01", "wind_field_02", "wind_field_03"]
  },
  moss_forest: {
    id: "moss_forest",
    name: "苔光森林",
    description: "树根像小桥，苔藓在阴影里发着柔绿的光。",
    postcardPool: ["moss_forest_01", "moss_forest_02", "moss_forest_03"]
  },
  salt_town: {
    id: "salt_town",
    name: "海盐小镇",
    description: "屋顶晾着白帆，空气里有海风和甜点的味道。",
    postcardPool: ["salt_town_01", "salt_town_02", "salt_town_03"]
  }
};

const FOOD_EVENT_TEXT: Record<FoodId, Record<DestinationId, string>> = {
  "strawberry-cloud-bun": {
    wind_field: "啾啾把草莓云朵麦包分给修风车的孩子，换来一段顺风的田埂路。",
    moss_forest: "草莓云朵麦包被森林看守蘸了蜂蜜，大家在树洞边交换各自的路线。",
    salt_town: "码头上的船长喜欢这份面包的麦香，给啾啾讲了傍晚潮汐。"
  },
  "carrot-crescent-crisp": {
    wind_field: "胡萝卜月牙脆饼在麦田边被切成小块，路过的园丁送来新鲜泥土的消息。",
    moss_forest: "啾啾带胡萝卜月牙脆饼参加森林野餐，苔光一路把脚印照得亮亮的。",
    salt_town: "海边面包房闻到胡萝卜月牙脆饼的香气，请啾啾坐在窗边避风。"
  },
  "tricolor-travel-bites": {
    wind_field: "三色旅行小团子让田野午后变得红扑扑，啾啾把甜果留给赶路的人。",
    moss_forest: "森林里的小餐布铺开，三色旅行小团子像一盏小灯，照出回家的方向。",
    salt_town: "啾啾带三色旅行小团子遇见海边下午茶，杯沿的盐花闪着细小的光。"
  }
};

export const TRAVEL_EVENTS: TravelEventDefinition[] = Object.entries(FOOD_EVENT_TEXT).flatMap(
  ([foodId, byDestination]) =>
    Object.entries(byDestination).map(([destinationId, text]) => ({
      id: `${foodId}_${destinationId}`,
      foodId: foodId as FoodId,
      destinationId: destinationId as DestinationId,
      foodTags: FOODS[foodId as FoodId].eventTags,
      weight: 1,
      title:
        foodId === "strawberry-cloud-bun"
          ? "分享面包"
          : foodId === "carrot-crescent-crisp"
            ? "森林野餐"
            : "海边下午茶",
      text
    }))
);

const LEGACY_POSTCARDS: Record<Exclude<PostcardId, "first-dandelion-hill-selfie">, PostcardDefinition> = {
  wind_field_01: {
    id: "wind_field_01",
    destinationId: "wind_field",
    title: "晨风风车",
    storySeed: "清晨的风车把云影慢慢推开，麦穗像一封封还没寄出的信。"
  },
  wind_field_02: {
    id: "wind_field_02",
    destinationId: "wind_field",
    title: "田埂邮路",
    storySeed: "田埂尽头有一只蓝色邮箱，里面躺着晒过太阳的问候。"
  },
  wind_field_03: {
    id: "wind_field_03",
    destinationId: "wind_field",
    title: "黄昏麦浪",
    storySeed: "黄昏时麦浪一层一层亮起，像小鸟翅膀掠过金色水面。"
  },
  moss_forest_01: {
    id: "moss_forest_01",
    destinationId: "moss_forest",
    title: "苔光小径",
    storySeed: "苔藓在树影下发亮，啾啾沿着绿色微光找到安静的小径。"
  },
  moss_forest_02: {
    id: "moss_forest_02",
    destinationId: "moss_forest",
    title: "树洞茶会",
    storySeed: "树洞里摆着木杯和叶盘，雨声被枝叶筛成细细的鼓点。"
  },
  moss_forest_03: {
    id: "moss_forest_03",
    destinationId: "moss_forest",
    title: "蘑菇灯塔",
    storySeed: "高高的蘑菇像灯塔，替迷路的脚步保留一盏柔软的光。"
  },
  salt_town_01: {
    id: "salt_town_01",
    destinationId: "salt_town",
    title: "白帆街角",
    storySeed: "白帆在街角轻轻鼓起，像小镇把海风折成了明信片。"
  },
  salt_town_02: {
    id: "salt_town_02",
    destinationId: "salt_town",
    title: "盐花码头",
    storySeed: "码头木板上落着盐花，走过去会听见很远的浪声。"
  },
  salt_town_03: {
    id: "salt_town_03",
    destinationId: "salt_town",
    title: "海边点心铺",
    storySeed: "点心铺的窗子总是温热，草莓和海盐在盘子里悄悄握手。"
  }
};

export const FIRST_TRIP_POSTCARD_ID = "first-dandelion-hill-selfie" as const;
export const FIRST_TRIP_POSTCARD: FirstTripPostcardDefinition = {
  id: FIRST_TRIP_POSTCARD_ID,
  locationNameKey: "postcard.location", messageKey: "postcard.message",
  title: translate("zh-CN", "postcard.location"), storySeed: translate("zh-CN", "postcard.message"),
  destinationId: "wind_field", foodAffinity: [FIRST_TRIP_FOOD_ID],
  storyVariant: "first-solo-selfie",
  birdArtVariants: {
    "blue-quaker": "/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-v2-no-visible-nares.png",
    cockatiel: null,
  },
  frontArtKey: "/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-v2-no-visible-nares.png",
  backArtKey: "/art/postcards/postcard-paper-back-dandelion.webp",
  isFirstTripGuaranteed: true, sortOrder: 0,
};
export const POSTCARDS = { ...LEGACY_POSTCARDS, [FIRST_TRIP_POSTCARD_ID]: FIRST_TRIP_POSTCARD };

export const ALL_CROP_IDS = Object.keys(CROPS) as CropId[];
export const ALL_RECIPE_IDS = Object.keys(RECIPES) as FoodId[];
export const ALL_DESTINATION_IDS = Object.keys(DESTINATIONS) as DestinationId[];
// Keep the existing random pool exactly as it was. Content registry is separate.
export const ALL_POSTCARD_IDS = Object.keys(LEGACY_POSTCARDS) as PostcardId[];
export const ALL_REGISTERED_POSTCARD_IDS = Object.keys(POSTCARDS) as PostcardId[];

export const TEACHING_TRIP_REWARDS: Record<1 | 2, JourneyReward> = {
  1: {
    seeds: { carrot: 1 },
    materials: {},
    unlocks: { crops: ["carrot"], recipes: ["carrot-crescent-crisp"], destinations: ["moss_forest"] }
  },
  2: {
    seeds: { strawberry: 1 },
    materials: {},
    unlocks: { crops: ["strawberry"], recipes: ["tricolor-travel-bites"], destinations: ["salt_town"] }
  }
};

export const REGULAR_TRAVEL_REWARD_POOLS: Record<DestinationId, { cropId: CropId }> = {
  wind_field: { cropId: "wheat" },
  moss_forest: { cropId: "carrot" },
  salt_town: { cropId: "strawberry" }
};
