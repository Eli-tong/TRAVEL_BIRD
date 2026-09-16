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
