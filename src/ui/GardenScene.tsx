import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, UIEvent as ReactUIEvent } from "react";
import { getCropPhase, getTravelPhase } from "../domain/game";
import type { GameState } from "../domain/types";
import type { BirdMood } from "../domain/birdMood";
import { cropName } from "../i18n/content";
import { useTranslation } from "../i18n/LanguageContext";
import { CropArt } from "./Art";
import { BirdRoutineSprite } from "./BirdRoutineSprite";
import { GARDEN_ROUTE_ART } from "./birdRoutineArt";
import { GARDEN_ART, GARDEN_HOTSPOTS, GARDEN_PLOTS, defaultGardenScrollLeft, gardenPlacementStyle, gardenRoutePlacement, isWateringActivity, preferredWateringPlot } from "./gardenLayout";

type GardenSceneProps = {
  game: GameState;
  now: number;
  blocked?: boolean;
  hasPendingMail?: boolean;
  initialScrollLeft: number | null;
  onScrollLeftChange: (value: number) => void;
  onBird: () => void;
  onEnterHome: () => void;
  onMailbox: () => void;
  onPlot: (plotId: string) => void;
  mood?: BirdMood;
  speech?: string | null;
};

type GardenViewportProps = {
  initialScrollLeft: number | null;
  onScrollLeftChange: (value: number) => void;
  children: React.ReactNode;
};

export function GardenViewport({ initialScrollLeft, onScrollLeftChange, children }: GardenViewportProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, pointerId: -1, startX: 0, startScrollLeft: 0, moved: false });
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    element.scrollLeft = defaultGardenScrollLeft(element.scrollWidth, element.clientWidth, initialScrollLeft);
  }, [initialScrollLeft]);

  const remember = (event: ReactUIEvent<HTMLDivElement>) => onScrollLeftChange(event.currentTarget.scrollLeft);
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
    drag.current.active = false;
    setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!drag.current.moved) drag.current.moved = false;
    else window.setTimeout(() => { drag.current.moved = false; }, 0);
  };

  return <div ref={viewport} className={`garden-viewport${dragging ? " is-dragging" : ""}`}
    onScroll={remember}
    onPointerDown={(event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("button")) return;
      drag.current = { active: true, pointerId: event.pointerId, startX: event.clientX, startScrollLeft: event.currentTarget.scrollLeft, moved: false };
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
      const delta = drag.current.startX - event.clientX;
      if (Math.abs(delta) > 5) drag.current.moved = true;
      event.currentTarget.scrollLeft = defaultGardenScrollLeft(event.currentTarget.scrollWidth, event.currentTarget.clientWidth, drag.current.startScrollLeft + delta);
      onScrollLeftChange(event.currentTarget.scrollLeft);
    }}
    onPointerUp={endDrag}
    onPointerCancel={endDrag}
    onClickCapture={(event: ReactMouseEvent<HTMLDivElement>) => {
      if (!drag.current.moved) return;
      event.preventDefault();
      event.stopPropagation();
    }}>
    {children}
  </div>;
}

