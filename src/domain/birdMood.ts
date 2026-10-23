import { BIRD_TIMINGS } from "./config";

export type BirdMood = "calm" | "happy" | "sleepy" | "angry";
export interface BirdInteraction {
  mood: BirdMood;
  clicks: number[];
  deadline: number;
  idleMs: number;
}
export const createBirdMood = (): BirdInteraction => ({ mood: "calm", clicks: [], deadline: 0, idleMs: 0 });

export function clickBird(state: BirdInteraction, now: number): BirdInteraction {
  const clicks = [...state.clicks.filter((at) => now - at <= BIRD_TIMINGS.clickWindowMs), now];
  const angry = state.mood === "angry" || clicks.length >= BIRD_TIMINGS.angryClicks;
  return {
    mood: angry ? "angry" : "happy",
    clicks,
    deadline: now + (angry ? BIRD_TIMINGS.calmDownMs : BIRD_TIMINGS.happyMs),
    idleMs: 0
  };
}

export function tickBird(state: BirdInteraction, now: number, visibleElapsedMs: number): BirdInteraction {
  const idleMs = state.idleMs + Math.max(0, visibleElapsedMs);
  let mood = state.mood;
  if ((mood === "happy" || mood === "angry") && now >= state.deadline) mood = "calm";
  if (mood === "calm" && idleMs >= BIRD_TIMINGS.idleMs) mood = "sleepy";
  return { ...state, mood, idleMs };
}
