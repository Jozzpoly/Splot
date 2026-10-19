# Splot — nowy rozdział: projektujemy świat, nie naprawiamy obrazka
**19 października 2026 • Working direction, not a frozen GDD or released engine**

## Why reset
Owner repeatedly rejected the superficial impact of K2→PR#2. The current game has a real but very small causal world and enjoyable affordances; tests of a narrow spatial kernel cannot stand in for legible spatial experience. Canvas sorting, editor layer cycling, a two-part prefab, shallow collision, and omniscient boar are *not* binding architectural commitments. PR #2 is evidence, not code to blindly merge. K3 remains a negative product test: do not delete life, agency or manipulation merely to demonstrate a clever geometry API.

## Hypothesis, not dogma
Build a **constrained 3D spatial substrate under a 2D-like game**. World coordinates are canonical XYZ; Z is physically real. Locomotion mainly occurs on support surfaces and transitions, and a camera maps this 3D reality into a compact, legible game image. Evaluate this against semantic 2.5D with actual runtime and Owner feedback, not theoretical preference. Camera, raster backend and visual style are replaceable. World identity, parts and support facts are not owned by the renderer.

## Four coupled responsibilities
1. **World facts:** stable independently editable IDs; finite volume and material; support/contact/ray/faces from a shared authored source; revision and valid serialization. No blanket physics claims for an approximation.
2. **Causal motion:** body footprint, locomotion, clearance, gravity, crates/grip and animals obey the same world. Simple local behavior beats false omniscience; navigation can be richer later.
3. **Representation and control:** one camera projection/ray inverse; multiple real hits from a single screen pixel; actual occlusion (depth), deliberate separate cutaway; direct mobile and desktop input. Presentation can selectively reveal hidden things but must not silently rewrite physical visibility.
4. **Play and authorship:** moving, pushing, grasping, rebuilding and observing unexpected results must remain possible in every playable candidate. Art, material cues, feedback and camera composition matter alongside algorithms.

## Invariants to falsify
- Two actors may share XY at different Z without false body contact.
- A panel is itself a finite object with two sides and a top; a body can be beneath it when clearance allows and above it when physically supported.
- A ray for a visible pixel comes from the **same camera** that renders the mesh; switching controlled actor cannot change the target of a click.
- Removing a support changes the subsequent physical state; it does not merely alter a texture or hide a model.
- Every authored piece can be independently replaced or removed. No permanent prefab-pair assumption.
- A successful test does not certify responsive controls, believable material or player desire to continue.
- No silent migration promise. R&D saves may reset between radical versions.

## First executable vertical slice
This branch begins a physically shared `spatial-core.mjs`, simple `spatial-sim.mjs` and two depth-aware render adapters (WebGL2, software depth fallback). The first playable `Splot_Next_GRAJ.html` contains a person, pig/boar, crate, food, ramp, upper platform, independent supports, box obstacles and editable panels. Its old-school visible shapes and locomotion are **known preliminary**, not an Owner-accepted game or definitive tech stack. Real rigid-body rotation/torque, structural forces, grounded AI knowledge, proper edge climbing and camera occlusion assistance remain open. The fallback renderer is not a mobile performance solution.

## Stop / advance gates
1. Ground-to-ramp-to-deck-and-back route with finite bodies and no collision lie.
2. Two actor heights, cross-layer camera ray selection, underside clearance, delete support while actor stands on it; camera orbit does not mutate physics.
3. Drag/push a crate and observe a fall: the game must give a visually and physically consistent event and *feel good*.
4. 320px phone, portrait, landscape, overlapping touch input, frame-time budget. No UI eating the play area.
5. Sufficient visual/material character, feedback and legibility to be intrinsically interesting to play. If not, **no promotion**, regardless of Node/Chromium PASS.

## Evidence boundaries
Local tests establish geometry and small-scale movement invariants. Chromium emulates three screen sizes; real-device experience has **not** been validated. WebGL2 is not available in the local headless Chromium and fell back to software depth. This validates the fallback rendering path only. Keep K2 unchanged on `main`; do not merge research PR #2 into the new chapter. Preserve PR #2 as a searchable record of attempts and Owner FAIL.

## Architecture debt called out now
- Current collisions use conservative cylinder-vs-panel bounds and tolerance near a supporting panel, not swept hull CCD; false refusals and penetration are possible.
- Crate grip is limited kinematic dragging, no torque/true load response. Actor art is a stylized cuboid proxy rather than shape-matched collision.
- No body-to-body elevation support or joint/load failure yet. Independent authoring and no automatically created supports are deliberate, but not a finished construction model.
- Scene geometry is regenerated each frame; spatial indexing and mesh caching must be added before large worlds.
- Software raster depth fallback is CPU-heavy and is not a replacement for robust GPU/device testing.
- The aesthetic is an intentionally provisional proof surface. The real next challenge is finding a material and motion language worthy of Feniks-adjacent ambitions while keeping Splot autonomous.
