import { describe, expect, test } from "vitest";
import { createNewGame, exportSave, importSave } from "../domain/game";

describe("language save compatibility", () => {
  test("adds the Chinese default to a legacy save without changing progress", () => {
    const state = createNewGame(1_000, "normal");
    state.inventory.seeds.wheat = 7;
    const legacy = JSON.parse(exportSave(state)) as { settings: { language?: string } };
    delete legacy.settings.language;

    const result = importSave(JSON.stringify(legacy));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.game.settings.language).toBe("zh-CN");
    expect(result.game.settings.mode).toBe("normal");
    expect(result.game.inventory.seeds.wheat).toBe(7);
  });

  test("round-trips an English preference on the existing save schema", () => {
    const state = createNewGame(1_000);
    state.settings.language = "en";

    const result = importSave(exportSave(state));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.game.settings.language).toBe("en");
  });
});
