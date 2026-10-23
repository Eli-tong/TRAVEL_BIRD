import { useRef, useState, type CSSProperties } from "react";
import type { BirdActivityId, BirdLocation } from "../domain/types";
import type { BirdMood } from "../domain/birdMood";
import { BIRD_ROUTINE_ART, BIRD_ROUTINE_FLIGHT_ART, BIRD_ROUTINE_WALK_ART, GARDEN_REACTION_ART, ROOM_BRANCH_REACTION_ART, ROOM_SLEEP_REACTION_ART, type BirdRoutineArt } from "./birdRoutineArt";

export type BirdRoutineSpriteProps = {
  activity: BirdActivityId;
  location: BirdLocation;
  birdName: string;
  mood?: BirdMood;
  speech?: string | null;
  facing?: "left" | "right";
  artOverride?: BirdRoutineArt;
  playbackKey?: string;
  onClick: () => void;
  interactionLocked: boolean;
  disabled?: boolean;
  onAssetError?: (activity: BirdActivityId) => void;
};

const ACTIVITY_LABELS: Record<BirdActivityId, string> = {
  "room-idle": "休息", "room-ruffle": "抖羽", "room-read": "读书", "room-write": "写字",
  "room-flight": "飞行", "room-sleep": "在床上睡觉", "room-wake": "醒来", "room-land": "落到树枝上",
  "room-leave": "飞向树干后面", "room-arrive": "从树干后面回来",
  "garden-arrive": "来到庭院", "garden-walk": "散步", "garden-inspect": "观察植物",
  "garden-preen": "理毛", "garden-forage": "低头啄看",
  "garden-water-pickup": "拿起水壶", "garden-water-pour": "浇水", "garden-water-putdown": "放回水壶",
  "garden-sunbathe": "晒太阳", "garden-leave": "离开庭院"
};

export function BirdRoutineSprite(props: BirdRoutineSpriteProps) {
  // Activity transitions restart the strip, asset state and response timer together.
  return <RoutinePlayer key={`${props.activity}:${props.artOverride?.src ?? "default"}:${props.playbackKey ?? "continuous"}`} {...props} />;
}

function RoutinePlayer({ activity, location, birdName, mood = "calm", speech = null, facing = "left", artOverride, playbackKey, onClick, interactionLocked, disabled = false, onAssetError }: BirdRoutineSpriteProps) {
  const gardenWalking = activity === "garden-walk" || activity === "garden-arrive" || activity === "garden-leave";
  const roomFlying = activity === "room-flight" || activity === "room-leave" || activity === "room-arrive";
  const art = artOverride ?? (gardenWalking ? BIRD_ROUTINE_WALK_ART[facing]
    : roomFlying ? BIRD_ROUTINE_FLIGHT_ART[facing] : BIRD_ROUTINE_ART[activity]);
  const [assetState, setAssetState] = useState<"sprite" | "fallback" | "missing">("sprite");
  const assetErrorReported = useRef(false);

  const style = {
    "--bird-frame-count": art.frameCount,
    "--bird-duration": `${art.frameCount / art.fps}s`,
    "--bird-frame-width": `${art.frameWidth}px`,
    "--bird-frame-height": `${art.frameHeight}px`,
    "--bird-anchor-x": `${art.anchor.x / art.frameWidth * 100}%`,
    "--bird-anchor-y": `${art.anchor.y / art.frameHeight * 100}%`,
    aspectRatio: `${art.frameWidth} / ${art.frameHeight}`
  } as CSSProperties;

  function respond() {
    onClick();
  }

  function failSprite() {
    if (assetErrorReported.current) return;
    assetErrorReported.current = true;
    setAssetState("fallback");
    onAssetError?.(activity);
  }

  const reactionPlacement = activity === "room-sleep" ? "bed" : location === "room" ? "branch" : "ground";
  const reactionSrc = mood === "calm" || mood === "sleepy" ? null
    : reactionPlacement === "bed" ? ROOM_SLEEP_REACTION_ART[mood]
      : reactionPlacement === "branch" ? ROOM_BRANCH_REACTION_ART[mood]
        : GARDEN_REACTION_ART[mood];

  return <button type="button" className="bird-routine-sprite"
    style={style} data-activity={activity} data-location={location} data-frame-count={art.frameCount}
    data-facing={facing}
    data-playback-key={playbackKey}
    data-mood={mood}
    data-hotspot={location === "room" ? "bird" : undefined}
    data-garden-hotspot={location === "garden" ? "bird" : undefined}
    data-interaction-locked={interactionLocked} data-asset-state={assetState}
    disabled={disabled}
    aria-label={`${birdName} · ${location === "room" ? "房间" : "庭院"} · ${ACTIVITY_LABELS[activity]}`}
    onClick={respond}>
    {assetState === "sprite" && <>
      <img className="bird-routine-asset-probe" src={art.src} alt="" hidden onError={failSprite} />
      <span className={`bird-routine-frame${art.loop === "once" ? " is-once" : ""}${reactionSrc ? " is-reaction-covered" : ""}`}
        style={{ ...style, backgroundImage: `url("${art.src}")` }} aria-hidden="true" />
    </>}
    {reactionSrc && <img className="bird-routine-reaction" src={reactionSrc} alt="" draggable={false}
      data-reaction-placement={reactionPlacement} style={reactionPlacement === "branch" ? { height: "auto" } : undefined} />}
    {assetState === "fallback" && <img className="bird-routine-fallback" src={art.fallback}
      alt="" onError={() => setAssetState("missing")} />}
    {assetState === "missing" && <span className="bird-routine-missing" aria-hidden="true">{birdName}</span>}
    {speech && <span className="bird-routine-bubble" role="status">{speech}</span>}
  </button>;
}
