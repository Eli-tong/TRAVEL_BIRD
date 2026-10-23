import { describe, expect, test } from "vitest";
import { createBirdMood, clickBird, tickBird } from "./birdMood";

describe("共享小鸟情绪", () => {
  test("轻点高兴三秒，六十秒有效空闲打盹，轻点唤醒", () => {
    let bird = clickBird(createBirdMood(), 100);
    expect(bird.mood).toBe("happy");
    expect(tickBird(bird, 3099, 2999).mood).toBe("happy");
    bird = tickBird(bird, 3100, 3000);
    expect(bird.mood).toBe("calm");
    bird = tickBird(bird, 60100, 57000);
    expect(bird.mood).toBe("sleepy");
    expect(clickBird(bird, 60200).mood).toBe("happy");
  });
  test("三秒内第六下生气，不会被旧高兴截止时间覆盖，继续点击延长冷静", () => {
    let bird = createBirdMood();
    for (let n = 0; n < 6; n++) bird = clickBird(bird, n * 400);
    expect(bird.mood).toBe("angry");
    bird = tickBird(bird, 5000, 3000);
    expect(bird.mood).toBe("angry");
    bird = clickBird(bird, 6000);
    expect(tickBird(bird, 13999, 7999).mood).toBe("angry");
    expect(tickBird(bird, 14000, 8000).mood).toBe("calm");
  });
  test("慢速点击不惹怒，切换场景不需要重建状态", () => {
    let bird = createBirdMood();
    for (let n = 0; n < 8; n++) bird = clickBird(bird, n * 1000);
    expect(bird.mood).toBe("happy");
    expect(bird.clicks.length).toBe(4);
  });
  test("隐藏时间不计入打盹时间", () => {
    let bird = tickBird(createBirdMood(), 30000, 30000);
    bird = tickBird(bird, 300000, 0);
    expect(bird.mood).toBe("calm");
    expect(tickBird(bird, 329999, 29999).mood).toBe("calm");
    expect(tickBird(bird, 330000, 30000).mood).toBe("sleepy");
  });
});
