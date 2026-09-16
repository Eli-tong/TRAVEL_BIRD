import { describe, expect, test } from "vitest";
import { claimTravel, createNewGame, exportSave, importSave, settleGame } from "./game";

const t0 = Date.UTC(2026, 8, 12, 10);
const oldSave = () => ({
  version: 1, createdAt: t0, updatedAt: t0,
  bird: {name:"旧名字"},
  inventory:{seeds:{wheat:3,carrot:2,strawberry:1},materials:{wheat:4,carrot:3,strawberry:2},foods:{bread:2,carrot_cake:1,strawberry_bento:0}},
  plots:[{id:"plot-1",cropId:"carrot",plantedAt:t0,readyAt:t0+5_000},{id:"plot-2",cropId:null,plantedAt:null,readyAt:null},{id:"plot-3",cropId:null,plantedAt:null,readyAt:null}],
  cooking:{recipeId:"bread",startedAt:t0,readyAt:t0+3_000,claimed:false},
  unlocked:{crops:["wheat","carrot"],recipes:["bread","carrot_cake"],destinations:["wind_field","moss_forest"]},
  bag:{foodId:"bread"},
  currentJourney:{id:"old-trip",foodId:"bread",destinationId:"moss_forest",eventId:"bread_moss_forest",postcardId:"moss_forest_03",story:"这是旧旅途的原始正文。",reward:{seeds:{carrot:1},materials:{},unlocks:{crops:["carrot"],recipes:["carrot_cake"],destinations:["moss_forest"]}},startedAt:t0,returnsAt:t0+15_000,claimed:false},
  album:{collected:[{postcardId:"wind_field_03",firstCollectedAt:t0,firstJourneyId:"older-trip",firstStory:"旧麦浪的故事。"}]},
  travelLog:[{journeyId:"older-trip",date:t0,foodId:"bread",destinationId:"wind_field",eventId:"bread_wind_field",postcardId:"wind_field_03",story:"旧麦浪的故事。",reward:{seeds:{carrot:1},materials:{},unlocks:{crops:["carrot"],recipes:["carrot_cake"],destinations:["moss_forest"]}}}],
  settings:{mode:"demo",seenIntro:true}
});

describe("validated v1→v2 save migration", () => {
  test("valid v2 saves round-trip without losing state", () => {
    const state=createNewGame(t0);
    const imported=importSave(exportSave(state));
    expect(imported.ok).toBe(true);
    if(imported.ok){expect(imported.game).toEqual(state);expect(imported.migrated).toBe(false);}
  });
  test("legacy balances, inventories, plots, pending cooking and earned travel rewards survive", () => {
    const old=oldSave();
    const raw=JSON.stringify({...old,coins:137});
    const imported=importSave(raw);
    expect(imported.ok).toBe(true);
    if(!imported.ok)return;
    expect(imported.migrated).toBe(true);
    expect(imported.warnings.length).toBeGreaterThan(0);
    expect(imported.game.migration?.originalRaw).toBe(raw);
    expect(imported.game.coins).toBe(137);
    expect(imported.game.inventory.seeds).toEqual({millet:3,pumpkin:2,berries:1});
    expect(imported.game.inventory.foods.millet_bites).toBe(2);
    expect(imported.game.plots[0]).toEqual({...old.plots[0],cropId:"pumpkin"});
    expect(imported.game.currentJourney?.startedAt).toBe(t0);
    expect(imported.game.currentJourney?.returnsAt).toBe(t0+15_000);
    expect(imported.game.bag.foodId).toBeNull();
    let continued=settleGame(imported.game,t0+20_000);
    expect(continued.inventory.foods.millet_bites).toBe(3);
    expect(continued.mail[0].legacyStory).toBe("这是旧旅途的原始正文。");
    continued=claimTravel(continued,t0+20_000);
    expect(continued.inventory.seeds.pumpkin).toBe(3);
    expect(continued.inventory.souvenirs.pinecone).toBe(0);
    expect(claimTravel(continued,t0+20_000).inventory).toEqual(continued.inventory);
    expect(importSave(exportSave(continued)).ok).toBe(true);
  });
  test("old selected bag food was not reserved, so migration transfers one available unit only", () => {
    const old={...oldSave(),currentJourney:null,cooking:null};
    const imported=importSave(JSON.stringify(old));
    expect(imported.ok).toBe(true);
    if(!imported.ok)return;
    expect(imported.game.inventory.foods.millet_bites).toBe(1);
    expect(imported.game.bag.foodId).toBe("millet_bites");
    expect(imported.game.bag.departAt).toBeNull();
  });
  test("the original collection texts remain archived with explicit thematic mapping notes", () => {
    const imported=importSave(JSON.stringify(oldSave()));
    expect(imported.ok).toBe(true);
    if(!imported.ok)return;
    expect(imported.game.migration?.legacyPostcards[0].firstStory).toBe("旧麦浪的故事。");
    expect(imported.game.album.collected[0].postcardId).toBe("countryside_02");
    expect(imported.game.travelLog[0].legacyStory).toBe("旧麦浪的故事。");
  });
  test.each([
    (s:ReturnType<typeof oldSave>)=>{s.plots[0].readyAt=-1;},
    (s:ReturnType<typeof oldSave>)=>{s.currentJourney.reward.seeds.carrot=-1;},
    (s:ReturnType<typeof oldSave>)=>{s.currentJourney.postcardId="unknown_99";},
    (s:ReturnType<typeof oldSave>)=>{s.bag.foodId="unknown_food";},
    (s:ReturnType<typeof oldSave>)=>{s.plots[1].id=s.plots[0].id;},
    (s:ReturnType<typeof oldSave>)=>{s.inventory.foods.bread=0.5;},
    (s:ReturnType<typeof oldSave>)=>{s.travelLog[0].date=-10;}
  ])("rejects malformed legacy nested fields rather than replacing them", mutate=>{
    const old=oldSave();mutate(old);expect(importSave(JSON.stringify(old)).ok).toBe(false);
  });
});

describe("v2 corruption rejection", () => {
  test.each([
    (s:any)=>{s.inventory.seeds.millet=-1;},
    (s:any)=>{s.inventory.seeds.unknown=5;},
    (s:any)=>{s.plots[0].cropId="wheat";},
    (s:any)=>{s.plots[0].cropId="millet";},
    (s:any)=>{s.bird.species="sparrow";},
    (s:any)=>{s.coins=Number.MAX_SAFE_INTEGER+1;},
    (s:any)=>{s.bag.departAt=t0;},
    (s:any)=>{s.settings.volume=99;},
    (s:any)=>{s.mail=[{id:"broken"}];},
    (s:any)=>{s.currentJourney={id:"broken"};},
    (s:any)=>{s.decorations.bird_cushion={owned:false,visible:true};},
    (s:any)=>{s.travelLog=[{}];},
    (s:any)=>{s.lastSettledAt=-1;}
  ])("rejects invalid v2 data atomically",mutate=>{
    const state=createNewGame(t0);mutate(state);expect(importSave(JSON.stringify(state)).ok).toBe(false);
  });
  test("rejects malformed JSON and unknown versions explicitly",()=>{
    expect(importSave("not json")).toEqual({ok:false,error:"error.saveJson"});
    expect(importSave(JSON.stringify({schemaVersion:999}))).toEqual({ok:false,error:"error.saveVersion"});
  });
});
