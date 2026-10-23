import type { Language, TranslationKey } from "../i18n/dictionary";
export type Mode = "demo" | "normal";

export type BirdLocation = "room" | "garden";
export type GardenSpotId =
  | "door" | "door-inside" | "path-right" | "path-center" | "soil" | "sun"
  | "forage" | "forage-left" | "forage-center" | "forage-right";
export type RoomSpotId = "branch" | "bed" | "trunk";
export type BirdActivityId =
  | "room-idle" | "room-ruffle" | "room-read" | "room-write" | "room-flight" | "room-sleep" | "room-wake" | "room-land" | "room-leave" | "room-arrive"
  | "garden-arrive" | "garden-walk" | "garden-inspect"
  | "garden-preen" | "garden-forage"
  | "garden-water-pickup" | "garden-water-pour" | "garden-water-putdown"
  | "garden-sunbathe" | "garden-leave";

export interface BirdRoutineState {
  location: BirdLocation;
  activity: BirdActivityId;
  previousActivity?: BirdActivityId | null;
  gardenSpot?: GardenSpotId;
  walkFrom?: GardenSpotId | null;
  walkTo?: GardenSpotId | null;
  roomSpot?: RoomSpotId;
  flightFrom?: RoomSpotId | null;
  flightTo?: RoomSpotId | null;
  plannedActivity?: BirdActivityId | null;
  activityStartedAt: number;
  nextDecisionAt: number;
  sequenceStep: number;
}

export type CropId = "wheat" | "carrot" | "strawberry";
export type RecipeId = "strawberry-cloud-bun" | "carrot-crescent-crisp" | "tricolor-travel-bites";
export type FoodId = RecipeId;
export type FoodTag = "near-sharing" | "trail-picnic" | "far-feast";
export type DestinationId = "wind_field" | "moss_forest" | "salt_town";
export type PostcardId =
  | "first-dandelion-hill-selfie"
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
  // Reserved for the next departure flow; legacy journeys have no name snapshot.
  birdNameSnapshot?: string;
  birdVariant?: BirdVariant;
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
  // Missing on legacy saves means this channel has not been claimed.
  postcardClaimed?: boolean;
  seedRewardsClaimed?: boolean;
}

export type TravelStatus = "home" | "ready" | "travelling" | "returned";

export interface PendingPostcardReward {
  journeyId: string;
  postcardId: PostcardId;
  story: string;
  birdNameSnapshot?: string;
  birdVariant?: BirdVariant;
  travelDate: number;
}

export interface PendingBagReward {
  journeyId: string;
  reward: JourneyReward;
}

export interface TravelState {
  status: TravelStatus;
  readyAt: number | null;
  plannedDepartureAt: number | null;
  departedAt: number | null;
  plannedReturnAt: number | null;
  returnedAt: number | null;
  returnNoticeAcknowledgedAt: number | null;
  pendingPostcards: PendingPostcardReward[];
  pendingBagRewards: PendingBagReward[];
}

export interface AlbumEntry {
  postcardId: PostcardId;
  firstCollectedAt: number;
  firstJourneyId: string;
  firstStory: string;
  // Future collection code must copy these from the departure snapshot.
  birdNameSnapshot?: string;
  birdVariant?: BirdVariant;
  travelDate?: number;
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
  language: Language;
  mode: Mode;
  seenIntro: boolean;
}

export interface GameState {
  foodMigration?: { revision: 1; originalRaw: string };
  version: 1;
  createdAt: number;
  updatedAt: number;
  bird: {
    name: string;
    routine: BirdRoutineState;
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
    destinationId: DestinationId | null;
  };
  travel: TravelState;
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
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  ingredients: Partial<CountMap<CropId>>;
  effect: string;
  preferredDestinationId: DestinationId;
  referenceValue: number;
  artKey: string;
  travelBand: "near" | "middle" | "far";
  postcardCountMin: number;
  postcardCountMax: number;
  returnTimeMultiplier: number;
  friendChanceModifier: number;
  destinationTags: ("sunny" | "shady" | "waterside" | "highland")[];
  eventTags: FoodTag[];
  unlockCondition: { type: "recipe-unlocked" };
  isStarterFood: boolean;
}

export interface DestinationDefinition {
  id: DestinationId;
  name: string;
  description: string;
  postcardPool: PostcardId[];
}

export interface TravelEventDefinition {
  id: string;
  foodId: FoodId;
  destinationId: DestinationId;
  foodTags: FoodTag[];
  weight: number;
  title: string;
  text: string;
}

export interface PostcardDefinition {
  id: PostcardId;
  destinationId: DestinationId;
  title: string;
  storySeed: string;
  frontArtKey: string;
  friend: "rabbit" | "deer" | "seal" | null;
  timeOfDay: "morning" | "day" | "evening" | "night";
}

export type BirdVariant = "blue-quaker" | "cockatiel";
export interface FirstTripPostcardDefinition extends PostcardDefinition {
  locationNameKey: TranslationKey;
  messageKey: TranslationKey;
  foodAffinity: FoodId[];
  storyVariant: "first-solo-selfie";
  birdArtVariants: Record<BirdVariant, string | null>;
  frontArtKey: string;
  backArtKey: string;
  isFirstTripGuaranteed: true;
  sortOrder: number;
}

// Explicit immutable render contract, independent of current settings/name.
export interface PostcardSnapshot {
  postcardId: "first-dandelion-hill-selfie";
  birdVariant: BirdVariant;
  birdNameSnapshot: string;
  travelDate: number | null;
}
