# Next serious Splot campaign — execution gate, not a promised roadmap

**Status:** proposed from current evidence; do not mistake this file for Owner approval of a solver, rendering style, or new project schema.

## First gate: preserve the actual game

- Run the playable baseline for several minutes with manual keyboard/pointer and emulated phone touch; use real Owner phone feedback when available.
- Prove gripping, dragging, pushing over a ledge, falling, landing, authored wall/crate changes, boar detours and JSON round-trip without losing camera or tools. Reject any proposed replacement that removes these silently.
- Record failures as observable player actions, not only internal state errors. Keep 2D-like readability, responsiveness and authored visual expression in scope.

## Research question A — one construction, multiple truths

From authoring data build support, occupied volume, ray hits, nav constraints, selection candidates and renderer geometry. Use *two rotated/elevated ramps plus a third new variation* so hard-coded arena fixes fail. Compare Splot current thin-ramp slab, K3 geometry donor, and a real third-party rigid body solver **only when actually integrated**. Every solution must permit varied shapes and player intervention.

## Research question B — legible levels

Set up two actors occupying similar screen positions at different heights and two surfaces stacked in projection. Explicitly distinguish physical occlusion and player-selected cutaway. Evaluate layers, shadow/cast, camera and picking by visible evidence, not screenshots of a single lucky frame. A cutaway must not change live world state.

## Research question C — expressive matter and body

Introduce two deliberately authored materially distinct props, not random wood noise. Evaluate carrying/contact feedback, silhouettes, grounded sounds/marks, scale, materials, and whether the player can invent an unplanned interaction. Do not build a global chemistry system or generic visual effect engine first.

## Studio/Jaskinia boundary

Transfer one parametrically authored construction from Studio into a Splot *experimental adapter*, and check two alternative authorings survive save/import and gameplay. Studio owns authorial document decisions. Splot owns execution consequences. Jaskinia hosts experiments and observations. No global 2D/2.5D/3D document schema without evidence from several different works.

## Release discipline

1. Baseline remains available throughout tests, not only in old archives.
2. Experimental source remains in `donors/` or separate branch until tested in the *real playable experience*.
3. Only claim a new playable version after before/after browser actions, mobile gesture evidence, game feel and Owner feedback; automated tests alone are insufficient.
4. New owners of a PR must clearly document downgraded or removed capabilities.
5. Do not upload raw Owner recordings or save data to public GitHub.
