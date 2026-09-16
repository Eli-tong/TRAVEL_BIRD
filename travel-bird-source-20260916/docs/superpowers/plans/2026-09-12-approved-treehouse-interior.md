# Approved Treehouse Interior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old room with the approved treehouse illustration while keeping the bird and satchel independent and preserving the three existing interactive panels.

**Architecture:** Derive one repaired background plus two transparent layers from the approved source. Render every visible layer and hit target in one 944×1674 art plane so crop and interaction coordinates cannot diverge.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest, Chromium/Playwright, built-in image editing.

## Global Constraints

- The approved source image is the only visual authority and must remain unchanged.
- Create only the repaired background, calm blue Quaker layer, and satchel layer.
- Reuse the current inventory, kitchen, bag, save, and deployment behavior.
- Validate only the 390×844 interior in this round; do not modify the garden or add travel features.

---

### Task 1: Prepare and inspect the minimum art layers

**Files:**
- Preserve: `assets/concepts/treehouse-interior-direction-01.png`
- Create: `assets/derived/treehouse-interior-background.png`
- Create: `assets/derived/blue-quaker-calm.png`
- Create: `assets/derived/satchel.png`
- Create: `public/art/treehouse-interior.webp`
- Create: `public/art/treehouse-bird-calm.webp`
- Create: `public/art/treehouse-satchel.webp`
- Modify: `PROGRESS.md`

- [ ] Confirm the approved source hash matches the attachment.
- [ ] Edit the source once to remove only the bird and satchel and reconstruct the hidden branch/table pixels.
- [ ] Extract one calm bird and one satchel on genuine alpha backgrounds.
- [ ] Inspect dimensions, alpha, halos, checkerboard artifacts, and visual fidelity.
- [ ] Convert approved derivatives to web assets without changing composition.
- [ ] Record paths, hashes, dimensions, and next step in `PROGRESS.md`.

### Task 2: Lock coordinates and connect the approved room

**Files:**
- Create: `src/ui/roomLayout.ts`
- Create: `src/ui/roomLayout.test.ts`
- Modify: `src/ui/Scene.tsx`
- Modify: `src/ui/Art.tsx`
- Modify: `src/ui/preload.ts`
- Modify: `src/scene.css`
- Modify: `PROGRESS.md`

- [ ] Write tests for `toPercentRect` using the 944×1674 art plane and for the three named room targets.
- [ ] Run the focused test and confirm the missing-module failure.
- [ ] Implement the minimal immutable room layout constants and conversion helper.
- [ ] Run the focused test and confirm it passes.
- [ ] Replace the old room assets and coordinates while retaining existing callbacks.
- [ ] Run focused tests and relevant existing tests.
- [ ] Record the integration milestone in `PROGRESS.md`.

### Task 3: Verify the production room

**Files:**
- Create: `output/playwright/approved-room-390x844.png`
- Create: `output/playwright/approved-room-checks.json`
- Modify: `PROGRESS.md`

- [ ] Run the app and open it in real Chromium at 390×844.
- [ ] Check dimensions, overflow, asset requests, and browser errors.
- [ ] Open and close bag, kitchen, and inventory from their actual scene targets.
- [ ] Capture the clean room screenshot and compare it with the approved source.
- [ ] Run `pnpm build`, `pnpm test`, and `git diff --check`; record exact outcomes.
- [ ] Update `PROGRESS.md` with the screenshot, build result, and remaining issues, then stop.

