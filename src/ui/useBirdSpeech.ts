import { useCallback, useEffect, useRef, useState } from "react";
import { BIRD_TIMINGS } from "../domain/config";
import type { BirdMood } from "../domain/birdMood";

export const BIRD_RESPONSE_KEYS = {
  general: {
    happy: [
      "bird.response.happy.01", "bird.response.happy.02", "bird.response.happy.03",
      "bird.response.happy.04", "bird.response.happy.05", "bird.response.happy.06",
    ],
    angry: [
      "bird.response.angry.01", "bird.response.angry.02", "bird.response.angry.03",
      "bird.response.angry.04", "bird.response.angry.05", "bird.response.angry.06",
    ],
  },
  bed: {
    happy: [
      "bird.response.bed.happy.01", "bird.response.bed.happy.02", "bird.response.bed.happy.03",
      "bird.response.bed.happy.04", "bird.response.bed.happy.05", "bird.response.bed.happy.06",
    ],
    angry: [
      "bird.response.bed.angry.01", "bird.response.bed.angry.02", "bird.response.bed.angry.03",
      "bird.response.bed.angry.04", "bird.response.bed.angry.05", "bird.response.bed.angry.06",
    ],
  },
} as const;

export type BirdSpeechContext = keyof typeof BIRD_RESPONSE_KEYS;
type BirdSpeechMood = keyof typeof BIRD_RESPONSE_KEYS.general;
export type BirdSpeechKey =
  | (typeof BIRD_RESPONSE_KEYS.general.happy)[number]
  | (typeof BIRD_RESPONSE_KEYS.general.angry)[number]
  | (typeof BIRD_RESPONSE_KEYS.bed.happy)[number]
  | (typeof BIRD_RESPONSE_KEYS.bed.angry)[number];

export function useBirdSpeech(
  mood: BirdMood,
  active: boolean,
  context: BirdSpeechContext = "general",
) {
  const [speech, setSpeech] = useState<{
    key: BirdSpeechKey;
    mood: BirdSpeechMood;
    token: number;
  } | null>(null);
  const token = useRef(0);
  const indices = useRef<Record<BirdSpeechContext, Record<BirdSpeechMood, number>>>({
    general: { happy: 0, angry: 0 },
    bed: { happy: 0, angry: 0 },
  });

  const respond = useCallback(() => {
    const responseMood: BirdSpeechMood = mood === "angry" ? "angry" : "happy";
    const pool = BIRD_RESPONSE_KEYS[context][responseMood] as readonly BirdSpeechKey[];
    const index = indices.current[context][responseMood];
    const key = pool[index % pool.length];
    indices.current[context][responseMood] = index + 1;
    setSpeech({ key, mood: responseMood, token: ++token.current });
  }, [context, mood]);

  useEffect(() => {
    setSpeech(null);
  }, [context]);

  useEffect(() => {
    if (!active || mood !== "angry") return;
    const key = BIRD_RESPONSE_KEYS[context].angry[0];
    indices.current[context].angry = 1;
    setSpeech({ key, mood: "angry", token: ++token.current });
  }, [active, context, mood]);

  useEffect(() => {
    if (!active) {
      setSpeech(null);
      return;
    }
    if (!speech) return;
    const duration = speech.mood === "angry" ? BIRD_TIMINGS.calmDownMs : BIRD_TIMINGS.happyMs;
    const timer = window.setTimeout(() => setSpeech(null), duration);
    return () => window.clearTimeout(timer);
  }, [active, speech]);

  return { speechKey: speech?.key ?? null, respond };
}