export function GardenScene({ game, now, blocked = false, hasPendingMail = false, initialScrollLeft,
  onScrollLeftChange, onBird, onEnterHome, onMailbox, onPlot, mood = "calm", speech = null }: GardenSceneProps) {
  const { t } = useTranslation();
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const actions = { entrance: onEnterHome, mailbox: onMailbox } as const;
  const routine = game.bird.routine;
  const travelling = getTravelPhase(game, now).kind === "travelling";
  const showBird = !travelling && routine.location === "garden";
  const wateringPlot = preferredWateringPlot(game.plots.filter((plot) => plot.cropId !== null).map((plot) => plot.id));
  const route = gardenRoutePlacement(routine, wateringPlot, now);
  const isGardenRoute = routine.activity === "garden-walk" || routine.activity === "garden-arrive" || routine.activity === "garden-leave";
  const birdStyle = useMemo(() => route.style as CSSProperties, [
    routine.activity,
    routine.activityStartedAt,
    routine.nextDecisionAt,
    routine.gardenSpot,
    routine.walkFrom,
    routine.walkTo,
    wateringPlot.plotId,
  ]);
  const routeArt = route.artMode === "door-hop" ? GARDEN_ROUTE_ART.hopRight
    : route.artMode === "door-enter-back" ? GARDEN_ROUTE_ART.enterBack : undefined;

  return <section className="garden-screen" aria-label={t("garden.sceneLabel")}>
    <GardenViewport initialScrollLeft={initialScrollLeft} onScrollLeftChange={onScrollLeftChange}>
      <div className="garden-canvas">
        <img className="garden-background" src={GARDEN_ART.backgroundAway} alt={t("garden.backgroundAlt")}
          fetchPriority="high" draggable={false} onError={() => setBackgroundFailed(true)} />
        {showBird && <div className="garden-bird-routine" style={birdStyle}
          data-route={route.routeId ?? undefined}
          data-route-kind={route.routeKind ?? undefined}
          data-route-phase={route.phase ?? undefined}
          data-route-art={isGardenRoute ? route.artMode : undefined}
          data-walk-facing={isGardenRoute ? route.facing : undefined}
          data-water-target={isWateringActivity(routine.activity) ? wateringPlot.plotId : undefined}>
          <BirdRoutineSprite activity={routine.activity} location="garden" birdName={game.bird.name} mood={mood} speech={speech}
            facing={isGardenRoute ? route.facing : undefined} artOverride={routeArt}
            playbackKey={route.phase ?? route.routeId ?? routine.activity} onClick={onBird}
            interactionLocked={isWateringActivity(routine.activity) || routine.activity === "garden-arrive" || routine.activity === "garden-leave"}
            disabled={blocked || backgroundFailed} />
        </div>}
        {GARDEN_HOTSPOTS.map((target) => <button key={target.id} type="button"
          className={`garden-hotspot garden-${target.id}`} data-garden-hotspot={target.id}
          style={gardenPlacementStyle(target)} disabled={blocked || backgroundFailed}
          aria-label={t(target.id === "entrance" ? "garden.enterHome" : hasPendingMail ? "garden.mailboxPending" : "garden.mailbox")}
          onClick={actions[target.id]}>
          {target.id === "mailbox" && hasPendingMail && <span className="garden-mail-envelope" aria-hidden="true" />}
        </button>)}
        {GARDEN_PLOTS.map((placement, index) => {
          const plot = game.plots.find((candidate) => candidate.id === placement.plotId);
          if (!plot) return null;
          const phase = getCropPhase(plot, now);
          const crop = plot.cropId ? cropName(t, plot.cropId) : "";
          const label = phase.kind === "empty"
            ? t("garden.plotEmpty", { index: index + 1 })
            : phase.kind === "ready"
              ? t("garden.plotReady", { crop })
              : t("garden.plotGrowing", { crop, seconds: Math.ceil(phase.remainingMs / 1000) });
          return <button key={plot.id} type="button" className={`garden-plot garden-plot-${index + 1}`}
            data-plot={plot.id} data-phase={phase.kind} style={gardenPlacementStyle(placement)}
            disabled={blocked || backgroundFailed} aria-label={label} onClick={() => onPlot(plot.id)}>
            {plot.cropId && <CropArt cropId={plot.cropId} stage={phase.kind === "ready" ? "ready" : "growing"} />}
            {phase.kind !== "empty" && <span className="garden-plot-status" aria-hidden="true">
              {phase.kind === "ready" ? t("plant.harvest") : t("garden.growingSeconds", { seconds: Math.ceil(phase.remainingMs / 1000) })}
            </span>}
          </button>;
        })}
      </div>
    </GardenViewport>
    {backgroundFailed && <p className="garden-image-error" role="alert">{t("scene.imageError")}</p>}
  </section>;
}
