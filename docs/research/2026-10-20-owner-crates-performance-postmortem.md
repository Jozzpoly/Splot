# Splot — Owner overload session: z-fighting and multiplicative support-query cost
**2026-10-20 afternoon · confirmed source defect and controlled real Chrome/Box3D measurements**  
**Status:** Draft PR #5 research branch, **not merged**, not Owner-approved visual experience.

## Real Owner evidence (private media is NOT in the public repo)
- Owner recorded `20261020-1440-13.3722660.mp4`, 148.83 s, 1868×910, 30 fps, showing progressively dense crate layouts, exploration and steep camera angles. The visible scene is crude; surfaces flicker and the single global color/shape language hides material distinctions.
- `Splot_Sesja_Badawcza (3).json`: opt-in **in-progress snapshot**, 162.5 s, 1194 retained events, 313 sampled observations. 302 `build-crate` requests (299 success / 3 denied), 24 `build-box` successes in approximately seconds 82.5–87.2, followed by 24 `delete-part` successes in approximately 91.5–96.7. The sampled scene-part count goes **19 → 43 → 19**; two other authored boxes remain dynamic the whole time. Recorder timestamps are relative to its own start and should not be assumed exactly aligned to video timestamp.
- `Splot_Nowy_Rozdzial.json`: final saved world contains **341 physical crate bodies**, 19 authored elements (15 boxes + 4 panels), of which 2 are dynamic. No direct sampled FPS or measured Box3D timings were included in the original Owner trace. User reports severe temporary lag while piling authored blocks and much better play afterward despite hundreds of crates. This phenomenology is valuable, but alone does not isolate its cause.

## Confirmed cause 1: visual crate mesh has deterministic coplanar faces
Old `actorsMesh()` used a full-height box with `top Z = z+h` and a second lid box spanning `[z+h-.07,z+h]`, with **its own top at the identical Z**. WebGL depth `LESS` cannot reliably choose between equal-depth external triangles; flicker/z-fighting is built into every crate. This is NOT a Box3D solver issue.

**Fix:** `src/next/crate-visual.mjs` generates a shorter body without the sealed top and a lid without its sealed bottom, exposing exactly **one top quad**. 20 rather than 24 triangles per crate. No physics changes or artificial polygon depth bias. `tests/research/crate-visual.test.mjs` checks the contract including 350 crates. The fix does **not** solve overlapping geometry of *different* physical objects, coincident structural contact faces or other flicker sources.

## Confirmed cause 2: a quadratic-ish world-query feedback loop, NOT Box3D's static-body cost alone
Before the fix: every `Box3DBridge.advance()` calls `worldSupport()` for EVERY body. `worldSupport` calls `supportCandidates`, which used `castRay` on a **fresh complete `sceneTriangles(world)`**. A fresh whole-world triangle mesh was repeatedly allocated and ray-intersected for each of hundreds of crate bodies, on every physics tick. An increase in authored elements therefore multiplied scene-triangle work by crate count and often by 2–4 physics catch-up steps per video frame.

**Fix:** `supportCandidates` now analytically intersects the *same canonical* authored AABB and planar panel definitions with a vertical ray, without creating whole-scene triangles for each body. General-angle `castRay`/picking still use the original triangle path. Return IDs, height ordering, surface normals and world location follow the same geometric contract. Dedicated regression parity checks compare thousands of random points, sloped/stacked panels, bounds and modified poses to the original triangle-ray source. This approach is not a universal scene index/LOD system: generalized ray queries and the renderer still need future profiling and structural work.

## A/B — actual Chrome + actual Box3D WASM, same synthetic fixtures on GitHub runner
Timers were measured separately for simulation, geometry preparation and GL CPU submission. Each scenario's rolling sample window is cleared after warmup. **These are per-rendered-frame CPU times (with variable 0–4 physics steps), not per-fixed-step costs, GPU timings, or Owner hardware FPS.**

