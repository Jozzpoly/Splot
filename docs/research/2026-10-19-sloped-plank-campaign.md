# Splot — first fundamental geometry campaign, 19 October 2026

**Status: experimental on a dedicated branch. Not a new playable release, not an approved 2.5D substrate, and not a map-editor specification.**

## Why this campaign exists

The owner repeatedly rejected technically cleaner but less playable experiments, especially K3. The best current Splot has a playable material interaction loop, but one hard-coded bridge/ramp remains in the simulation and renderer. Passing collision or navigation tests is not evidence that the world is legible, fun, mobile-usable, or authorable. The task is to attack geometry fragmentation while keeping the older game operational.

**Non-goal:** migrating the entire game to the K3 geometry laboratory. This branch does not add a second playable ramp, improve controls, choose a 3D engine, solve occlusion, or claim robust rigid-body physics.

## What changed in the real game

1. `src/spatial_construction.mjs` is a narrow, finite-thickness sloped-plank primitive. An authored set of two XY endpoints, width, top elevations, thickness and identity produces a walkable height query, finite-volume triangles, a circular-footprint query, an explicitly approximate upright-cylinder contact check and triangle ray hits.
2. `src/world.mjs` now reconstructs the **same historical K2 ramp** through that primitive. The ramp's `surfaces`, `rampHeight`, `rampTriangles`, contact query, raycast and historical restore validation all consume its geometry. The original fixed deck, navigation, cutaway policy, grip and input stay in place. The **ramp drawing** now uses the exact same top/side face vertices as raycasting rather than a separate hard-coded ramp polygon.
3. `build.py` includes this module in the dependency-free standalone game HTML, with scoped binding names instead of introducing an external runtime or network dependency.
4. The standalone `index.html` is rebuilt. It is still the K2 playable experience and does **not** contain a new in-game construction tool.

### Unchanged behavior is deliberate — not proof of physical correctness

The migration initially changed contact results in **16 of 6500** randomly generated ramp-edge cases. Root cause: when the centre of a supported cylinder left the ramp's lateral footprint but part of the body remained overlapping, the new shape query classified the centre as off-ramp while the historical contact rule continued using the axis-projected height. The new code was brought back to the historical interpretation. The interaction could still be physically questionable; this campaign does not silently change its policy during representation refactoring.

The exported legacy helper `rampHeight(x)` originally clamped heights outside the ramp interval. The initial replacement returned `null` instead; an independent red regression test caught that interface break. The new primitive exposes distinct `plankAxisHeight` (clamped axis extension) and `plankHeight` (height only when the point is on the actual finite surface).

## Separate research-only multiple-construction contract

`src/spatial_scene.mjs` is a deliberately **incomplete, small** experiment for authoring interoperability, not the canonical format of the Feniks Studio or Jaskinia. It manages up to 24 independently placed sloped planks, with stable IDs, atomic rejection of invalid duplicates/imports, export/import, stacked surface candidates, volume contact candidates and ray hits sorted by depth. `scenePick(...,{index:1})` can deliberately select a second surface under the first from a specified world-space ray; it is **not** a screen-to-world pick implementation.

A test initially caught a silent data-loss bug in the scene importer: two planks with the same ID could cause the second to disappear without error because a failed `addPlank` result was ignored. Import now rejects the entire invalid scene before it becomes a saved one. This is exactly the sort of authorial continuity failure that would be unacceptable for Studio.

This research scene deliberately does not decide between orthogonal 2D authoring, semantic 2.5D and full 3D models. It neither knows how to preserve arbitrary external assets nor selects a physically valid surface for a specific body and movement.

## Verification performed in this campaign

