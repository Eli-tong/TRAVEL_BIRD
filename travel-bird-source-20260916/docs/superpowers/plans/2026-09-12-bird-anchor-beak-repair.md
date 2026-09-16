# Bird Anchor and Postcard Beak Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the calm indoor bird's physical foot contact and remove only the two dark nostril marks from the merged first postcard front.

**Architecture:** Keep the approved room background and calm bird source unchanged. Measure the bird's real alpha foot contact and the branch top in the shared 941×1672 art plane, then update the existing `ROOM_SPRITES.bird` anchor data. Create a derivative postcard front by a tiny deterministic beak-only raster repair and point the existing postcard config at it.

**Tech Stack:** React, TypeScript, Vite, existing Node/Python asset scripts, Playwright screenshots.

## Global Constraints

- Preserve all original source and pre-repair files; every repaired raster is a new path.
- Do not regenerate the whole bird, room background, postcard, other bird moods, other postcards, travel logic, kitchen, save, or unrelated UI.
- Use one shared scene coordinate system; do not add viewport-specific `translateY` patches.
- The postcard is merged; repair only the beak and its immediately surrounding pixels.
- All future bird prompts include: “绘本化简化的小型弯喙，喙面颜色与明暗连续，不表现任何明显的深色鼻孔、黑点、孔洞或替代性的深色斑点。”

### Task 1: Measure current assets and write regression fixtures

**Files:**
- Create: `scripts/measure-bird-contact.py`
- Create: `assets/derived/bird-anchor-measurement.json`
- Test: `src/ui/roomLayout.test.ts`

- [ ] Measure alpha bounds and the lowest visible pixels of both feet in the 420×540 calm PNG; measure the branch top from the clean 941×1672 background at the bird contact x-range.
- [ ] Record source dimensions, alpha bounds, left/right foot minima, midpoint `footContactAnchor`, branch contact point, and the existing anchor values in JSON without altering inputs.
- [ ] Add a pure layout test asserting `spriteStyle(ROOM_SPRITES.bird)` uses the recorded contact point and shared room coordinates.

### Task 2: Create the minimal postcard beak derivative

**Files:**
- Create: `scripts/repair-postcard-beak.py`
- Create: `public/art/postcards/postcard-first-dandelion-hill-blue-quaker-front-repaired.webp`
- Create: `assets/derived/postcard-beak-repair-metadata.json`

- [ ] Use the merged source PNG as input and copy only a small beak ROI into a new image; reconstruct nostril pixels from adjacent beak-color neighborhoods while retaining watercolor texture and all pixels outside the ROI byte-for-byte.
- [ ] Validate that image dimensions remain unchanged, the ROI is inside the beak, and the two dark nostril components are absent without adding new dark components.
- [ ] Preserve the original WebP and source PNG.

### Task 3: Update existing asset configuration and documentation

**Files:**
- Modify: `src/ui/roomLayout.ts`
- Modify: `src/domain/config.ts`
- Modify: `PROGRESS.md`

- [ ] Set the room calm bird to the repaired derivative only if measurement confirms it is the active asset; update its existing `anchor/contact` fields to measured `footContactAnchor/branchContactAnchor` values without changing the schema architecture.
- [ ] Point only the first postcard front variant at the repaired derivative.
- [ ] Record old/new paths, dimensions, measured anchors, merged-layer determination, local repair status, and remaining derived images to inspect.
- [ ] Add the role-art standard and required future prompt sentence to the existing progress/art guidance.

### Task 4: Verify rendered behavior and build

**Files:**
- Create: `output/visual-repair/room-320x568.png`
- Create: `output/visual-repair/room-390x844.png`
- Create: `output/visual-repair/room-1440x1000.png`
- Create: `output/visual-repair/postcard-front-390x844.png`
- Create: `output/visual-repair/verification.json`

- [ ] Run the existing typecheck and formal production build.
- [ ] Capture the requested mobile and desktop room views and the postcard front; inspect foot contact, clipping, hotspot alignment, interaction animation, postcard beak, and postcard back text.
- [ ] Confirm changed files are limited to the two repairs, measurement/repair scripts, documentation, and verification outputs.
