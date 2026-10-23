import type { BirdActivityId, BirdRoutineState, GardenSpotId, Mode, RoomSpotId, TravelStatus } from "./types";
import { gardenWalkDurationMs } from "./gardenMotion";

export type Rng = () => number;

export const BIRD_ROUTINE_TIMINGS = {
  demo: { minDecisionMs: 30_000, maxDecisionMs: 90_000 },
  normal: { minDecisionMs: 6 * 60_000, maxDecisionMs: 18 * 60_000 },
} as const;

const TRANSITION_MS = 4_000;
const GARDEN_ARRIVE_MS = 5_100;
const GARDEN_LEAVE_MS = 5_100;
const ROOM_FLIGHT_MS = 4_000;
const ROOM_LAND_MS = 1_200;
const MAX_DECISIONS_PER_SETTLEMENT = 64;
const GARDEN_GOALS = [
  { activity: "garden-preen", spot: "sun" },
  { activity: "garden-preen", spot: "sun" },
  { activity: "garden-preen", spot: "sun" },
  { activity: "garden-forage", spot: "forage" },
  { activity: "garden-forage", spot: "forage" },
  { activity: "garden-forage", spot: "forage" },
  { activity: "garden-sunbathe", spot: "sun" },
  { activity: "garden-water-pickup", spot: "soil" },
  { activity: "garden-leave", spot: "door" },
] as const satisfies ReadonlyArray<{ activity: BirdActivityId; spot: GardenSpotId }>;
const FORAGE_SPOTS = ["forage-left", "forage-center", "forage-right"] as const;
const clampRandom = (rng: Rng): number => {
  const value = rng();
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

function decisionDelay(mode: Mode, rng: Rng): number {
  const { minDecisionMs, maxDecisionMs } = BIRD_ROUTINE_TIMINGS[mode];
  return minDecisionMs + Math.round(clampRandom(rng) * (maxDecisionMs - minDecisionMs));
}

function choose<T>(options: readonly T[], rng: Rng): T {
  const index = Math.min(options.length - 1, Math.floor(clampRandom(rng) * options.length));
  return options[index];
}

export function getGardenWalkDuration(from: GardenSpotId, to: GardenSpotId): number {
  return gardenWalkDurationMs(normalizeGardenSpot(from)!, normalizeGardenSpot(to)!);
}

export function getRoomFlightDuration(_from: RoomSpotId, _to: RoomSpotId): number {
  return ROOM_FLIGHT_MS;
}

function roomSleepDwell(mode: Mode, rng: Rng): number {
  return decisionDelay(mode, rng) * 3;
}

function gardenDwell(activity: BirdActivityId, mode: Mode, rng: Rng): number {
  const [min, max] = mode === "demo" ? [10_000, 18_000] : [2 * 60_000, 5 * 60_000];
  const base = min + Math.round(clampRandom(rng) * (max - min));
  return activity === "garden-preen" ? base * 3 : base;
}

function schedule(state: Pick<BirdRoutineState, "activity" | "walkFrom" | "walkTo">, mode: Mode, rng: Rng): number {
  if (state.activity === "room-flight" || state.activity === "room-arrive") return ROOM_FLIGHT_MS;
  if (state.activity === "room-land") return ROOM_LAND_MS;
  if (state.activity === "room-sleep") return roomSleepDwell(mode, rng);
  if (state.activity === "garden-walk" && state.walkFrom && state.walkTo) {
    return getGardenWalkDuration(state.walkFrom, state.walkTo);
  }
  if (state.activity === "garden-preen" || state.activity === "garden-forage" || state.activity === "garden-sunbathe") {
    return gardenDwell(state.activity, mode, rng);
  }
  if (state.activity === "garden-arrive") return GARDEN_ARRIVE_MS;
  if (state.activity === "garden-leave") return GARDEN_LEAVE_MS;
  return state.activity === "room-leave" || state.activity === "room-wake" || state.activity === "garden-water-pickup" ||
    state.activity === "garden-water-pour" || state.activity === "garden-water-putdown"
    ? TRANSITION_MS : decisionDelay(mode, rng);
}

function normalizeRoomRoute(routine: BirdRoutineState): BirdRoutineState {
  if (routine.location !== "room" || routine.roomSpot) return routine;
  if (routine.activity === "room-leave") {
    return { ...routine, roomSpot: "branch", flightFrom: "branch", flightTo: "trunk", plannedActivity: "garden-arrive" };
  }
  if (routine.activity === "room-arrive") {
    return { ...routine, roomSpot: "trunk", flightFrom: "trunk", flightTo: "branch", plannedActivity: "room-idle" };
  }
  if (routine.activity === "room-land") {
    return { ...routine, roomSpot: "branch", flightFrom: null, flightTo: null, plannedActivity: "room-idle" };
  }
  const roomSpot: RoomSpotId = routine.activity === "room-sleep" || routine.activity === "room-wake" ? "bed" : "branch";
  if (routine.activity === "room-flight") {
    return { ...routine, roomSpot, flightFrom: roomSpot, flightTo: roomSpot, plannedActivity: "room-idle" };
  }
  return { ...routine, roomSpot, flightFrom: null, flightTo: null };
}

function normalizeGardenSpot(spot: GardenSpotId | null | undefined): GardenSpotId | null | undefined {
  return spot === "forage" ? "forage-center" : spot;
}

function chooseForageSpot(current: GardenSpotId, rng: Rng): GardenSpotId {
  const normalized = normalizeGardenSpot(current);
  return choose(FORAGE_SPOTS.filter((spot) => spot !== normalized), rng);
}

function spotForLegacyActivity(activity: BirdActivityId): GardenSpotId {
  if (activity === "garden-arrive" || activity === "garden-leave") return "door";
  if (activity === "garden-water-pickup" || activity === "garden-water-pour" ||
    activity === "garden-water-putdown" || activity === "garden-inspect") return "soil";
  if (activity === "garden-forage") return "forage-center";
  if (activity === "garden-sunbathe" || activity === "garden-preen") return "sun";
  return "path-center";
}

function normalizeGardenRoute(routine: BirdRoutineState): BirdRoutineState {
  if (routine.location !== "garden") return routine;
  const normalized: BirdRoutineState = {
    ...routine,
    gardenSpot: normalizeGardenSpot(routine.gardenSpot) ?? undefined,
    walkFrom: normalizeGardenSpot(routine.walkFrom),
    walkTo: normalizeGardenSpot(routine.walkTo),
  };
  if (normalized.gardenSpot) return normalized;
  const gardenSpot = spotForLegacyActivity(normalized.activity);
  if (normalized.activity === "garden-walk") {
    return { ...normalized, gardenSpot, walkFrom: gardenSpot, walkTo: gardenSpot, plannedActivity: "garden-preen" };
  }
  return { ...normalized, gardenSpot, walkFrom: null, walkTo: null, plannedActivity: null };
}

function begin(
  previous: BirdRoutineState,
  activity: BirdActivityId,
  startedAt: number,
  mode: Mode,
  rng: Rng,
  route: Pick<BirdRoutineState, "gardenSpot" | "walkFrom" | "walkTo" | "roomSpot" | "flightFrom" | "flightTo" | "plannedActivity"> = {},
): BirdRoutineState {
  const location = activity.startsWith("garden-") ? "garden" : "room";
  const draft: BirdRoutineState = {
    location, activity, previousActivity: previous.activity, activityStartedAt: startedAt,
    nextDecisionAt: startedAt, sequenceStep: previous.sequenceStep + 1, ...route,
  };
  return { ...draft, nextDecisionAt: startedAt + schedule(draft, mode, rng) };
}

function planGardenGoal(previous: BirdRoutineState, startedAt: number, mode: Mode, rng: Rng): BirdRoutineState {
  const from = normalizeGardenSpot(previous.gardenSpot) ?? spotForLegacyActivity(previous.activity);
  const selected = choose(GARDEN_GOALS, rng);
  const goal = selected.activity === "garden-forage"
    ? { activity: selected.activity, spot: chooseForageSpot(from, rng) }
    : selected;
  if (from === goal.spot) {
    return begin(previous, goal.activity, startedAt, mode, rng, {
      gardenSpot: goal.spot, walkFrom: null, walkTo: null, plannedActivity: null,
    });
  }
  return begin(previous, "garden-walk", startedAt, mode, rng, {
    gardenSpot: from, walkFrom: from, walkTo: goal.spot, plannedActivity: goal.activity,
  });
}

function advance(previous: BirdRoutineState, startedAt: number, mode: Mode, rng: Rng): BirdRoutineState {
  switch (previous.activity) {
    case "room-idle":
    case "room-read":
    case "room-write": {
      const next = choose(["room-idle", "room-read", "room-write", "room-sleep", "room-ruffle"] as const, rng);
      if (next === "room-sleep") {
        return begin(previous, "room-flight", startedAt, mode, rng, {
          roomSpot: "branch", flightFrom: "branch", flightTo: "bed", plannedActivity: "room-sleep",
        });
      }
      return begin(previous, next, startedAt, mode, rng, {
        roomSpot: "branch", flightFrom: null, flightTo: null, plannedActivity: null,
      });
    }
    case "room-flight": {
      const roomSpot = previous.flightTo ?? previous.roomSpot ?? "branch";
      const activity = previous.plannedActivity ?? "room-idle";
      return begin(previous, activity, startedAt, mode, rng, {
        roomSpot, flightFrom: null, flightTo: null, plannedActivity: activity === "room-land" ? "room-idle" : null,
      });
    }
    case "room-arrive":
      return begin(previous, "room-idle", startedAt, mode, rng, {
        roomSpot: "branch", flightFrom: null, flightTo: null, plannedActivity: null,
      });
    case "room-land":
      return begin(previous, "room-idle", startedAt, mode, rng, {
        roomSpot: "branch", flightFrom: null, flightTo: null, plannedActivity: null,
      });
    case "room-sleep":
      return begin(previous, "room-wake", startedAt, mode, rng, {
        roomSpot: "bed", flightFrom: null, flightTo: null, plannedActivity: null,
      });
    case "room-wake":
      return begin(previous, "room-flight", startedAt, mode, rng, {
        roomSpot: "bed", flightFrom: "bed", flightTo: "branch", plannedActivity: "room-land",
      });
    case "room-ruffle":
      return begin(previous, "room-leave", startedAt, mode, rng, {
        roomSpot: "branch", flightFrom: "branch", flightTo: "trunk", plannedActivity: "garden-arrive",
      });
    case "room-leave":
      return begin(previous, "garden-arrive", startedAt, mode, rng, {
        gardenSpot: "door-inside", walkFrom: null, walkTo: null, plannedActivity: null,
      });
    case "garden-arrive":
      return planGardenGoal({ ...previous, gardenSpot: "door" }, startedAt, mode, rng);
    case "garden-inspect":
    case "garden-preen":
    case "garden-forage":
    case "garden-sunbathe":
    case "garden-water-putdown":
      return planGardenGoal(previous, startedAt, mode, rng);
    case "garden-walk": {
      const spot = previous.walkTo ?? previous.gardenSpot ?? "path-center";
      const activity = previous.plannedActivity ?? "garden-preen";
      return begin(previous, activity, startedAt, mode, rng, {
        gardenSpot: spot, walkFrom: null, walkTo: null, plannedActivity: null,
      });
    }
    case "garden-water-pickup":
      return begin(previous, "garden-water-pour", startedAt, mode, rng, {
        gardenSpot: "soil", walkFrom: null, walkTo: null, plannedActivity: null,
      });
    case "garden-water-pour":
      return begin(previous, "garden-water-putdown", startedAt, mode, rng, {
        gardenSpot: "soil", walkFrom: null, walkTo: null, plannedActivity: null,
      });
    case "garden-leave":
      return begin(previous, "room-arrive", startedAt, mode, rng, {
        roomSpot: "trunk", flightFrom: "trunk", flightTo: "branch", plannedActivity: "room-idle",
      });
  }
}

export function createBirdRoutine(now: number, mode: Mode, rng: Rng = Math.random): BirdRoutineState {
  return {
    location: "room",
    activity: "room-idle",
    previousActivity: null,
    activityStartedAt: now,
    nextDecisionAt: now + decisionDelay(mode, rng),
    sequenceStep: 0, roomSpot: "branch", flightFrom: null, flightTo: null, plannedActivity: null,
  };
}

export function settleBirdRoutine(
  routine: BirdRoutineState,
  travelStatus: TravelStatus,
  mode: Mode,
  now: number,
  rng: Rng = Math.random,
): BirdRoutineState {
  if (travelStatus === "travelling") return routine;
  const normalized = normalizeGardenRoute(normalizeRoomRoute(routine));
  if (now < normalized.nextDecisionAt) return normalized;

  let settled = normalized;
  let decisions = 0;
  while (settled.nextDecisionAt <= now && decisions < MAX_DECISIONS_PER_SETTLEMENT) {
    const startedAt = settled.nextDecisionAt;
    settled = advance(settled, startedAt, mode, rng);
    decisions += 1;
  }

  if (settled.nextDecisionAt <= now) {
    settled = { ...settled, nextDecisionAt: now + schedule(settled, mode, rng) };
  }
  return settled;
}

export function resetBirdRoutineAfterReturn(now: number, mode: Mode, rng: Rng = Math.random): BirdRoutineState {
  return createBirdRoutine(now, mode, rng);
}
