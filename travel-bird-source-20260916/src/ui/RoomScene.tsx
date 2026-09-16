import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useBirdMood } from "./useBirdMood";
import { ROOM_ART, ROOM_ICONS, ROOM_HOTSPOTS, ROOM_SPRITES, hotspotStyle, spriteStyle } from "./roomLayout";
import type { RoomHotspotId } from "./roomLayout";
import { useTranslation } from "../i18n/LanguageContext";

export function RoomScene({ birdName, atHome, blocked = false, onBird, onBag, onKitchen, onInventory, onRequestGarden }: {
  birdName: string; atHome: boolean; blocked?: boolean;
  onBird: () => void; onBag: () => void; onKitchen: () => void;
  onInventory: () => void; onRequestGarden: () => void;
}) {
  const { t } = useTranslation();
  // Deliberately local, never read from or written into player saves.
  const debug = import.meta.env.DEV && new URLSearchParams(window.location.search).get("roomDebug") === "1";
  const [outlines, setOutlines] = useState(false);
  const [hideBird, setHideBird] = useState(false);
  const [hideBag, setHideBag] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const birdImage = useRef<HTMLImageElement>(null);
  const bagImage = useRef<HTMLImageElement>(null);
  const animations = useRef<Partial<Record<"bird" | "travelBag", Animation>>>({});
  const rippleId = useRef(0);
  const [ripple, setRipple] = useState<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => () => { Object.values(animations.current).forEach((animation) => animation?.cancel()); }, []);
  useEffect(() => () => { rippleId.current += 1; }, []);
  const onScenePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (blocked) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const id = ++rippleId.current;
    setRipple({
      id,
      x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100))
    });
    window.setTimeout(() => setRipple((current) => current?.id === id ? null : current), 660);
  };
  const playFeedback = (id: RoomHotspotId) => {
    if (id !== "bird" && id !== "travelBag") return;
    animations.current[id]?.cancel();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const image = id === "bird" ? birdImage.current : bagImage.current;
    // The layout's transform-origin is the physical feet/base contact point.
    // Replace, never stack animations; no translation or rotation.
    animations.current[id] = image?.animate?.([
      { transform: "scale(1)" },
      { transform: id === "bird" ? "scale(0.993, 1.008)" : "scale(1.012, 0.982)", offset: 0.38 },
      { transform: "scale(1)" }
    ], { duration: 280, easing: "ease-out" });
  };
  const showBird = atHome && !(debug && hideBird) && !failed.includes("bird");
  const showBag = atHome && !(debug && hideBag) && !failed.includes("travelBag");
  const bird = useBirdMood(showBird, !blocked);
  const actions: Record<RoomHotspotId, () => void> = {
    bird: () => { bird.onClick(); onBird(); },
    travelBag: onBag, kitchen: onKitchen, pot: onKitchen, cabinet: onInventory, exit: onRequestGarden
  };
  const imageFailed = (id: string) => setFailed((current) => current.includes(id) ? current : [...current, id]);
  const hotspotLabel = (id: RoomHotspotId) => {
    if (id === "bird") return t("scene.hotspot.bird", { birdName });
    if (id === "travelBag") return t("scene.hotspot.bag");
    if (id === "kitchen" || id === "pot") return t("scene.hotspot.kitchen");
    if (id === "cabinet") return t("scene.hotspot.inventory");
    return t("scene.hotspot.exit");
  };
  return <section className="room-viewport" aria-label={t("scene.label")}>
    <div ref={undefined} className={`room-canvas${debug && outlines ? " room-debug-outlines" : ""}`} onPointerDown={onScenePointerDown}>
      <img className="room-background" src={ROOM_ART.background} fetchPriority="high" draggable={false}
        onError={() => imageFailed("background")}
        alt={t("scene.backgroundAlt")} />
      {showBag && <img ref={bagImage} className="room-layer" data-layer="travelBag" src={ROOM_ART.travelBag}
        style={spriteStyle(ROOM_SPRITES.travelBag)} alt={t("scene.bagAlt")} draggable={false} onError={() => imageFailed("travelBag")} />}
      {showBird && <img ref={birdImage} className="room-layer" data-layer="bird" data-mood={bird.mood}
        src={ROOM_ART.bird} style={spriteStyle(ROOM_SPRITES.bird)} alt={t("scene.birdAlt", { birdName })} draggable={false} onError={() => imageFailed("bird")} />}
      {ROOM_HOTSPOTS.filter((target) => target.requires === "room" || (target.requires === "bird" ? showBird : showBag)).map((target) =>
        <button key={target.id} type="button" className="room-hotspot" data-hotspot={target.id}
          style={hotspotStyle(target)} aria-label={hotspotLabel(target.id)}
          disabled={blocked || failed.includes("background")}
          onPointerDown={() => playFeedback(target.id)}
          onClick={(event) => { if (event.detail === 0) playFeedback(target.id); actions[target.id](); }}>
          {debug && outlines && <span className="room-debug-label">{target.id}</span>}
          {target.id === "exit" && <img className="room-exit-icon" src={ROOM_ICONS.exit} alt="" draggable={false} />}
        </button>)}
      {ripple && <span key={ripple.id} className="room-ripple" aria-hidden="true" style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, pointerEvents: "none" }} />}
    </div>
    {failed.length > 0 && <p role="alert" className="room-image-error">{t("scene.imageError")}</p>}
    {debug && <fieldset className="room-debug-controls" disabled={blocked}>
      <legend>场景检查 · 不保存</legend>
      <label><input type="checkbox" checked={outlines} onChange={(e) => setOutlines(e.target.checked)} />热点轮廓</label>
      <label><input type="checkbox" checked={hideBird} onChange={(e) => setHideBird(e.target.checked)} />隐藏小鸟</label>
      <label><input type="checkbox" checked={hideBag} onChange={(e) => setHideBag(e.target.checked)} />隐藏背包</label>
      <button type="button" onClick={() => { setHideBird(true); setHideBag(true); }}>同时隐藏</button>
      <button type="button" onClick={() => { setHideBird(false); setHideBag(false); setOutlines(false); }}>恢复正常</button>
    </fieldset>}
  </section>;
}
