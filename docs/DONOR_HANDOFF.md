# Splot → Feniks Studio / Jaskinia: narrow donor handoff

**Status: candidate evidence, not an integration specification.** Date: 2026-10-18. Read this before copying Splot's code into another project. Jaskinia and Studio are independent projects with their own Owner direction; nobody should treat this file as an instruction to redesign those products.

## 1. Three different meanings that must stay distinct

1. **Authoring document:** what an author made and wants to edit, version and preserve: constructions, shapes, material references, variants. This is closest to Studio's responsibility. The current Splot `snapshot()` is **not** such a document; it captures a live simulation too.
2. **World execution:** occupied geometry, body positions/velocities, support/contact, events, AI, dynamic modifications. Splot currently owns these rules for its own game, with explicit approximations.
3. **View/session:** camera, cutaway, selection, debugging instruments, on-screen controls, host windows. A view must not silently change world physics. Jaskinia provides a possible host but does not own Splot's simulation.

A useful connection lets a Studio-authored **construction** be read by a separate world runtime, permits a controlled edit and observes the new consequences. Merely displaying a mesh or round-tripping a JSON structure is insufficient.

## 2. Candidate donor surfaces and how to inspect them

| Candidate | Exact code | Evidence | Do not assume |
|---|---|---|---|
| Live world kernel | `src/world.mjs`: `createWorld`, `walk`, `toggleGrip`, `placeObject`, `eraseObject`, `surfaces`, `solids`, `raycast`, `gravityStep`, `snapshot`, `restore` | `tests/kernel.test.mjs`, `drag.test.mjs`, `agency.test.mjs`, `continuity_edge.test.mjs`, `ramp_volume.test.mjs`, browser suites | A generic physics engine; robust torque, multi-body stack, arbitrary bridges, honest occlusion |
| Input/interactive renderer | `src/app.js`, `src/index.html` | `tests/mobile_owner_contract.py`, `browser_view.py`, `browser_gameplay.py` | A mature mobile interface, actual hardware Owner PASS, reliable multilayer picking |
| Authored construction prototype (separate) | `donors/k3-geometry/geometry.mjs`: `makeConstruction`, `addConstruction`, `allShapes`, `trianglesOf`, `surfaceCandidates`, `rayHits`, `conflicts` | `donors/k3-geometry/geometry.test.mjs` | Replacement world, sufficient collision, full voxel geometry, official Studio schema, rotation-capable rigid body solver |

**K3 was rejected as a playable successor.** It has only 2 prefabricated constructions, symbolic actors, no full K2 interaction/world, and a substantially different/isometric-looking visualization. What merits further test is only its **parameterized construction → generated shape/triangle/surface** approach. Do not ship its app as “the new Splot.”

## 3. Geometry and coordinate conventions

- Current Splot **XY ground, Z up**, metres nominally; body `z` is feet/lower end. Splot's visual 2.5D projection mixes ground Y and Z and can map different physical positions to one screen pixel.
- Jaskinia v6 (branch `v6-materialy`) uses **Y up** and Three.js; a possible pure coordinate map is `Splot (x,y,z) -> Three (x,z,y)` **with handedness/winding/normal verification**. Swapping axes is not enough: vertex winding, camera conventions, normals, collisions, support footprints and picking must agree.
- Existing `DECK`/`RAMP` in `src/world.mjs` are hardcoded at one map location. Authoring in the baseline supports walls/crates, **not** a second ramp/bridge. K3 authoring data does not directly match the baseline's world model.
- Studio's checkpoint document and shared Jaskinia material revisions have their own semantics. Do **not** equate a Splot `kind:'crate'` with a particular asset version, or serialize Jaskinia's live `THREE.Object3D` into Splot snapshots.

## 4. Recommended *smallest* cross-project probe (not committed as an integration)

1. Make one place in the chosen Studio authoring path: platform and connected ramp at a height, with a different second arrangement (translated or rotated). Export *authoring intent only*, including IDs and geometry parameters, without a live actor snapshot.
2. Import into an isolated Splot prototype, deriving **occupied volume, supporting surfaces, rays and editor picking** from the same authored construction. Test in both layouts, plus with a third newly authored layout.
3. In the game, walk onto the ramp, pass under its raised part if physically tall enough, block when not, push a crate off its edge, fall, inspect the landing point and edit the place again. Rendering and interaction must be legible on both desktop and real phone.
4. Round-trip the edited authoring document and preserve original IDs/material provenance. Observe that save/import succeeds without changing Splot simulation state merely by moving a camera or changing cutaway mode.
5. **Negative tests:** two height layers at one XY; ray vs support mismatch; ramp side entry; floating body or ghost support after delete; cliff-overhang contact; lost grip on unrelated structure deletion; history/asset version changes; camera picking top vs lower surface; right/left handed triangle winding; material revision drift.

**Acceptance:** no per-scene exceptions in physics or renderer; same action possible through actual controls, not scripted replay only; authored result survives change of scene and a clean-profile import; no regression of the playable baseline. If this cannot be shown, stop rather than generalize an invented universal 2.5D format.

## 5. What would be actively harmful to import

- K3's stripped-down app, placeholder graphics, minimal scene or its status as a supposed replacement core.
- K2/Forge's global assumptions around one named bridge and support labels (`bridge`, `ramp`, `solid:*`, `body:*`) as permanent product standards.
- Copying the boar's all-knowing nav and calling it perception-driven autonomy.
- Treating camera selection-based alpha or local cutaway as a physical depth renderer.
- Forcing 2D-native Studio work into global 3D world coordinates merely because one lab uses XYZ.
- Implementing a heavy universal shared-editor protocol before two independent authoring examples demand it.

## 6. Provenance / cooperation

- Splot repo: https://github.com/Jozzpoly/Splot
- Feniks Studio checkpoint (Astra): https://github.com/Jozzpoly/Feniks-Studio/pull/1
- Jaskinia v6/v6.1 (Opus, at date of this handoff): https://github.com/Jozzpoly/Jozz-Cave-Workbench/pull/4
- Owner-authored compass of Jaskinia: https://github.com/Jozzpoly/Jozz-Cave-Workbench/issues/5

**Owner judgement outranks our simulation tests.** Cross-project reuse is an offer of evidence and tools, not a unilateral claim of shared architecture.
