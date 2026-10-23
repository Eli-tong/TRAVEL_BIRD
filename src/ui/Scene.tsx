import type { CSSProperties } from "react";
import { getCropPhase } from "../domain/game";
import type { BirdMood } from "../domain/birdMood";
import type { GameState } from "../domain/types";
import { BirdArt, CropArt, ItemArt, RoomBirdArt } from "./Art";
import { useTranslation } from "../i18n/LanguageContext";
import { cropName } from "../i18n/content";

/** A-1: background and hit targets share this single 900 × 1350 art plane. */
export function RoomScene({ birdName, atHome, onBag, onKitchen, onInventory }: {
  birdName: string; atHome: boolean; onBag: () => void; onKitchen: () => void; onInventory: () => void;
}) {
  const { t } = useTranslation();
  return <section className="room-viewport" aria-label={t("legacyScene.roomLabel")}>
    <div className="room-canvas">
      <img className="room-background" src="/art/indoor.webp" fetchPriority="high"
        alt={t("legacyScene.backgroundAlt")} />
      <button className="room-hotspot room-kitchen" style={position(17, 40, 20, 10)}
        aria-label={t("scene.hotspot.kitchen")} onClick={onKitchen}><span>{t("legacyScene.kitchen")}</span></button>
      <button className="room-prop room-cupboard" style={position(24, 70, 28)}
        aria-label={t("scene.hotspot.inventory")} onClick={onInventory}>
        <img src="/art/cabinet.webp" alt={t("legacyScene.cupboardAlt")} /><span>{t("legacyScene.cupboard")}</span>
      </button>
      <button className="room-prop room-satchel" style={position(20, 53.5, 14)}
        aria-label={t("scene.hotspot.bag")} onClick={onBag}>
        <img src="/art/satchel.webp" alt={t("legacyScene.bagAlt")} /><span>{t("legacyScene.bag")}</span>
      </button>
      {atHome && <div className="room-bird" style={position(67, 51.5, 24)} aria-label={birdName}>
        <RoomBirdArt />
      </div>}
    </div>
  </section>;
}

const moodLabelKeys = { calm: "mood.calm", happy: "mood.happy", sleepy: "mood.sleepy", angry: "mood.angry" } as const;
const moodNoteKeys = { calm: "mood.calm.note", happy: "mood.happy.note", sleepy: "mood.sleepy.note", angry: "mood.angry.note" } as const;
const position = (x: number, y: number, width: number, height?: number): CSSProperties => ({ left: `${x}%`, top: `${y}%`, width: `${width}%`, ...(height ? { height: `${height}%` } : {}) });