| Synthetic workload | Before: simulation median | After: simulation median | Before → after rAF interval median |
| --- | ---: | ---: | ---: |
| Baseline (1 crate, 7 authored parts) | 0.4 ms | 0.3 ms | 16.7 → 16.7 ms |
| +300 physical crates | 16.1 ms | 0.9 ms | 50.0 → 33.3 ms |
| 300 crates + 24 anchored stacked authored boxes | **78.9 ms** | **0.7 ms** | **116.7 → 33.3 ms** |
| Same pile, 24 boxes released as dynamic | 79.8 ms | 1.0 ms | 116.7 → 33.3 ms |
| 24 extra boxes removed again | 19.6 ms | 0.6 ms | 50.0 → 33.3 ms |

The *static pile* case improved by approximately **113× in the reported simulation-CPU median**, not 113× wall-clock FPS. Rendering ~6694 triangles for ~301 crates takes an additional ~1.2–1.8 ms each for geometry and CPU GL submission. Headless runner rAF is strongly quantized and may have SwiftShader/VSync-dependent overhead, so do not generalize absolute frame rates to real hardware.

**Evidence runs:**
- Before, isolated-window comparison: https://github.com/Jozzpoly/Splot/actions/runs/39445027918
- After, same fixture: https://github.com/Jozzpoly/Splot/actions/runs/39445817063 — **43 test PASS, 0 fail, 2 TODO**, 4 real Box3D browser physics probes PASS, desktop build/release/reanchor/export PASS, emulated mobile touch PASS.
- On-demand synthetic performance scenario source: `tests/browser-next-perf.mjs`; CI runs it on `workflow_dispatch` only rather than on every push. Routine builds still run source parity and actual browser behavior without a long stress test.

## Strategic revision
This session demonstrates why **adding a new LOD architecture, changing physics engines or blaming a heavy 300-body solver would have been premature**. The catastrophic multiplier was in our own repeated general-purpose world query on a narrow support question. We should continue to optimize by profiling shared execution paths and preserving causal tests, not by hiding an arbitrary object cap or hard-coding a special case for one stack.

Remaining facts:
- Owner has not yet tested this optimized version on their own computer or phone. A/B does not prove a good feel, nor does the simple crate mesh meet visual art direction.
- `Box3D` supports many crates in this workload, but no evidence here for 1k/10k reliable active bodies across real world conditions.
- Static mesh rendering still regenerates triangles each frame; scene material lookup is linear per triangle; WebGL payload is fully rebuilt every frame. These deserve *measured* follow-up, not assumptions.
- Many identical crates can genuinely overlap other crates or constructed boxes; visible flicker and contact jitter from these cases remain possible even after per-crate self-overlap is fixed.
- The global authored scene cap remains 256; neither this fix nor the Box3D lifecycle makes Splot a production large-world engine.
- The local session journal can include old ring-buffer world events at the recorder's first instant (its initial `sec:0` events predate recorder start). Treat the beginning as a snapshot, not a replay history. `startedAt/endedAt` represent recording window only.

**Next decision:** ask the Owner to test the updated URL organically, ideally with dozens of added authored blocks while hundreds of crates remain. Focus on whether the lag truly disappears and whether visual flicker reduces. If it doesn't, capture profile with the same stage labels to isolate the residual culprit. After that, focus on Splot's severely underdeveloped readability, art/feel and world-authoring ergonomics, without another speculative physics rewrite.

## Additional low-friction observation improvement
The earlier on-screen `ms CPU` readout only timed renderer CPU submission, misleading anyone during physics-heavy lag. The default HUD no longer claims that value measures total CPU. Adding `&perf=1` enables stage-labeled debug medians (simulation, geometry preparation, GL submission CPU and rAF interval). When an Owner explicitly starts local opt-in playtest recording, compact stage medians are also included every ~500 ms in the JSON sample; no data is sent anywhere automatically. **These metrics still do not include GPU timer queries.**

After this change, [CI run 39447031796](https://github.com/Jozzpoly/Splot/actions/runs/39447031796) passed **44 Node tests, 0 failures, 2 TODO**, all real Box3D Chrome physics probes, desktop editor/export and emulated mobile touch. This is a workflow-integrity result, **not** evidence the Owner's original visual flicker has fully disappeared at 341 crates.

The next Owner test should specifically record the default visual experience and a second `?perf=1` session under a comparable crate/box workload if lag remains. The original private video/JSON remain local to the conversation, not published as CI fixtures.
