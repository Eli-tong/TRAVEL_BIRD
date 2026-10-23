import { BookOpen, ChefHat, Download, Home, Map, RotateCcw, Settings, Sprout, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CROPS, DESTINATIONS, POSTCARDS, RECIPES } from "./domain/config";
import {
  claimCooking,
  claimTravelPostcard,
  claimTravelSeeds,
  acknowledgeTravelReturn,
  createNewGame,
  exportSave,
  getCookingPhase,
  getCropPhase,
  getCropDuration,
  getTravelPhase,
  getMissingIngredients,
  hasPendingTravelPostcard,
  hasPendingTravelSeeds,
  harvestPlot,
  importSave,
  markIntroSeen,
  prepareTravel,
  renameBird,
  setBagFood,
  setBagDestination,
  setMode,
  startCooking,
  startPlanting,
  settleWorldClock
} from "./domain/game";
import type { CropId, DestinationId, FoodId, GameState, Journey, Mode, PostcardId, TravelLogEntry } from "./domain/types";
import { CropArt, FoodArt, PostcardArt } from "./ui/Art";
import { InventoryItemArt } from "./ui/InventoryItemArt";
import { useBirdMood } from "./ui/useBirdMood";
import { useBirdSpeech } from "./ui/useBirdSpeech";

import { RoomScene } from "./ui/RoomScene";
import { GardenScene } from "./ui/GardenScene";
import { PostcardViewer } from "./ui/PostcardViewer";
import { ROOM_ART, ROOM_ICONS } from "./ui/roomLayout";
import { Modal } from "./ui/Modal";
import { PanelSurface } from "./ui/PanelSurface";
import { LanguageContext, useTranslation } from "./i18n/LanguageContext";
import { translate, translateError, type Language, type TranslationKey } from "./i18n/dictionary";
import { cropName, destinationDescription, destinationName, foodName, postcardStory, postcardTitle, seedName, type Translator } from "./i18n/content";


const SAVE_KEY = "travel-bird-save-v1";
type UiMessage = { key: TranslationKey; values?: Record<string, string | number> } | { error: string };
const createAppGame = () => createNewGame(Date.now(), import.meta.env.DEV ? "demo" : "normal");

const useClock = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 500);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
};

const loadInitialGame = () => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { game: createAppGame(), locked: false, error: "" };
    const result = importSave(raw);
    if (result.ok) return { game: settleWorldClock(result.game, Date.now()), locked: false, error: "" };
    return { game: createAppGame(), locked: true, error: result.error };
  } catch {
    return { game: createAppGame(), locked: false, error: "error.storageUnavailable" };
  }
};

const formatTime = (ms: number, t: Translator) => {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? t("time.minutesSeconds", { minutes, seconds: seconds.toString().padStart(2, "0") })
    : t("time.seconds", { seconds });
};

