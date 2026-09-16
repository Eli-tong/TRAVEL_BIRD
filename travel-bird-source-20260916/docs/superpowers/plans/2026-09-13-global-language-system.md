# Global Chinese/English Language System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `GameState.settings.language` setting update every player-visible surface immediately, persist across reloads, remain compatible with older saves, and fall back safely when an English string is missing.

**Architecture:** Keep the current lightweight dictionary and `LanguageContext`; do not add an i18n dependency or a second language state. Add typed content keys for domain-backed labels, return stable error keys from domain operations, and translate only at the React display boundary.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest, jsdom.

## Global Constraints

- Modify only phase 2 language behavior; do not change travel rewards, bird state logic, yard layout, art assets, or inventory IDs.
- Preserve the `travel-bird-save-v1` storage key and all inventory, crop, postcard, and journey progress.
- Language changes must update the currently open UI without refresh.
- Missing English copy must warn in development and fall back to Chinese, never a raw key or `undefined`.
- Preserve all pre-existing uncommitted work.

---

### Task 1: Translation contract and fallback

**Files:**
- Modify: `src/i18n/dictionary.ts`
- Create: `src/i18n/dictionary.test.ts`

**Interfaces:**
- Produces: `translate(language, key, values)` and `translateError(language, value)` with Chinese fallback and interpolation.

- [ ] Add tests that temporarily remove one English value, expect the Chinese value, and expect `console.warn` in development.
- [ ] Run `pnpm vitest run src/i18n/dictionary.test.ts`; expect the new fallback test to fail before implementation.
- [ ] Add all phase-2 UI, accessibility, inventory, planting, cooking, settings, save, postcard, bird-response, travel-reservation, and error keys to both locales.
- [ ] Implement fallback and interpolation once in `translate`.
- [ ] Re-run the dictionary test; expect all tests to pass.

### Task 2: Save compatibility and single language source

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/game.ts`
- Create: `src/i18n/languageSave.test.ts`

**Interfaces:**
- Consumes: `Language = "zh-CN" | "en"`.
- Produces: every new/normalized `GameState` has `settings.language`; legacy saves without it import as `zh-CN`.

- [ ] Add a test that deletes `settings.language` from an otherwise valid v1 save and verifies import preserves progress while adding `zh-CN`.
- [ ] Run `pnpm vitest run src/i18n/languageSave.test.ts`; expect the default-language assertion to fail.
- [ ] Default new games and normalized imports to `zh-CN` without changing the save version or storage key.
- [ ] Re-run the save-language test; expect it to pass.

### Task 3: Immediate UI translation

**Files:**
- Create: `src/App.i18n.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/ui/RoomScene.tsx`
- Modify: `src/ui/Modal.tsx`
- Modify: `src/ui/Art.tsx`

**Interfaces:**
- Consumes: the sole language value supplied by `LanguageContext.Provider` from `game.settings.language`.
- Produces: translated live settings, save tools, inventory names/counts, scene labels, bird responses, modals, cooking/planting copy, and dynamic content labels.

- [ ] Add an integration test that opens Settings, switches to English without refresh, verifies settings/save copy, closes it, verifies Inventory and a bird response, switches back to Chinese, and verifies persistence in localStorage.
- [ ] Run `pnpm vitest run src/App.i18n.test.tsx`; expect failures on the hard-coded Chinese labels.
- [ ] Replace player-visible literals with typed translation calls; pass localized labels into reusable modal and room components.
- [ ] Translate domain errors at the UI boundary and use locale-aware date/time/count formatting.
- [ ] Re-run the integration test and focused existing UI tests; expect all focused tests to pass.

### Task 4: Phase-2 verification gate

**Files:**
- Inspect only: all changed files and `src/**/*.{ts,tsx}`.

- [ ] Run a hard-coded-copy scan and confirm remaining Chinese in production TypeScript is domain persistence/compatibility data or developer-only diagnostics, not active player-visible UI.
- [ ] Run `pnpm vitest run src/i18n/dictionary.test.ts src/i18n/languageSave.test.ts src/App.i18n.test.tsx src/ui/Modal.test.tsx src/ui/PanelSurface.test.tsx src/ui/RoomScene.test.tsx src/ui/PostcardPreview.test.tsx`.
- [ ] Run `pnpm build`.
- [ ] Run the full `pnpm test` and report unrelated baseline failures separately if they remain.
- [ ] Review `git diff --check`, `git status --short`, and the exact changed-file diff to confirm phase-2-only scope.
