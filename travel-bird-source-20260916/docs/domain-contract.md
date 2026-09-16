# V2 domain integration contract

Prepared during stage A; production implementation starts after the visual checkpoint.

## IDs and configuration

- `BirdSpecies = "blue_quaker" | "cockatiel"`; `Language = "zh-CN" | "en"`.
- `CropId = "millet" | "pumpkin" | "berries"`.
- `RecipeId = "millet_bites" | "pumpkin_cakes" | "berry_picnic"`; `FoodId` also includes `"emergency_meal"`.
- Destinations: `forest`, `creek`, `countryside`, `cliffs`; postcard IDs are each destination followed by `_01` or `_02`.
- Souvenirs: `pinecone`, `river_stone`, `dried_flowers`, `stone_flake`.
- Decorations: `bird_cushion`, `leaf_rug`, `feather_mobile`.
- Configuration exports `CROPS`, `RECIPES`, `FOODS`, `DESTINATIONS`, `POSTCARDS`, `SOUVENIRS`, `DECORATIONS`, `BIRDS`, `TIMINGS`, `ECONOMY`, and `ALL_*_IDS` arrays. Display properties (`name`, `description`, `title`, `body`, `effect`, `foodThought`) are `{ "zh-CN": string, en: string }` and selected with `localize(text, language)`.
- `CROPS[id].growMs`; `RECIPES[id].ingredients`; `FOODS[id].weights` records four destination probabilities; `DECORATIONS[id].price` and `.placement`.
- Keep existing `BIRD_TIMINGS` export and `birdMood` API (`calm/happy/sleepy/angry`); configure five clicks in five seconds.

## Persisted state

`GameState` has `schemaVersion: 2`, `createdAt`, `updatedAt`, `lastSettledAt`, `coins`.

- `bird: { species, name, names: Record<BirdSpecies,string> }`.
- `inventory: { seeds: Record<CropId,number>, materials: Record<CropId,number>, foods: Record<FoodId,number>, souvenirs: Record<SouvenirId,number> }`.
- `plots: Array<{ id, cropId: CropId|null, plantedAt:number|null, readyAt:number|null }>` exactly three.
- `bag: { foodId:FoodId|null, packedAt:number|null, departAt:number|null, randomSeed:number|null, journeyId:string|null }`.
- `currentJourney: Journey|null`. Journey contains `id`, `birdSpecies`, `birdName`, `foodId`, `destinationId`, `postcardId`, `reward:{ seeds:Partial<Record<CropId,number>>, souvenirs:Partial<Record<SouvenirId,number>> }`, `startedAt`, `mailAt`, `returnsAt`, `mailDelivered`, `claimed`, `status:"traveling"|"returned_unclaimed"`. Legacy journeys can additionally carry `legacyStory` and `reward.materials`.
- `mail: Array<{ id, journeyId, postcardId, birdSpecies, birdName, foodId, destinationId, receivedAt, readAt:number|null, legacyStory?:string }>`; one mail per journey.
- `album.collected: Array<{ postcardId,birdSpecies,count,firstCollectedAt,firstJourneyId,firstBirdName }>` groups by postcard ID + species.
- `travelLog: Journey[]` stores claimed journeys. `decorations:Record<DecorationId,{owned:boolean,visible:boolean}>`.
- `settings: { language, volume:number (0..1), muted:boolean, seenIntro:boolean }`; `onboarding: { starterGranted:boolean, firstJourneyCompleted:boolean }`.
- Optional `migration` keeps original raw v1 save, explanatory notes, and original collection records. No legacy data is silently discarded.

## Pure operations exported by game.ts

Every operation returns a new `GameState`, uses effective time `max(now,lastSettledAt)`, and is safe with React functional updates. Failures throw `Error` with stable dictionary keys.