- **Baseline before edits:** 72/72 game tests, 15/15 separate K3 tests.
- **After geometry extraction:** 85/85 tests (72 historical + 13 new), plus 15/15 in the unchanged K3 donor suite. `tests/spatial_construction.test.mjs` includes 840 metamorphic rotated/transposed ray/contact probes; `tests/spatial_scene.test.mjs` verifies two stacked candidate heights, a third differently oriented construction, identity, choice of depth and atomic import failure.
- **Old-vs-new simulation differential**, local tooling using frozen baseline `world.mjs`: 6500 randomized body/ramp collision configurations, 6500 ray queries, 4250 ticks across five deterministic seeds — **0 remaining divergences**. This proves only equivalence within those tests, not mathematical identity in every scenario.
- **Browser visual comparison:** old vs newly built K2, same `Przęsło` scenario, paused, same 1280×720 viewport: **0 changed pixels out of 921,600** in the final paired capture, same world-state SHA-256, no JavaScript errors. A repeated control comparison of the identical historical HTML against itself also sometimes produces 5,373 low-amplitude differences (up to 3 RGB levels) across the canvas because the view frame count/timing is not perfectly locked. Consequently, do not use one strict pixel equality sample as the release gate. It does not imply improved 2.5D occlusion; the *old image* still has the known problems.
- Browser gameplay and emulated mobile input passed in the targeted tests; final verification command and CI state should be recorded before promoting any branch.

### Renderer extension falsified a naive QA assumption

The additional ramp-renderer change initially failed at runtime because `bridge()` redeclared a local `top` constant; Node kernel tests remained green. That was corrected before update. Subsequent image captures initially showed 39,309 different pixels due in part to asynchronous camera easing. Once the camera was fixed, a comparison of *unchanged baseline against itself* exhibited the same 5,373 tiny RGB deltas as the changed build. The candidate had at least one exact matching paused frame. This is evidence of a **test-timing confounder**, not a claim of solved visibility. Source-to-geometry parity and interactive browser checks remain necessary.

## Known failures and high-priority falsifiers

1. The historical **deck**, with its occlusion and cutaway logic, remains special-cased in the **renderer, solids and editor**; only the ramp face vertices are derived from the new geometry. The new multi-construction scene is *not yet wired into Splot's live game*. Do not call Splot generally authorable in 2.5D.
2. Sloped-plank body conflict remains **conservative, cylindrical and kinematic**. It is not a convex rigid-body contact solver. Supported feet may hide overlaps close to the edge, and no torque/tipping is modeled.
3. `supportCandidates` offers options, not traversability or a definitive support choice. A body can be near several supports; stepping between them requires more rules than sorting by height.
4. The playable K2 renderer still has artistically and physically incomplete occlusion, cutaway, screen picking and material depiction. Even exact pixel parity is compatible with Owner FAIL.
5. Two bodies can still support each other in undesirable ways, while NPC route planning remains omniscient. The historical mobile/phone result still requires Owner verification.
6. Material visual styles and physical material semantics are not encoded in `spatial_scene.mjs`. They must be designed and tested with Studio separately, not assigned generic tags to satisfy a checklist.

## A serious next experiment, not automatic promotion

**Falsifier:** add an independently rotated/higher second platform-ramp to an actual *copy* of the current playable world, with collisions, support, free fall, raycasting, NPC planning, authoring, 2D-like display and input. Let the Owner change it without special code. Then build a third unprepared construction and verify the same capabilities. A failure of the picture, touch feel or editing counts as a failed candidate regardless of new kernel tests. Compare a real third-party 3D solver if it helps the same actions. Do not build a whole new game and call it a replacement.

**Cross-project boundary:** Feniks Studio owns meaning and revisions of authorial work; Splot owns execution consequences; Jaskinia is the launch, observation and experimentation context. `spatial_scene.mjs` is only an informative candidate donor. No other repository was modified by this campaign.

## Provenance and reproductions

Run `python3 build.py`, `node --test tests/*.test.mjs`, `node --test donors/k3-geometry/geometry.test.mjs`, plus `bash tests/verify.sh` when the local Chromium/Playwright environment is available. Differential and browser parity reports from this run were produced independently from the frozen previous K2 source and may be attached separately; a copy of the old production kernel is deliberately not added to the public repo just to satisfy this test.

**Release gate:** this branch can be reviewed as a *research code change* after full verification. It cannot be called a newly approved playable Splot merely because the geometry and snapshot are unchanged.
