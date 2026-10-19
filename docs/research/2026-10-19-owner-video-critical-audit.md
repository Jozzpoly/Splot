# Splot Next — Owner video audit and architecture reset (19 Oct 2026)

> Research evidence only. Private 77.13 s Owner video (1864×908, 30 FPS). Do **not** upload footage, frames, or device metadata to public repo. This text is a non-sensitive analytical derivative. No Owner acceptance claimed.

## Evidence classification

### Seen directly in the private recording
- 0–17 s: camera movement/inspection of the built-in platform/ramp and surrounding terrain. Heights, support and spatial context remain hard to read without diagnostic UI.
- ~18–55 s: independent additions of panels, boxes and crates, producing approximately 17 scene elements from 7. The user tries constructions outside the original assembly. A block/stack-like cluster forms, with visually ambiguous connections and little visible response to structural changes. Around 43 s, a paused state is visible. These are observations, not proof of the user's enjoyment or intentions.
- ~56–77 s: use of height choice, camera rotation and reset. Camera rotation exposes actual volumetric depth, but scene composition becomes disorienting and large areas of the frame appear empty. A reset recreates the original 7 elements; the camera angle is not necessarily reset.
- Audio is essentially silent. No spoken feedback can be inferred.

### Verified against PR #3 code and executed locally
- Baseline Node tests rerun: **18/18 PASS**, but they do not cover dynamic-geometry consistency or subjective play quality.
- Inserting a box intersecting the player's current cylindrical body returns `{ok:true}`, while `clearanceAt` immediately reports `free:false`. After 120 frames with no player input, the player is **still inside the box**; no penetration repair/rejection occurs.
- An unattached panel whose endpoints are 5 metres above ground is accepted and remains static after 240 simulation steps. This may be valid if deliberately *anchored*; the current authoring UI makes no explicit `anchored/dynamic/jointed` distinction.
- Parts carry `material` but the live physics doesn't use it for friction, weight, resistance or breakage. Human, boar and crates have `mass`, but neither `walkOne`, pushing nor dragging uses these masses.
- `spatial-core.mjs`: single element definitions → triangle mesh/rays; meanwhile `clearanceAt` uses approximated cylinder-vs-panel bounding calculations, not those same triangles as an exact contact solver.
- `spatial-sim.mjs`: direct discrete kinematic moves; no CCD, impulses, torque, static support graph or structural forces. `stepLive` will continue normally through previously approved overlapping static geometry.
- `app.mjs`: `insertElement` of authored panels/boxes bypasses occupancy/attachment/lifecycle checks; `replaceElement` exists in core but independent transform editing via draggable handles is not implemented in UI.
- `render.mjs`: `renderer.lastCost` measures CPU-side command submission, NOT actual GPU execution, frame time or thermal mobile performance; the on-screen `0 ms` is NOT a performance benchmark.
- The screenshot/video render is `webgl-depth`, so GPU depth initialization on this desktop is supported. This says nothing about owner-phone performance or final art quality.

### Interpretation with confidence
- Strong: The new branch has a better geometry/picking/depth research substrate than K2, but is not yet a reliable **material world**. The three-way split editor/contacts/render remains a major source of contradictory states.
- Strong: Current visual language is diagnostic/abstract. Correct depth alone does not make support, height, contact, load and affordances legible.
- Moderate: Quick experimentation with multiple independent pieces is promising, but its value is limited by absent consequences and weak manipulation affordances.
- Unknown: Whether the user's experience was fun, what they intended with each construction, sustained mobile FPS, audio/animation feel, structural solver fidelity, and actual gameplay quality after adding a mature library.

## Correction to our own earlier planning
Do not claim that every visual and physical representation must literally use the same triangle soup. This is overly restrictive. Instead, author **one typed semantic source of spatial truth** (stable entity identity, world transforms, shape parameters, motion type, materials, contacts and attachment intent). Multiple calibrated representations are allowed (render meshes, collider proxies, rays, nav surfaces, LOD), provided their tolerances and divergences are explicit and tested.

Do not further grow our custom mini-physics or mini-GPU as if they were the intended final engines. Preserve them as evidence and as an A/B comparator. The problem to solve is consistent *actions and consequences* in an engaging world, not just numerical invariants of surfaces.

## New proposed contract and bounded evaluation

### S0 — stable material fact and lifecycle
- Entities with typed roles: terrain; rigid-body; static anchored structure; dynamic construction; support/contact constraint; actor; carriable object.
- Each authored part has stable ID, parametric shape and transform, declared material properties **where mechanically implemented**, and explicit `anchored/kinematic/dynamic` intention. Arbitrary constructions remain allowed; warnings don't automatically forbid play.
- Creating, moving or deleting a piece is a **world transaction**. Edits must reject true corruption, or deterministically resolve an overlap (displace, wake, contact or mark invalid). Never silently accept a penetration then let the sim pretend all is well.
- Structural relationships form observable attachments/constraints or dependencies when intended. Do not claim load-bearing collapse until tested; exploit meaningful breakage or removal when it earns its complexity.

### S1 — choose a reliable substrate empirically
A/B the SAME portable scene and action script:
- Current bespoke Next (control/baseline, not default commitment).
- Three.js renderer + Rapier 3D (first serious technical challenger for a browser-first sandbox).
- Babylon.js + Havok V2 as a second candidate if it yields meaningfully better integration or motion in the same scene.

Compare geometry editing, multi-level support, contact/pushing, crate edge drop, simple joints, actor controller, ray picking, camera and a narrow real-phone perf budget. No architecture winner based on a screenshot or documentation. Keep the domain scene schema renderer-independent. Rapier's built-in kinematic character controller is a starting candidate; its docs explicitly warn it is not ideal for all game-specific feel and that dynamic pushing requires appropriate impulse handling.

### S2 — a minimum *gameplay* vertical slice, not a geometry showroom
One encounter: player, boar, movable crate, platform and ramp, independently editable beams/columns, real alternate access and observable consequences after moving/deleting a critical piece. Player can move, grab, place and experiment in a coherent spatial scene. Side by side: auto play, free building, camera pan/orbit, fall/push and actor mobility.

### S3 — develop visual character alongside motion
Test two or three authored visual languages (including voxel/pixel alternatives) on the same physical scene: material differentiation, ground shadows, edge cues, cutaway/visibility, scale, silhouette, impact response and acoustic/haptic potential. Art direction remains Owner-led; visual fidelity is not merely a later polish stage.

### S4 — mobile/desktop ergonomic and technical gates
Physical phone: portrait and landscape, two-finger combinations, menus never swallow movement, camera bounds, device FPS p50/p95, GPU cost, memory. Desktop: no extraordinary black margins or unintelligible camera framing. Capture short real action sequences + state traces. K2 comparison must retain player affordances.

## Reject/advance rule
No promotion to `main` until **an inexperienced observer can infer** who/what is supported, reachable, moveable and affected without reading debug HUD; collisions and edits agree; one 10+ min playful session supports Owner enjoyment; a real phone is viable. The 18 green unit tests are regression checks, not permission to merge.

## Agency and provenance
Splot remains autonomous, not a slave to Feniks/Jaskinia/Medium. Feniks provides counterexamples of desired spatial/physical consistency; Jaskinia provides easy immediate access; Studio/Medium may later consume bounded evidence or donors, but none sets Splot's runtime rules. K2 is playable control, PR#2 is rejected/candidate research, PR#3 is current unapproved spatial prototype. Do not publish the private video itself.