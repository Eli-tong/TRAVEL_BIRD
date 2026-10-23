import { afterEach, describe, expect, test, vi } from "vitest";
import { dictionary, translate, translateError } from "./dictionary";

describe("translation fallback", () => {
  afterEach(() => vi.restoreAllMocks());

  test("falls back to Chinese and warns when an English value is missing", () => {
    const original = dictionary.en["food.cook"];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    delete (dictionary.en as Partial<typeof dictionary.en>)["food.cook"];

    try {
      expect(translate("en", "food.cook")).toBe("制作");
      expect(warn).toHaveBeenCalledWith('[i18n] Missing "en" translation for "food.cook"; falling back to zh-CN.');
    } finally {
      dictionary.en["food.cook"] = original;
    }
  });

  test("interpolates values after selecting the fallback language", () => {
    const original = dictionary.en["food.owned"];
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    delete (dictionary.en as Partial<typeof dictionary.en>)["food.owned"];

    try {
      expect(translate("en", "food.owned", { count: 3 })).toBe("现有 3");
    } finally {
      dictionary.en["food.owned"] = original;
    }
  });

  test("localizes existing domain errors without exposing their legacy Chinese messages", () => {
    expect(translateError("en", "材料不足")).toBe("Not enough ingredients");
    expect(translateError("en", "JSON 解析失败")).toBe("The save data is not valid JSON");
    expect(translateError("zh-CN", "error.saveJson")).toBe("JSON 解析失败");
  });
});

test("registers the approved bilingual titles and full letters for all ten postcards", () => {
  const titles = [
    ["wind_field_01", "风车打了个哈欠", "The Windmill Yawned"],
    ["wind_field_02", "追帽子的小兔子", "The Rabbit and the Runaway Hat"],
    ["wind_field_03", "麦浪里的晚安", "Goodnight in the Wheat Waves"],
    ["moss_forest_01", "雨珠敲醒小路", "Raindrops Wake the Path"],
    ["moss_forest_02", "小鹿的苔光地图", "The Fawn's Mosslight Map"],
    ["moss_forest_03", "蘑菇灯亮起来", "When the Mushroom Lamps Came On"],
    ["salt_town_01", "白帆早市", "The White-Sail Morning Market"],
    ["salt_town_02", "会拍“翅膀”的海豹", "The Seal Who Clapped Like Wings"],
    ["salt_town_03", "点心铺最后一盏灯", "The Treat Shop's Last Light"],
  ] as const;

  expect(dictionary["zh-CN"]["postcard.location"]).toBe("蒲公英风坡");
  expect(dictionary.en["postcard.location"]).toBe("Dandelion Breeze Hill");
  for (const [id, zhTitle, enTitle] of titles) {
    const titleKey = `postcard.${id}.title` as keyof typeof dictionary["zh-CN"];
    const storyKey = `postcard.${id}.story` as keyof typeof dictionary["zh-CN"];
    expect(dictionary["zh-CN"][titleKey]).toBe(zhTitle);
    expect(dictionary.en[titleKey]).toBe(enTitle);
    expect(dictionary["zh-CN"][storyKey]).toContain("\n\n");
    expect(dictionary.en[storyKey]).toContain("\n\n");
  }
});

test("registers four unique six-line bilingual bird response pools", () => {
  const prefixes = [
    "bird.response.happy", "bird.response.angry",
    "bird.response.bed.happy", "bird.response.bed.angry",
  ] as const;
  const allZhLines: string[] = [];
  const allEnLines: string[] = [];

  for (const prefix of prefixes) {
    const zhLines: string[] = [];
    const enLines: string[] = [];
    for (let index = 1; index <= 6; index += 1) {
      const suffix = String(index).padStart(2, "0");
      const key = `${prefix}.${suffix}` as keyof typeof dictionary["zh-CN"];
      zhLines.push(dictionary["zh-CN"][key]);
      enLines.push(dictionary.en[key]);
      allZhLines.push(dictionary["zh-CN"][key]);
      allEnLines.push(dictionary.en[key]);
    }
    expect(new Set(zhLines).size).toBe(6);
    expect(new Set(enLines).size).toBe(6);
    expect(zhLines.every((line) => /^（[^）]+）/.test(line))).toBe(true);
    expect(enLines.every((line) => /^\([^)]+\)/.test(line))).toBe(true);
  }
  expect(new Set(allZhLines).size).toBe(24);
  expect(new Set(allEnLines).size).toBe(24);
  expect(dictionary["zh-CN"]["bird.response.angry.01"])
    .toBe("（炸毛）再戳就要咬你了！");
  expect(dictionary["zh-CN"]["bird.response.bed.angry.01"])
    .toBe("（睡毛炸开）再戳就要咬你了，我还没睡够！");
});
