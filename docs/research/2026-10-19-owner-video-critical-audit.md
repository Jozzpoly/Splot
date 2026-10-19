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

## Continuation — 19 Oct: executable causal gate and corrected architecture choice

A second independent audit recovered the K2→K3→PR#2→Next history and the 77-second Owner test. The crucial project goal is **construct → manipulate → run → observe causal consequences → rebuild**, not a geometry API or generalized Feniks engine. The old K2 remains a playable control; the PR#3 prototype is not accepted.

### New live evidence
`node --test tests/research/causal-pressure.test.mjs` — **9 cases: 6 PASS, 3 FAIL** on the locally recovered PR#3 code, deliberately outside the default suite. Executable source is committed to this PR.

- **RED: fundamental ramp.** Starting grounded at (12,13,0), holding positive X for 180 steps leaves the human at x≈12.615, z=0. The reason is concrete: at the next step x≈12.683 a finite-radius collision already hits `footbridge-ramp` while `supportCandidates` still returns only ground. This is contradictory locomotion/contact, not a camera or artwork defect.
- **RED: authoring transaction.** A part placed through the player's physical volume is accepted; after 120 steps the model still reports penetration and records no resolution. The permissive editor may allow absurd constructs, but a live world must *acknowledge and respond*; silent permanent invalid state is not permissiveness.
- **RED: material lifecycle.** A panel freely authored at z=5 carries no anchored/kinematic/dynamic intent and stays static. A deliberate anchored floating slab could be acceptable; an *implicit* one cannot be called a working construction dynamics system.
- **GREEN controls (scoped):** support removal/fall/ground landing, crate traverses edge/falls, independent part insert/remove updates support candidates, camera orbit does not mutate geometry, a limited cross-height body case, structural scene ID serialization. None proves broad game feel or correct continuous contacts.

These results must accompany rather than overwrite the historical 18/18 Node PASS. The earlier baseline suite was too narrow to reveal the core ramp failure. The RED suite is a research instrument, not automatically an enforced release gate until the architecture resolves the cases.

### Professional correction: do not swap solver and renderer simultaneously

Previous plan `current Next` vs `Three.js + Rapier` vs `Babylon.js + Havok` as three complete parallel games is **not** the preferred first experiment. Such a comparison mixes physics, camera, content, interaction and integration cost, obscuring causality and risking another K3.

**First challenger:** Rapier 3D as a replaceable contact/dynamics component, tested against these *same observable action→consequence contracts* using current visual presentation initially. Ramps, moving crates, support removal, collision authoring and bounded cost are priority. A new renderer (Three.js or other) is a separate decision, not mandatory just because Rapier is selected. Babylon/Havok remains a contingent second candidate, not a concurrent rewrite.

Do not invent a final universal world schema here. Preserve only authoritatively named objects and revisions, declared physical lifecycle, and transactions whose consequences reconcile geometry, collision state, actor behavior and visual appearance. Distinct calibrated render meshes/collider proxies are legitimate; the literal same triangle mesh is not required.

### Next acceptance experience, not just tests

One *live, continuously playable* scene: human + movable crate + animal + ramp + platform + at least two independently editable structural parts. Without changing scenes or selecting debug avatars, player climbs, moves the crate, changes a part, sees reachable routes/support/contact change, and immediately resumes play. Observe physical correctness, composition/legibility, feel, touch, and mobile behavior separately. Material/art language is co-developed with mechanics; invisible physics correctness alone is not success.

**Architecture and governance:** K2 main unmodified; PR#2 evidence only; PR#3 remains draft; no raw Owner footage/frames in repository. For Jaskinia/Medium, expose labeled, version-pinned playable candidates and evidence, not a universal Studio data model or an unapproved default game.