export function Scene({ scene, game, now, mood, atHome, status, onBird, onScene, onInventory, onKitchen, onAlbum, onBag, onPlot, cabinetHint }: {
  scene: "home" | "garden"; game: GameState; now: number; mood: BirdMood; atHome: boolean; status: string;
  onBird: () => void; onScene: () => void; onInventory: () => void; onKitchen: () => void; onAlbum: () => void; onBag: () => void; onPlot: (id: string) => void; cabinetHint: boolean;
}) {
  const { t } = useTranslation();
  const indoor = scene === "home";
  const journeyReturned = Boolean(game.currentJourney && !game.currentJourney.claimed && now >= game.currentJourney.returnsAt);
  return <div className="scene-view">
    <div className="scene-heading"><div><p className="eyebrow">{t(indoor ? "legacyScene.homeEyebrow" : "legacyScene.gardenEyebrow")}</p><h2>{indoor ? t("legacyScene.homeTitle", { birdName: game.bird.name }) : t("legacyScene.gardenTitle")}</h2></div><span className="scene-weather">{t(indoor ? "legacyScene.homeWeather" : "legacyScene.gardenWeather")}</span></div>
    <section className={`scene scene-${scene}`} aria-label={t(indoor ? "legacyScene.indoor" : "legacyScene.outdoor")}>
      <img className="scene-background" src={`/art/${indoor ? "indoor" : "outdoor"}.webp`} alt={t(indoor ? "legacyScene.indoorAlt" : "legacyScene.outdoorAlt")} fetchPriority="high" />
      {indoor ? <>
        <button className="scene-object cabinet" style={position(5, 68, 33)} aria-label={t("legacyScene.openInventory")} onClick={onInventory}><img src="/art/cabinet.webp" alt={t("legacyScene.itemCupboard")} /><span className="object-label">{t("legacyScene.itemCupboard")}</span></button>
        {cabinetHint && <span className="cabinet-hint">{t("legacyScene.cupboardHint")}</span>}
        <button className="scene-hotspot kitchen-hotspot" style={position(2, 38, 29, 18)} aria-label={t("legacyScene.openKitchen")} onClick={onKitchen}><span className="object-label">{t("legacyScene.kitchenShort")}</span></button>
        <button className="scene-hotspot album-hotspot" style={position(58, 4, 32, 17)} aria-label={t("legacyScene.openAlbum")} onClick={onAlbum}><span className="object-label">{t("legacyScene.postcards")}</span></button>
        <button className="scene-object satchel" style={position(44, 78, 20)} aria-label={t("legacyScene.prepareBag")} onClick={onBag}><ItemArt name="satchel" /><span className="object-label">{t("legacyScene.bag")}</span></button>
        <button className="scene-hotspot door-hotspot" style={position(80, 61, 20, 26)} aria-label={t("legacyScene.toGardenAria")} onClick={onScene}><span className="object-label">{t("legacyScene.toGarden")}</span></button>
      </> : <>
        <button className="scene-hotspot entry-hotspot" style={position(63, 21, 23, 17)} aria-label={t("legacyScene.toHomeAria")} onClick={onScene}><span className="object-label">{t("legacyScene.toHome")}</span></button>
        {game.plots.map((plot, index) => {
          const phase = getCropPhase(plot, now);
          const centers = [[12, 60], [54, 64], [29, 74]];
          const [x, y] = centers[index % centers.length];
          return <button key={plot.id} data-plot={plot.id} className={`scene-object garden-plot ${phase.kind}`} style={position(x, y, 35)}
            aria-label={t("legacyScene.plotAria", { index: index + 1, crop: plot.cropId ? cropName(t, plot.cropId) : t("legacyScene.emptyPlot"), action: t(phase.kind === "ready" ? "legacyScene.harvestAction" : phase.kind === "growing" ? "legacyScene.progressAction" : "legacyScene.plantAction") })} onClick={() => onPlot(plot.id)}>
            <ItemArt name="soil" className="plot-soil" />
            {plot.cropId && <CropArt cropId={plot.cropId} stage={phase.kind === "ready" ? "ready" : "growing"} />}
            <span className="object-label">{phase.kind === "ready" ? t("legacyScene.harvest") : phase.kind === "growing" ? t("legacyScene.seconds", { seconds: Math.ceil(phase.remainingMs / 1000) }) : t("legacyScene.plant")}</span>
          </button>;
        })}
        <img src="/art/foreground.webp" className="scene-foreground" alt="" />
      </>}
      {atHome && <button type="button" className={`scene-bird mood-${mood}`} data-mood={mood} aria-label={t("legacyScene.birdAria", { birdName: game.bird.name, mood: t(moodLabelKeys[mood]) })} onClick={onBird}
        style={position(indoor ? 68 : 30, indoor ? 51.5 : 33.5, 25)}>
        <BirdArt mood={mood} />
      </button>}
    </section>
    <div className="scene-caption" aria-live="polite"><strong>{atHome ? game.bird.name : t("legacyScene.letter")}</strong><span>{atHome ? t(moodNoteKeys[mood]) : status}</span>{atHome && <small>{t(moodLabelKeys[mood])}</small>}</div>
    {!atHome && <button className="journey-entry" onClick={onBag}>{journeyReturned ? t("legacyScene.openGift") : t("legacyScene.travelProgress")}</button>}
  </div>;
}