```ts
createNewGame(now?, language?: Language): GameState
settleGame(state, now?): GameState
getTravelStatus(state): "home"|"packed"|"traveling"|"returned_unclaimed"
getCropPhase(plot, now?): {kind:"empty"|"growing"|"ready",progress,remainingMs}
getJourneyPhase(journey, now?): {kind:"home"|"traveling"|"returned",progress,remainingMs}
startPlanting(state, plotId, cropId, now?): GameState
harvestPlot(state, plotId, now?): GameState
getMissingIngredients(state, recipeId): Array<{cropId,needed,owned}>
cookFood(state, recipeId, now?): GameState // immediate, atomic; startCooking alias
setBagFood(state, foodId:FoodId|null, now?): GameState // replace/take out returns prior food
prepareBag(state, now?, rng?:()=>number): GameState // planned departure, startTravel alias
cancelPacking(state, now?): GameState // keeps food in bag; setBagFood(null) returns it
readMail(state, mailId, now?): GameState
claimTravel(state, now?, journeyId?): GameState // idempotent, no second reward
renameBird(state, name, now?): GameState
switchBird(state, species, now?): GameState // home only, cancel packed plan first
setLanguage(state, language, now?): GameState
setAudioSettings(state, {volume?,muted?}, now?): GameState
markIntroSeen(state, now?): GameState // never grants resources again
buySeed(state, cropId, now?): GameState
buyEmergencyMeal(state, now?): GameState
buyDecoration(state, decorationId, now?): GameState
toggleDecoration(state, decorationId, now?): GameState
runBetaTool(state, "mature_crops"|"mail"|"return"|"coins", now?): GameState
importSave(raw:string): {ok:true,game,migrated:boolean,warnings:string[]}|{ok:false,error:string}
exportSave(state): string
```

`settleGame` is called on load, foreground and ticks. Packing stores one random seed; departure deterministically derives and saves all outcomes, based on the planned departure timestamp. Mail delivery and return use distinct persisted flags; advancing over both processes them in order and starts no further trip. Reading mail does not claim gifts, and claiming gifts leaves unread mail intact. The first journey uses forest / 5-second packing / 60-second mail / 90-second return; later trips use 10-second packing and 6–10-minute duration with mail at 60%.

New games get 500 coins, each seed ×3, each material ×2, zero foods/souvenirs, and three empty plots. Harvest yields two material and six coins (no seed refund; the spec's seed purchases / travel rewards fund further planting). Cooking costs two of its matching material and immediately gives one food. Seed prices 3, emergency meal 6, decorations 30/45/60. All content is available immediately.

## Persistence / migration

Use a new v2 storage key. Read `travel-bird-save-v1` as fallback and preserve the raw old key before writing a new one. On parse/validation/storage failure, surface a localized recovery message; do not clear the stored data.

V1 mapping: wheat→millet, carrot→pumpkin, strawberry→berries; bread→millet_bites, carrot_cake→pumpkin_cakes, strawberry_bento→berry_picnic; wind_field→countryside, moss_forest→forest, salt_town→creek. Old third postcard variants map to the second variant for current mechanics only; their exact old records and story text remain archived in migration metadata. These are thematic substitutions, not claims that old art or recipes are identical. Valid active timestamps and earned pending rewards survive; old unlock restrictions are lifted because all v2 recipes/destinations are initially available. Unknown schema versions or malformed nested records are rejected with an error, never reset silently.

## Stable error keys

`error.invalidCrop`, `error.invalidFood`, `error.invalidBird`, `error.invalidDecoration`, `error.invalidPlot`, `error.noSeeds`, `error.plotOccupied`, `error.noCrop`, `error.cropGrowing`, `error.noMaterials`, `error.noFood`, `error.birdAway`, `error.cancelPacking`, `error.packagePending`, `error.bagEmpty`, `error.alreadyPacked`, `error.notReturned`, `error.invalidName`, `error.noCoins`, `error.alreadyOwned`, `error.notOwned`, `error.noJourney`, `error.invalidSettings`, `error.invalidSave`, `error.saveVersion`, `error.saveJson`.
