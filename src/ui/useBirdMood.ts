import { useCallback, useEffect, useRef, useState } from "react";
import { BIRD_TIMINGS } from "../domain/config";
import { clickBird, createBirdMood, tickBird } from "../domain/birdMood";

// Mounted once in App: scene changes never replace this state or the click window.
export function useBirdMood(atHome: boolean, sceneVisible: boolean) {
  const [state, setState] = useState(createBirdMood);
  const [visible, setVisible] = useState(() => !document.hidden);
  const active = atHome && sceneVisible && visible;
  const lastTick = useRef(0);
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (!atHome) setState(createBirdMood());
  }, [atHome]);
  useEffect(() => {
    if (!active) return;
    lastTick.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = document.hidden ? 0 : now - lastTick.current;
      lastTick.current = now;
      setState((current) => tickBird(current, now, elapsed));
    }, BIRD_TIMINGS.tickMs);
    return () => window.clearInterval(timer);
  }, [active]);
  const onClick = useCallback(() => {
    if (!active || document.hidden) return;
    const now = performance.now();
    lastTick.current = now;
    setState((current) => clickBird(current, now));
  }, [active]);
  return { mood: atHome ? state.mood : "calm" as const, onClick };
}
