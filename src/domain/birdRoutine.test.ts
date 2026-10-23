import { describe, expect, it } from "vitest";
import {
  createBirdRoutine,
  getGardenWalkDuration,
  getRoomFlightDuration,
  resetBirdRoutineAfterReturn,
  settleBirdRoutine,
} from "./birdRoutine";
import type { BirdRoutineState, GardenSpotId } from "./types";

const now = 1_000_000;

describe("bird routine domain model", () => {
  it("starts indoors and bounds demo decisions to 30–90 seconds", () => {
    expect(createBirdRoutine(now, "demo", () => 0)).toMatchObject({
      location: "room",
      activity: "room-idle",
      previousActivity: null,
      activityStartedAt: now,
      nextDecisionAt: now + 30_000,
      sequenceStep: 0,
      roomSpot: "branch",
    });
    expect(createBirdRoutine(now, "demo", () => 1).nextDecisionAt).toBe(now + 90_000);
  });

  it("flies from the branch to the bed before sleeping and returns after waking", () => {
    const resting = createBirdRoutine(now, "demo", () => 0);
    const outbound = settleBirdRoutine(resting, "home", "demo", resting.nextDecisionAt, () => 0.7);
    expect(outbound).toMatchObject({
      location: "room", activity: "room-flight", roomSpot: "branch",
      flightFrom: "branch", flightTo: "bed", plannedActivity: "room-sleep",
    });
    expect(outbound.nextDecisionAt - outbound.activityStartedAt).toBe(getRoomFlightDuration("branch", "bed"));
    expect(getRoomFlightDuration("bed", "branch")).toBe(4_000);

    const sleeping = settleBirdRoutine(outbound, "home", "demo", outbound.nextDecisionAt, () => 0);
    expect(sleeping).toMatchObject({
      activity: "room-sleep", roomSpot: "bed", flightFrom: null, flightTo: null,
    });
    expect(sleeping.nextDecisionAt - sleeping.activityStartedAt).toBe(90_000);

    const waking = settleBirdRoutine(sleeping, "home", "demo", sleeping.nextDecisionAt, () => 0);
    expect(waking).toMatchObject({ activity: "room-wake", roomSpot: "bed" });
    const returning = settleBirdRoutine(waking, "home", "demo", waking.nextDecisionAt, () => 0);
    expect(returning).toMatchObject({
      activity: "room-flight", roomSpot: "bed", flightFrom: "bed", flightTo: "branch",
      plannedActivity: "room-land",
    });
    const landing = settleBirdRoutine(returning, "home", "demo", returning.nextDecisionAt, () => 0);
    expect(landing).toMatchObject({
      activity: "room-land", roomSpot: "branch", flightFrom: null, flightTo: null,
      plannedActivity: "room-idle",
    });
    expect(landing.nextDecisionAt - landing.activityStartedAt).toBe(1_200);
    expect(settleBirdRoutine(landing, "home", "demo", landing.nextDecisionAt, () => 0)).toMatchObject({
      activity: "room-idle", roomSpot: "branch", plannedActivity: null,
    });
  });

  it("normalizes old indoor saves to the branch without changing their activity", () => {
    const legacy: BirdRoutineState = {
      location: "room", activity: "room-read", activityStartedAt: now,
      nextDecisionAt: now + 30_000, sequenceStep: 2,
    };
    expect(settleBirdRoutine(legacy, "home", "demo", now + 1_000, () => 0)).toMatchObject({
      activity: "room-read", roomSpot: "branch", flightFrom: null, flightTo: null,
    });
  });

  it("remembers the previous activity so the garden entrance can continue into a real walk", () => {
    const arrival: BirdRoutineState = {
      location: "garden", activity: "garden-arrive", activityStartedAt: now,
      nextDecisionAt: now + 5_100, sequenceStep: 3, gardenSpot: "door",
    };
    const walk = settleBirdRoutine(arrival, "home", "demo", now + 5_100, () => 0.4);
    expect((walk as BirdRoutineState & { previousActivity?: string }).previousActivity).toBe("garden-arrive");
    expect(walk).toMatchObject({
      activity: "garden-walk",
      gardenSpot: "door",
      walkFrom: "door",
      walkTo: "forage-center",
      plannedActivity: "garden-forage",
    });
    expect(walk.nextDecisionAt - walk.activityStartedAt).toBe(getGardenWalkDuration("door", "forage"));
  });

  it("completes a persisted walk into its planned action without changing destination", () => {
    const walking: BirdRoutineState = {
      location: "garden", activity: "garden-walk", previousActivity: "garden-arrive",
      activityStartedAt: now, nextDecisionAt: now + getGardenWalkDuration("door", "forage"), sequenceStep: 4,
      gardenSpot: "door", walkFrom: "door", walkTo: "forage", plannedActivity: "garden-forage",
    };
    expect(settleBirdRoutine(walking, "home", "demo", walking.nextDecisionAt, () => 0)).toMatchObject({
      activity: "garden-forage",
      previousActivity: "garden-walk",
      gardenSpot: "forage-center",
      walkFrom: null,
      walkTo: null,
      plannedActivity: null,
    });
  });

  it("walks away from watering and reaches the door before leaving the garden", () => {
    const putdown: BirdRoutineState = {
      location: "garden", activity: "garden-water-putdown", activityStartedAt: now,
      nextDecisionAt: now + 4_000, sequenceStep: 9, gardenSpot: "soil",
    };
    const walkHome = settleBirdRoutine(putdown, "home", "demo", now + 4_000, () => 0.999);
    expect(walkHome).toMatchObject({
      location: "garden", activity: "garden-walk", gardenSpot: "soil",
      walkFrom: "soil", walkTo: "door", plannedActivity: "garden-leave",
    });
    const leaving = settleBirdRoutine(walkHome, "home", "demo", walkHome.nextDecisionAt, () => 0);
    expect(leaving).toMatchObject({ location: "garden", activity: "garden-leave", gardenSpot: "door" });
    const arrivingRoom = settleBirdRoutine(leaving, "home", "demo", leaving.nextDecisionAt, () => 0);
    expect(arrivingRoom).toMatchObject({
      location: "room", activity: "room-arrive", roomSpot: "trunk",
      flightFrom: "trunk", flightTo: "branch", plannedActivity: "room-idle",
    });
    expect(arrivingRoom.nextDecisionAt - arrivingRoom.activityStartedAt).toBe(getRoomFlightDuration("trunk", "branch"));
    expect(settleBirdRoutine(arrivingRoom, "home", "demo", arrivingRoom.nextDecisionAt, () => 0)).toMatchObject({
      location: "room", activity: "room-idle", roomSpot: "branch",
      flightFrom: null, flightTo: null, plannedActivity: null,
    });
  });

  it("keeps long garden interests at the same spot without inserting an in-place walk", () => {
    const forage: BirdRoutineState = {
      location: "garden", activity: "garden-forage", activityStartedAt: now,
      nextDecisionAt: now + 10_000, sequenceStep: 5, gardenSpot: "forage",
    };
    const watering = settleBirdRoutine(forage, "home", "demo", forage.nextDecisionAt, () => 0.8);
    expect(watering).toMatchObject({
      activity: "garden-walk", gardenSpot: "forage-center", walkFrom: "forage-center", walkTo: "soil",
      plannedActivity: "garden-water-pickup",
    });
  });

  it("keeps preening three times longer than an ordinary garden interest", () => {
    const sunny: BirdRoutineState = {
      location: "garden", activity: "garden-sunbathe", activityStartedAt: now,
      nextDecisionAt: now + 10_000, sequenceStep: 5, gardenSpot: "sun",
    };
    const values = [0, 0];
    const preening = settleBirdRoutine(sunny, "home", "demo", sunny.nextDecisionAt, () => values.shift() ?? 0);
    expect(preening).toMatchObject({ activity: "garden-preen", gardenSpot: "sun" });
    expect(preening.nextDecisionAt - preening.activityStartedAt).toBe(30_000);
  });

  it("derives route time from the measured path instead of whole gait cycles", () => {
    expect(getGardenWalkDuration("door", "soil")).toBe(15_740);
    expect(getGardenWalkDuration("door", "soil") % 2_000).not.toBe(0);
    expect(getGardenWalkDuration("soil", "door")).toBe(15_740);
  });

  it("uses the same 5100ms doorway timing in both directions", () => {
    const leavingRoom: BirdRoutineState = {
      location: "room", activity: "room-leave", activityStartedAt: now - 4_000,
      nextDecisionAt: now, sequenceStep: 2, roomSpot: "branch",
      flightFrom: "branch", flightTo: "trunk", plannedActivity: "garden-arrive",
    };
    const arriving = settleBirdRoutine(leavingRoom, "home", "demo", now, () => 0);
    expect(arriving.activity).toBe("garden-arrive");
    expect(arriving.nextDecisionAt - arriving.activityStartedAt).toBe(5_100);

    const atDoor: BirdRoutineState = {
      location: "garden", activity: "garden-walk", activityStartedAt: now - 28_000,
      nextDecisionAt: now, sequenceStep: 8, gardenSpot: "soil",
      walkFrom: "soil", walkTo: "door", plannedActivity: "garden-leave",
    };
    const leaving = settleBirdRoutine(atDoor, "home", "demo", now, () => 0);
    expect(leaving.activity).toBe("garden-leave");
    expect(leaving.nextDecisionAt - leaving.activityStartedAt).toBe(5_100);
  });

  it("chooses a different forage point before beginning a forage action", () => {
    const previous: BirdRoutineState = {
      location: "garden", activity: "garden-forage", gardenSpot: "forage-left",
      activityStartedAt: now, nextDecisionAt: now, sequenceStep: 8,
    };
    const values = [0.4, 0];
    const walking = settleBirdRoutine(previous, "home", "demo", now, () => values.shift() ?? 0);
    expect(walking).toMatchObject({
      activity: "garden-walk", walkFrom: "forage-left", walkTo: "forage-center",
      plannedActivity: "garden-forage",
    });
  });

  it("normalizes the legacy forage alias without losing an active walk", () => {
    const legacy: BirdRoutineState = {
      location: "garden", activity: "garden-walk", gardenSpot: "forage",
      walkFrom: "forage", walkTo: "door", plannedActivity: "garden-leave",
      activityStartedAt: now, nextDecisionAt: now + 2_000, sequenceStep: 4,
    };
    expect(settleBirdRoutine(legacy, "home", "demo", now + 1, () => 0)).toMatchObject({
      gardenSpot: "forage-center", walkFrom: "forage-center", walkTo: "door",
    });
  });

  it("normalizes old garden saves that do not contain route fields", () => {
    const legacy: BirdRoutineState = {
      location: "garden", activity: "garden-walk", previousActivity: "garden-arrive",
      activityStartedAt: now, nextDecisionAt: now + 30_000, sequenceStep: 4,
    };
    expect(settleBirdRoutine(legacy, "home", "demo", now + 1_000, () => 0)).toMatchObject({
      gardenSpot: "path-center", walkFrom: "path-center", walkTo: "path-center",
    });
  });

  it("returns the same object before the next decision", () => {
    const routine = createBirdRoutine(now, "demo", () => 0.5);
    expect(settleBirdRoutine(routine, "home", "demo", routine.nextDecisionAt - 1)).toBe(routine);
  });

  it("settles ordinary activity choices safely at and above the RNG upper endpoint", () => {
    const routine = createBirdRoutine(now, "demo", () => 0);
    const atUpperEndpoint = settleBirdRoutine(routine, "home", "demo", routine.nextDecisionAt, () => 1);
    const aboveUpperEndpoint = settleBirdRoutine(routine, "home", "demo", routine.nextDecisionAt, () => 1.5);

    expect(atUpperEndpoint.activity).toBe("room-ruffle");
    expect(aboveUpperEndpoint.activity).toBe("room-ruffle");
    expect(atUpperEndpoint.location).toBe("room");
    expect(aboveUpperEndpoint.location).toBe("room");
  });

  it("settles multiple overdue decisions through to a future decision time", () => {
    const routine = createBirdRoutine(now, "demo", () => 0);
    const settled = settleBirdRoutine(routine, "home", "demo", now + 600_000, () => 0);
    expect(settled.sequenceStep).toBeGreaterThan(1);
    expect(settled.nextDecisionAt).toBeGreaterThan(now + 600_000);
    expect(["room", "garden"]).toContain(settled.location);
  });

  it("is deterministic for the same initial state and RNG sequence", () => {
    const createRng = () => {
      const values = [0.2, 0.8, 0.4, 0.6, 0.1];
      let index = 0;
      return () => values[index++ % values.length];
    };
    const routine = createBirdRoutine(now, "demo", createRng());
    expect(settleBirdRoutine(routine, "home", "demo", now + 500_000, createRng())).toEqual(
      settleBirdRoutine(routine, "home", "demo", now + 500_000, createRng()),
    );
  });

  it("pauses while travelling and resets indoors after return", () => {
    const garden: BirdRoutineState = {
      location: "garden", activity: "garden-walk", activityStartedAt: now,
      nextDecisionAt: now + 30_000, sequenceStep: 4,
    };
    expect(settleBirdRoutine(garden, "travelling", "demo", now + 1_000_000)).toBe(garden);
    expect(resetBirdRoutineAfterReturn(now + 1_000_000, "demo", () => 0)).toEqual({
      location: "room", activity: "room-idle", previousActivity: null, activityStartedAt: now + 1_000_000,
      nextDecisionAt: now + 1_030_000, sequenceStep: 0, roomSpot: "branch",
      flightFrom: null, flightTo: null, plannedActivity: null,
    });
  });
});
