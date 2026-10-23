import type { CropId, DestinationId, FoodId, PostcardId } from "../domain/types";
import type { TranslationKey } from "./dictionary";

export type Translator = (key: TranslationKey, values?: Record<string, string | number>) => string;

const seedKeys: Record<CropId, TranslationKey> = {
  wheat: "crop.wheat.seed",
  carrot: "crop.carrot.seed",
  strawberry: "crop.strawberry.seed"
};

const cropKeys: Record<CropId, TranslationKey> = {
  wheat: "crop.wheat",
  carrot: "crop.carrot",
  strawberry: "crop.strawberry"
};

const destinationKeys: Record<DestinationId, { name: TranslationKey; description: TranslationKey }> = {
  wind_field: { name: "destination.wind_field.name", description: "destination.wind_field.description" },
  moss_forest: { name: "destination.moss_forest.name", description: "destination.moss_forest.description" },
  salt_town: { name: "destination.salt_town.name", description: "destination.salt_town.description" }
};

const postcardKeys: Record<PostcardId, { title: TranslationKey; story: TranslationKey }> = {
  "first-dandelion-hill-selfie": { title: "postcard.location", story: "postcard.message" },
  wind_field_01: { title: "postcard.wind_field_01.title", story: "postcard.wind_field_01.story" },
  wind_field_02: { title: "postcard.wind_field_02.title", story: "postcard.wind_field_02.story" },
  wind_field_03: { title: "postcard.wind_field_03.title", story: "postcard.wind_field_03.story" },
  moss_forest_01: { title: "postcard.moss_forest_01.title", story: "postcard.moss_forest_01.story" },
  moss_forest_02: { title: "postcard.moss_forest_02.title", story: "postcard.moss_forest_02.story" },
  moss_forest_03: { title: "postcard.moss_forest_03.title", story: "postcard.moss_forest_03.story" },
  salt_town_01: { title: "postcard.salt_town_01.title", story: "postcard.salt_town_01.story" },
  salt_town_02: { title: "postcard.salt_town_02.title", story: "postcard.salt_town_02.story" },
  salt_town_03: { title: "postcard.salt_town_03.title", story: "postcard.salt_town_03.story" }
};

const eventKeys: Record<string, TranslationKey> = {
  "strawberry-cloud-bun_wind_field": "travel.event.bun.wind_field",
  "strawberry-cloud-bun_moss_forest": "travel.event.bun.moss_forest",
  "strawberry-cloud-bun_salt_town": "travel.event.bun.salt_town",
  "carrot-crescent-crisp_wind_field": "travel.event.crisp.wind_field",
  "carrot-crescent-crisp_moss_forest": "travel.event.crisp.moss_forest",
  "carrot-crescent-crisp_salt_town": "travel.event.crisp.salt_town",
  "tricolor-travel-bites_wind_field": "travel.event.bites.wind_field",
  "tricolor-travel-bites_moss_forest": "travel.event.bites.moss_forest",
  "tricolor-travel-bites_salt_town": "travel.event.bites.salt_town"
};

export const cropName = (t: Translator, id: CropId) => t(cropKeys[id]);
export const seedName = (t: Translator, id: CropId) => t(seedKeys[id]);
export const foodName = (t: Translator, id: FoodId) => {
  const keys: Record<FoodId, TranslationKey> = {
    "strawberry-cloud-bun": "food.bun.name",
    "carrot-crescent-crisp": "food.crisp.name",
    "tricolor-travel-bites": "food.bites.name"
  };
  return t(keys[id]);
};
export const destinationName = (t: Translator, id: DestinationId) => t(destinationKeys[id].name);
export const destinationDescription = (t: Translator, id: DestinationId) => t(destinationKeys[id].description);
export const postcardTitle = (t: Translator, id: PostcardId) => t(postcardKeys[id].title);
export const postcardStory = (t: Translator, id: PostcardId) => t(postcardKeys[id].story);
export const travelEventText = (t: Translator, eventId: string, birdName: string, fallback: string) => {
  const key = eventKeys[eventId];
  return key ? t(key, { birdName }) : fallback;
};
