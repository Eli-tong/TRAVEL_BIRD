export type Mode = "demo" | "normal";

export type CropId = "wheat" | "carrot" | "strawberry";
export type RecipeId = "bread" | "carrot_cake" | "strawberry_bento";
export type FoodId = RecipeId;
export type DestinationId = "wind_field" | "moss_forest" | "salt_town";
export type PostcardId =
  | "wind_field_01"
  | "wind_field_02"
  | "wind_field_03"
  | "moss_forest_01"
  | "moss_forest_02"
  | "moss_forest_03"
  | "salt_town_01"
  | "salt_town_02"
  | "salt_town_03";

export type CountMap<T extends string> = Record<T, number>;

export interface Inventory {
  seeds: CountMap<CropId>;
  materials: CountMap<CropId>;
  foods: CountMap<FoodId>;
}

export interface Plot {
  id: string;
  cropId: CropId | null;
  plantedAt: number | null;
  readyAt: number | null;
}

export interface CookingTask {
  recipeId: RecipeId;
  startedAt: number;
  readyAt: number;
  claimed: boolean;
}

export interface JourneyReward {
  seeds: Partial<CountMap<CropId>>;
  materials: Partial<CountMap<CropId>>;
  unlocks: {
    crops: CropId[];
    recipes: RecipeId[];
    destinations: DestinationId[];
  };
}

export interface Journey {
  id: string;
  foodId: FoodId;
  destinationId: DestinationId;
  eventId: string;
  postcardId: PostcardId;
  story: string;
  reward: JourneyReward;
  startedAt: number;
  returnsAt: number;
  claimed: boolean;
}

export interface AlbumEntry {
  postcardId: PostcardId;
  firstCollectedAt: number;
  firstJourneyId: string;
  firstStory: string;
}

export interface TravelLogEntry {
  journeyId: string;
  date: number;
  foodId: FoodId;
  destinationId: DestinationId;
  eventId: string;
  postcardId: PostcardId;
  reward: JourneyReward;
  story: string;
}

export interface GameSettings {
  mode: Mode;
  seenIntro: boolean;
}

export interface GameState {
  version: 1;
  createdAt: number;
  updatedAt: number;
  bird: {
    name: string;
  };
  inventory: Inventory;
  plots: Plot[];
  cooking: CookingTask | null;
  unlocked: {
    crops: CropId[];
    recipes: RecipeId[];
    destinations: DestinationId[];
  };
  bag: {
    foodId: FoodId | null;
  };
  currentJourney: Journey | null;
  album: {
    collected: AlbumEntry[];
  };
  travelLog: TravelLogEntry[];
  settings: GameSettings;
}

export interface CropDefinition {
  id: CropId;
  name: string;
  normalMs: number;
  demoMs: number;
  materialName: string;
  seedName: string;
}

export interface RecipeDefinition {
  id: RecipeId;
  name: string;
  ingredients: Partial<CountMap<CropId>>;
  effect: string;
  preferredDestinationId: DestinationId;
}

export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  description: string;
}

export interface TravelEventDefinition {
  id: string;
  foodId: FoodId;
  destinationId: DestinationId;
  title: string;
  text: string;
}

export interface PostcardDefinition {
  id: PostcardId;
  destinationId: DestinationId;
  title: string;
  storySeed: string;
}