const formatDate = (value: number, language: Language) =>
  new Intl.DateTimeFormat(language, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const rewardText = (entry: Pick<TravelLogEntry, "reward">, t: Translator) => {
  const parts: string[] = [];
  for (const [id, amount] of Object.entries(entry.reward.seeds)) {
    if (amount) parts.push(`${seedName(t, id as CropId)} ×${amount}`);
  }
  for (const [id, amount] of Object.entries(entry.reward.materials)) {
    if (amount) parts.push(`${cropName(t, id as CropId)} ×${amount}`);
  }
  for (const id of entry.reward.unlocks.crops) parts.push(t("travel.reward.unlock", { item: cropName(t, id) }));
  for (const id of entry.reward.unlocks.recipes) parts.push(t("travel.reward.unlock", { item: foodName(t, id) }));
  for (const id of entry.reward.unlocks.destinations) parts.push(t("travel.reward.unlock", { item: destinationName(t, id) }));
  return parts.join(t("travel.reward.separator")) || t("travel.reward.none");
};

export default function App() {
  const initial = useMemo(loadInitialGame, []);
  const [game, setGame] = useState<GameState>(initial.game);
  const [scene, setScene] = useState<"room" | "garden">("room");
  const [panel, setPanel] = useState<"bag" | "mail" | "kitchen" | "inventory" | "menu" | "settings" | "album" | "collectedPostcard" | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const [collectedPostcard, setCollectedPostcard] = useState<PostcardId | null>(null);
  const language = game.settings.language;
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);
  const [saveLocked, setSaveLocked] = useState(initial.locked);
  const [storageMessage, setStorageMessage] = useState(initial.error);
  const [toast, setToast] = useState<UiMessage | null>(null);
  const [importText, setImportText] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const gameRef = useRef(game);
  const gardenScrollLeft = useRef<number | null>(null);
  gameRef.current = game;
  const now = useClock();

  // Retain the v1 storage key and operations; food ID migration runs only on import.
  useEffect(() => {
    if (saveLocked) return;
    try { localStorage.setItem(SAVE_KEY, exportSave(game)); }
    catch { setStorageMessage("error.autoSave"); }
  }, [game, saveLocked]);
  useEffect(() => {
    if (saveLocked) return;
    const current = gameRef.current;
    const settled = settleWorldClock(current, now);
    if (settled === current) return;
    gameRef.current = settled;
    setGame(settled);
  }, [now, saveLocked]);
  useEffect(() => {
    const current = gameRef.current;
    if (current.travel.status !== "returned" || current.travel.returnNoticeAcknowledgedAt !== null) return;
    const acknowledged = acknowledgeTravelReturn(current, now);
    gameRef.current = acknowledged;
    setGame(acknowledged);
    setToast({ key: "toast.travelReturned" });
  }, [game.travel.status, game.travel.returnNoticeAcknowledgedAt, now]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const action = (fn: (state: GameState) => GameState, message: TranslationKey) => {
    if (saveLocked) { setToast({ key: "error.saveLocked" }); return; }
    try {
      const next = fn(gameRef.current);
      gameRef.current = next;
      setGame(next);
      setToast({ key: message });
    } catch (error) { setToast({ error: error instanceof Error ? error.message : "error.actionFailed" }); }
  };
  const closePanel = () => setPanel(null);
  const travelPhase = getTravelPhase(game, now);
  const travelling = travelPhase.kind === "travelling";
  const overlayOpen = panel !== null || selectedPlot !== null;
  const birdMood = useBirdMood(!travelling, !overlayOpen);
  const birdSpeechContext = scene === "room" && game.bird.routine.activity === "room-sleep"
    ? "bed"
    : "general";
  const birdSpeech = useBirdSpeech(
    birdMood.mood,
    !travelling && !overlayOpen,
    birdSpeechContext,
  );
  const pendingPostcard = hasPendingTravelPostcard(game, now);
  const pendingSeeds = hasPendingTravelSeeds(game, now);
  const collectTravelReward = (channel: "postcard" | "seeds") => {
    if (saveLocked) { setToast({ key: "error.saveLocked" }); return; }
    try {
      const current = gameRef.current;
      if (!current.currentJourney || getTravelPhase(current, now).kind !== "returned") return;
      const isPending = channel === "postcard" ? hasPendingTravelPostcard : hasPendingTravelSeeds;
      if (!isPending(current, now)) return;
      const next = channel === "postcard" ? claimTravelPostcard(current, now) : claimTravelSeeds(current, now);
      gameRef.current = next;
      setGame(next);
      setPanel(null);
      setToast({ key: channel === "postcard" ? "mail.collected" : "bag.seedsCollected" });
    } catch (error) {
      setToast({ error: error instanceof Error ? error.message : "error.actionFailed" });
    }
  };
  const applyPlotAction = (fn: (state: GameState) => GameState, message: TranslationKey) => {
    if (saveLocked) { setToast({ key: "error.saveLocked" }); return; }
    try {
      const next = fn(gameRef.current);
      gameRef.current = next;
      setGame(next);
      setSelectedPlot(null);
      setToast({ key: message });
    } catch (error) {
      setToast({ error: error instanceof Error ? error.message : "error.actionFailed" });
    }
  };
  const respondToBird = () => {
    birdSpeech.respond();
    birdMood.onClick();
  };
  const birdSpeechText = birdSpeech.speechKey
    ? t(birdSpeech.speechKey, { birdName: game.bird.name })
    : null;

  return <LanguageContext.Provider value={language}><div className="room-shell" lang={language}>
    <main className="room-frame" inert={overlayOpen}>
      {scene === "room" ? <RoomScene birdName={game.bird.name} routine={game.bird.routine} travelling={travelling}
        hasPendingSeeds={pendingSeeds} blocked={overlayOpen} mood={birdMood.mood} speech={birdSpeechText} onBird={respondToBird}
        onRequestGarden={() => setScene("garden")}
        onBag={() => setPanel("bag")} onKitchen={() => setPanel("kitchen")}
        onInventory={() => setPanel("inventory")} /> : <GardenScene game={game} now={now} blocked={overlayOpen} mood={birdMood.mood} speech={birdSpeechText}
          hasPendingMail={pendingPostcard}
          initialScrollLeft={gardenScrollLeft.current}
          onScrollLeftChange={(value) => { gardenScrollLeft.current = value; }}
          onEnterHome={() => setScene("room")}
          onBird={respondToBird}
          onMailbox={() => {
            if (pendingPostcard) setPanel("mail");
            else setToast({ key: "garden.mailboxEmpty" });
          }}
          onPlot={setSelectedPlot} />}
      <button className="room-menu" aria-label={t("scene.menu")} onClick={() => setPanel("menu")}>
        <img src={ROOM_ICONS.menu} alt="" draggable={false} />
      </button>
      {storageMessage && <button className="room-storage-notice" onClick={() => setPanel("settings")}>{translateError(language, storageMessage)}</button>}
    </main>
    {toast && <div className="toast room-toast" role="status">{"key" in toast ? t(toast.key, toast.values) : translateError(language, toast.error)}</div>}
    {panel === "bag" && <PanelSurface kind="travel-bag" title={travelPhase.kind === "returned" ? t("travel.returnedTitle") : t("bag.title")} itemSlotStyle="travel-label" onClose={closePanel}>
      <TravelBagPanel game={game} now={now} phase={travelPhase}
        onDestination={(destinationId) => action((state) => setBagDestination(state, destinationId, now), "toast.destinationSelected")}
        onFood={(foodId) => action((state) => setBagFood(state, foodId, now), foodId ? "toast.bagSelected" : "toast.bagCancelled")}
        onPrepare={() => action((state) => prepareTravel(state, now), "toast.bagReady")}
        onClaim={() => collectTravelReward("seeds")} />
    </PanelSurface>}
    {panel === "mail" && pendingPostcard && game.currentJourney && <PanelSurface kind="paper" title={t("mail.title")} onClose={closePanel}>
      <PendingRewardList journey={game.currentJourney} channel="postcard" />
      <button type="button" className="room-panel-action" onClick={() => collectTravelReward("postcard")}>{t("mail.collect")}</button>
    </PanelSurface>}
    {panel === "kitchen" && <PanelSurface kind="paper" title={t("kitchen.title")} itemSlotStyle="recipe-tag" onClose={closePanel}>
      <KitchenView game={game} now={now} cookingPhase={getCookingPhase(game.cooking, now)}
        onCook={(id) => action((state) => startCooking(state, id, now), "toast.cookingStarted")}
        onClaim={() => action((state) => claimCooking(state, now), "toast.foodStored")} />
    </PanelSurface>}
    {panel === "inventory" && <PanelSurface kind="wood-cabinet" title={t("inventory.panelTitle")} itemSlotStyle="cabinet-shelf" onClose={closePanel}><InventoryPanel game={game} /></PanelSurface>}
    {panel === "menu" && <Modal title={t("menu.title")} onClose={closePanel}>
      <p className="room-help">{t("menu.description")}</p>
      <button className="room-panel-action" onClick={() => setPanel("settings")}>{t("menu.settingsSave")}</button>
      <button className="room-panel-action" onClick={() => setPanel("album")}>{t("album.title")}</button>
    </Modal>}
    {panel === "album" && <PanelSurface kind="paper" title={t("album.title")} onClose={closePanel}>
      <p>{t("album.collected", { count: game.album.collected.length })}</p>
      {game.album.collected.length === 0 && <p>{t("album.empty")}</p>}
      <div className="postcard-grid">{(Object.keys(POSTCARDS) as PostcardId[]).map((postcardId, index) => {
        const entry = game.album.collected.find(item => item.postcardId === postcardId);
        return <button key={postcardId} type="button" className={`postcard-tile ${entry ? "earned" : "empty"}`} disabled={!entry}
          aria-label={entry ? postcardTitle(t, postcardId) : t("postcard.lockedAlt")}
          onClick={() => { if (entry) { setCollectedPostcard(postcardId); setPanel("collectedPostcard"); } }}>
          <PostcardArt postcardId={postcardId} locked={!entry} /><span>{entry ? postcardTitle(t, postcardId) : t("album.notCollected")}</span>
          {!entry && <small aria-hidden="true">{String(index + 1).padStart(2, "0")}</small>}
        </button>;
      })}</div>
    </PanelSurface>}
    {panel === "collectedPostcard" && collectedPostcard && game.album.collected.some(item => item.postcardId === collectedPostcard) && <PostcardViewer
      postcardId={collectedPostcard}
      entry={game.album.collected.find(item => item.postcardId === collectedPostcard)!}
      birdName={game.bird.name}
      onClose={() => setPanel("album")} />}
    {selectedPlot && <PlotModal game={game} now={now} plotId={selectedPlot} onClose={() => setSelectedPlot(null)}
      onPlant={(plotId, cropId) => applyPlotAction((state) => startPlanting(state, plotId, cropId, now), "toast.planted")}
      onHarvest={(plotId) => applyPlotAction((state) => harvestPlot(state, plotId, now), "toast.harvested")} />}
    {panel === "settings" && <SettingsModal game={game} importText={importText} resetArmed={resetArmed} onClose={closePanel}
      onRename={(name) => action((state) => renameBird(state, name, now), "toast.nameUpdated")}
      onMode={(mode) => action((state) => setMode(state, mode, now), "toast.modeUpdated")}
      onLanguage={(nextLanguage) => {
        if (saveLocked) { setToast({ key: "error.saveLocked" }); return; }
        const next = { ...gameRef.current, settings: { ...gameRef.current.settings, language: nextLanguage } };
        gameRef.current = next;
        setGame(next);
        setToast({ key: "toast.languageUpdated" });
      }}
      onExport={() => { setImportText(exportSave(game)); setToast({ key: "toast.saveExported" }); }}
      onImportText={setImportText} onImport={() => {
        const result = importSave(importText);
        if (!result.ok) { setToast({ error: result.error }); return; }
        const settled = settleWorldClock(result.game, Date.now());
        gameRef.current = settled; setGame(settled); setSaveLocked(false); setStorageMessage(""); closePanel();
      }}
      onReset={() => {
        if (!resetArmed) { setResetArmed(true); return; }
        const next = createNewGame(now, game.settings.mode);
        next.settings.language = language;
        gameRef.current = next; setGame(next); setResetArmed(false); closePanel();
      }} />}
  </div></LanguageContext.Provider>;
}

function PendingRewardList({ journey, channel }: { journey: Journey; channel: "postcard" | "seeds" }) {
  const { t } = useTranslation();
  return <ul className="travel-reward-list">
    {channel === "postcard" && <li>
      <PostcardArt postcardId={journey.postcardId} />
      <span>{t("travel.newPostcard")}</span>
      <strong>{postcardTitle(t, journey.postcardId)}</strong>
    </li>}
    {channel === "seeds" && Object.entries(journey.reward.seeds).map(([cropId, count]) => count ? <li key={`seed-${cropId}`}>
      <CropArt cropId={cropId as CropId} stage="seed" />
      <span>{t("travel.newSeed")}</span>
      <strong>{seedName(t, cropId as CropId)} ×{count}</strong>
    </li> : null)}
    {channel === "seeds" && journey.reward.unlocks.recipes.map((recipeId) => <li key={`recipe-${recipeId}`}>
      <FoodArt foodId={recipeId} />
      <span>{t("travel.newRecipe")}</span>
      <strong>{foodName(t, recipeId)}</strong>
    </li>)}
    {channel === "seeds" && Object.entries(journey.reward.materials).map(([cropId, count]) => count ? <li key={`material-${cropId}`}>
      <CropArt cropId={cropId as CropId} stage="ready" />
      <span>{t("inventory.other")}</span>
      <strong>{cropName(t, cropId as CropId)} ×{count}</strong>
    </li> : null)}
  </ul>;
}

function TravelBagPanel({ game, now, phase, onDestination, onFood, onPrepare, onClaim }: {
  game: GameState;
  now: number;
  phase: ReturnType<typeof getTravelPhase>;
  onDestination: (destinationId: DestinationId) => void;
  onFood: (foodId: FoodId | null) => void;
  onPrepare: () => void;
  onClaim: () => void;
}) {
  const { t } = useTranslation();
  const journey = game.currentJourney;
  if (phase.kind === "ready" && journey) {
    return <div className="room-bag-content travel-status-card" aria-live="polite">
      <div className="room-bag-slot"><img src={ROOM_ART.travelBag} alt={t("bag.imageAlt")} />
        <div><strong>{t("travel.readyTitle")}</strong><p>{t("travel.readyHelp")}</p></div>
      </div>
    </div>;
  }
  if (phase.kind === "travelling" && journey) {
    return <div className="room-bag-content travel-status-card" aria-live="polite">
      <div className="room-bag-slot"><img src={ROOM_ART.travelBag} alt={t("bag.imageAlt")} />
        <div><strong>{t("travel.travellingTitle")}</strong><p>{t("travel.awayHelp")}</p></div>
      </div>
    </div>;
  }
  if (phase.kind === "returned" && journey) {
    return <div className="room-bag-content travel-return-card" aria-live="polite">
      <div className="room-bag-slot"><img src={ROOM_ART.travelBag} alt={t("bag.imageAlt")} />
        <div><strong>{t("travel.returnedTitle")}</strong><p>{t("travel.returnedHelp", { birdName: journey.birdNameSnapshot ?? game.bird.name })}</p></div>
      </div>
      {hasPendingTravelSeeds(game, now) ? <>
        <PendingRewardList journey={journey} channel="seeds" />
        <button type="button" className="room-panel-action" onClick={onClaim}>{t("bag.collectSeeds")}</button>
      </> : <p className="room-panel-note">{t("bag.seedsEmpty")}</p>}
    </div>;
  }

  const destinationReady = game.bag.destinationId !== null;
  const foodReady = game.bag.foodId !== null;
  return <div className="room-bag-content travel-preparation">
    <p className="room-panel-note">{t("bag.seedsEmpty")}</p>
    <div className="room-bag-slot"><img src={ROOM_ART.travelBag} alt={t("bag.imageAlt")} />
      <div><strong>{t("travel.prepareBag")}</strong><p>{t("travel.prepareHelp")}</p></div>
    </div>

    <section className="travel-step" aria-labelledby="travel-destination-step">
      <header><span>1</span><div><h3 id="travel-destination-step">{t("travel.chooseDestination")}</h3><p>{t("travel.firstDestinationHint")}</p></div></header>
      <div className="travel-destination-list">
        {Object.values(DESTINATIONS).map((destination) => {
          const unlocked = game.unlocked.destinations.includes(destination.id);
          const selected = game.bag.destinationId === destination.id;
          return <button type="button" key={destination.id} className={selected ? "selected" : ""} aria-pressed={selected}
            disabled={!unlocked} onClick={() => onDestination(destination.id)}>
            <Map size={18} /><span><strong>{destinationName(t, destination.id)}</strong><small>{unlocked ? destinationDescription(t, destination.id) : t("common.locked")}</small></span>
          </button>;
        })}
      </div>
    </section>

    <section className="travel-step" aria-labelledby="travel-food-step">
      <header><span>2</span><div><h3 id="travel-food-step">{t("travel.chooseFood")}</h3><p>{t("travel.foodEventHint")}</p></div></header>
      {Object.values(game.inventory.foods).every(count => count === 0) && <p className="room-panel-note" role="status">{t("bag.empty")}</p>}
      <div className="room-food-list">{(Object.keys(RECIPES) as FoodId[]).map((foodId) =>
        <button type="button" key={foodId} className={game.bag.foodId === foodId ? "selected" : ""} aria-pressed={game.bag.foodId === foodId}
          disabled={game.inventory.foods[foodId] < 1} onClick={() => onFood(foodId)}>
          <FoodArt foodId={foodId} /><span><strong>{t(RECIPES[foodId].nameKey)}</strong><small>{t("bag.count", { count: game.inventory.foods[foodId] })}</small></span>
          {game.bag.foodId === foodId && <em>{t("bag.selected")}</em>}
        </button>)}</div>
      {game.bag.foodId && <button type="button" className="secondary travel-unpack" onClick={() => onFood(null)}>{t("bag.cancel")}</button>}
    </section>

    <section className="travel-step travel-confirm" aria-labelledby="travel-confirm-step">
      <header><span>3</span><div><h3 id="travel-confirm-step">{t("travel.confirmBag")}</h3><p>{t("travel.confirmHelp")}</p></div></header>
      <dl>
        <div><dt>{t("travel.destination")}</dt><dd>{game.bag.destinationId ? destinationName(t, game.bag.destinationId) : t("travel.notSelected")}</dd></div>
        <div><dt>{t("travel.food")}</dt><dd>{game.bag.foodId ? foodName(t, game.bag.foodId) : t("travel.notSelected")}</dd></div>
      </dl>
      <button type="button" className="room-panel-action" disabled={!destinationReady || !foodReady} onClick={onPrepare}>{t("travel.bagReadyAction")}</button>
    </section>
  </div>;
}

function PlotModal({ game, now, plotId, onClose, onPlant, onHarvest }: {
  game: GameState; now: number; plotId: string; onClose: () => void;
  onPlant: (id: string, cropId: CropId) => void; onHarvest: (id: string) => void;
}) {
  const { t } = useTranslation();
  const plot = game.plots.find((item) => item.id === plotId);
  if (!plot) return null;
  const phase = getCropPhase(plot, now);
  const seeds = (Object.keys(CROPS) as CropId[]).filter((id) => game.unlocked.crops.includes(id) && game.inventory.seeds[id] > 0);
  return <Modal title={plot.cropId ? t("plant.growthTitle", { crop: cropName(t, plot.cropId) }) : t("plant.title")} onClose={onClose}>
    {plot.cropId ? <div className="growth-detail">
      <CropArt cropId={plot.cropId} stage={phase.kind === "ready" ? "ready" : "growing"} />
      <Progress value={phase.progress} />
      <p>{phase.kind === "ready" ? t("plant.ready") : t("plant.remaining", { time: formatTime(phase.remainingMs, t), percent: Math.floor(phase.progress * 100) })}</p>
      <button disabled={phase.kind !== "ready"} onClick={() => onHarvest(plot.id)}>{t("plant.harvest")}</button>
    </div> : <div className="seed-list">
      <p className="hint">{t("plant.chooseSeed")}</p>
      {seeds.length === 0 && <div className="empty-state"><h3>{t("plant.noSeeds")}</h3><p>{t("plant.noSeedsHelp")}</p></div>}
      {seeds.map((id) => <button key={id} onClick={() => onPlant(plotId, id)}><CropArt cropId={id} stage="seed" /><div><strong>{seedName(t, id)}</strong><span>{t("plant.seedMeta", { count: game.inventory.seeds[id], time: formatTime(getCropDuration(id, game.settings.mode), t) })}</span></div></button>)}
    </div>}
  </Modal>;
}

function KitchenView({
  game,
  now,
  cookingPhase,
  onCook,
  onClaim
}: {
  game: GameState;
  now: number;
  cookingPhase: ReturnType<typeof getCookingPhase>;
  onCook: (recipeId: FoodId) => void;
  onClaim: () => void;
}) {
  const { t, language } = useTranslation();
  return (
    <div className="view-stack room-kitchen-content">
      <section className="panel cooking-slot room-kitchen-status">
        <div className="section-title">
          <h2>{t("food.cooking")}</h2>
          <span>{game.cooking ? t(RECIPES[game.cooking.recipeId].nameKey) : t("food.idle")}</span>
        </div>
        {game.cooking ? (
          <>
            <FoodArt foodId={game.cooking.recipeId} />
            <Progress value={cookingPhase.progress} />
            <p>{cookingPhase.kind === "ready" ? t("food.ready") : `${t("food.busy")} · ${Math.ceil(cookingPhase.remainingMs / 1000)}s`}</p>
            <button type="button" disabled={cookingPhase.kind !== "ready"} onClick={onClaim}>
              {t("food.claim")}
            </button>
          </>
        ) : (
          <p>{t("food.instructions")}</p>
        )}
      </section>

      <section className="panel room-recipe-sheet">
        <div className="section-title">
          <h2>{t("food.recipes")}</h2>
        </div>
        <div className="recipe-list">
          {(Object.keys(RECIPES) as FoodId[]).map((recipeId) => {
            const recipe = RECIPES[recipeId];
            const unlocked = game.unlocked.recipes.includes(recipeId);
            const missing = getMissingIngredients(game, recipeId);
            return (
              <article className={`recipe room-recipe-row ${unlocked ? "" : "locked"}`} key={recipeId}>
                <FoodArt foodId={recipeId} />
                <div>
                  <h3>{t(recipe.nameKey)}</h3>
                  <p>{t(recipe.descriptionKey)}</p>
                  {recipe.isStarterFood && game.travelLog.length === 0 && <small className="food-starter-note">{t("food.starter")}</small>}
                  <span>
                    {t("food.needs")}{" "}
                    {Object.entries(recipe.ingredients)
                      .map(([cropId, amount]) => `${t(`crop.${cropId as CropId}`)} ×${amount} (${t("food.owned", { count: game.inventory.materials[cropId as CropId] })})`)
                      .join(" + ")}
                  </span>
                  {unlocked && missing.length > 0 && (
                    <em>
                      {t("food.missing")}{" "}
                      {missing.map((item) => `${t(`crop.${item.cropId}`)} ${item.needed - item.owned}`).join(language === "en" ? ", " : "、")}
                    </em>
                  )}
                  {!unlocked && <em>{t("food.locked")}</em>}
                </div>
                <button type="button" disabled={!unlocked || missing.length > 0 || Boolean(game.cooking)} onClick={() => onCook(recipeId)}>
                  {t("food.cook")}
                </button>
              </article>
            );
          })}
        </div>
      </section>


    </div>
  );
}

function AlbumView({
  game,
  collectedIds,
  onOpen
}: {
  game: GameState;
  collectedIds: Set<PostcardId>;
  onOpen: (postcardId: PostcardId) => void;
}) {
  const { language, t } = useTranslation();
  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-title">
          <h2>{t("album.postcards")}</h2>
          <span>{game.album.collected.length}/9</span>
        </div>
        <div className="postcard-grid">
          {(Object.keys(POSTCARDS) as PostcardId[]).map((postcardId) => {
            const collected = collectedIds.has(postcardId);
            return (
              <button type="button" className="postcard-tile" key={postcardId} disabled={!collected} onClick={() => onOpen(postcardId)}>
                <PostcardArt postcardId={postcardId} locked={!collected} />
                <strong>{collected ? postcardTitle(t, postcardId) : t("album.notCollected")}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t("album.travelLog")}</h2>
          <span>{t("album.tripCount", { count: game.travelLog.length })}</span>
        </div>
        <div className="log-list">
          {game.travelLog.length === 0 && <p>{t("album.noTrips")}</p>}
          {game.travelLog.map((entry) => (
            <article className="log-entry" key={entry.journeyId}>
              <div className="section-title">
                <h3>{destinationName(t, entry.destinationId)}</h3>
                <span>{formatDate(entry.date, language)}</span>
              </div>
              <p>
                {t("album.tripSummary", { food: foodName(t, entry.foodId), postcard: postcardTitle(t, entry.postcardId) })}
              </p>
              <em>{rewardText(entry, t)}</em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function InventoryPanel({ game }: { game: GameState }) {
  const { t } = useTranslation();
  return (
    <section className="panel inventory room-inventory-content">
      <div className="inventory-cabinet-heading">
        <h2>{t("inventory.title")}</h2>
        <span>{t("inventory.subtitle")}</span>
      </div>
      <section className="inventory-shelf" aria-labelledby="inventory-seeds-title">
        <h3 id="inventory-seeds-title">{t("inventory.seeds")}</h3>
        <div className="inventory-grid">
        {(Object.keys(CROPS) as CropId[]).map((cropId) => (
          <div key={`seed-${cropId}`}>
            <InventoryItemArt category="seeds" itemId={cropId} alt={seedName(t, cropId)} /><strong>{seedName(t, cropId)}</strong>
            <span aria-label={t("inventory.count", { count: game.inventory.seeds[cropId] })}>{game.inventory.seeds[cropId]}</span>
          </div>
        ))}
        </div>
      </section>
      <section className="inventory-shelf" aria-labelledby="inventory-materials-title">
        <h3 id="inventory-materials-title">{t("inventory.ingredients")}</h3>
        <div className="inventory-grid">
        {(Object.keys(CROPS) as CropId[]).map((cropId) => (
          <div key={`material-${cropId}`}>
            <InventoryItemArt category="ingredients" itemId={cropId} alt={cropName(t, cropId)} /><strong>{cropName(t, cropId)}</strong>
            <span aria-label={t("inventory.count", { count: game.inventory.materials[cropId] })}>{game.inventory.materials[cropId]}</span>
          </div>
        ))}
        </div>
      </section>
      <section className="inventory-shelf" aria-labelledby="inventory-foods-title">
        <h3 id="inventory-foods-title">{t("inventory.food")}</h3>
        <div className="inventory-grid">
        {(Object.keys(RECIPES) as FoodId[]).map((foodId) => (
          <div key={`food-${foodId}`}>
            <InventoryItemArt category="foods" itemId={foodId} alt={t(RECIPES[foodId].nameKey)} /><strong>{t(RECIPES[foodId].nameKey)}</strong>
            <span aria-label={t("inventory.count", { count: game.inventory.foods[foodId] })}>{game.inventory.foods[foodId]}</span>
          </div>
        ))}
        </div>
      </section>
    </section>
  );
}

function Progress({ value }: { value: number }) {
  const { t } = useTranslation();
  return (
    <div className="progress" aria-label={t("common.progress", { percent: Math.round(value * 100) })}>
      <span style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function SettingsModal({
  game,
  importText,
  resetArmed,
  onClose,
  onRename,
  onMode,
  onLanguage,
  onExport,
  onImportText,
  onImport,
  onReset
}: {
  game: GameState;
  importText: string;
  resetArmed: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onMode: (mode: Mode) => void;
  onLanguage: (language: Language) => void;
  onExport: () => void;
  onImportText: (value: string) => void;
  onImport: () => void;
  onReset: () => void;
}) {
  const [name, setName] = useState(game.bird.name);
  const { t } = useTranslation();
  return (
    <PanelSurface kind="handbook" title={t("settings.title")} itemSlotStyle="handbook-row" onClose={onClose}>
      <div className="settings-modal room-settings-content">
        <section className="settings-section"><strong>{t("language")}</strong>
          <div className="segmented" role="group" aria-label={t("language")}>
            <button type="button" aria-pressed={game.settings.language === "zh-CN"} onClick={() => onLanguage("zh-CN")}>中文</button>
            <button type="button" aria-pressed={game.settings.language === "en"} onClick={() => onLanguage("en")}>English</button>
          </div>
        </section>
        <section className="settings-section">
          <label>
          {t("settings.birdName")}
          <div className="inline-form">
            <input value={name} maxLength={8} onChange={(event) => setName(event.target.value)} />
            <button type="button" onClick={() => onRename(name)}>
              {t("common.save")}
            </button>
          </div>
          </label>
        </section>
        {import.meta.env.DEV && <section className="settings-section">
          <strong>{t("settings.mode")}</strong>
          <div className="segmented">
            <button type="button" className={game.settings.mode === "demo" ? "active" : ""} onClick={() => onMode("demo")}>
              {t("settings.mode.demo")}
            </button>
            <button type="button" className={game.settings.mode === "normal" ? "active" : ""} onClick={() => onMode("normal")}>
              {t("settings.mode.normal")}
            </button>
          </div>
          <p className="hint">{t("settings.modeHint")}</p>
        </section>}
        <section className="settings-section save-tools">
          <strong>{t("settings.saveData")}</strong>
          <div className="row">
            <button type="button" className="secondary" onClick={onExport}>
              <Download size={18} /> {t("settings.export")}
            </button>
            <button type="button" onClick={onImport}>
              <Upload size={18} /> {t("settings.import")}
            </button>
          </div>
          <textarea
            value={importText}
            onChange={(event) => onImportText(event.target.value)}
            placeholder={t("settings.importPlaceholder")}
            rows={6}
          />
          <p className="hint">{t("settings.saveHint")}</p>
        </section>
        <button type="button" className="danger settings-danger" onClick={onReset}>
          <RotateCcw size={18} /> {resetArmed ? t("settings.resetConfirm") : t("settings.reset")}
        </button>
      </div>
    </PanelSurface>
  );
}
