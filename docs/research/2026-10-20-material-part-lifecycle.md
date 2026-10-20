# Splot Next — authored construction becomes live material
**2026-10-20 | Child research branch of Box3D parity PR #4 | Owner-unapproved, do not merge**

## Why this, after the first real Owner recording?
Owner's 71.3 s Box3D playtest and opt-in trace showed meaningful crate grip (10.38 s), uphill traversal with the load, leaving the deck, dropping and reengaging matter. But the count of authored scene parts remained 7 throughout. Thus the most material untested system is **construct → change physical status → observe physical consequence → continue to play**. We should not consume the next campaign polishing a boar-specific contact impulse.

## New capability, deliberately limited
- Existing `src/next/spatial-core.mjs` finite solid `box` retains its stable ID and canonical `min,max` geometry.
- `src/next/part-lifecycle.mjs`: `setBoxMotion(world,id,'dynamic'|'anchored')` uses existing validated `replaceElement` authorship; `translateBoxToCenter` updates an existing live box's pose from a solver position without forging an authoring revision.
- Box3D adapter: **anchored** box represented by fixed body; **dynamic** box represented by Box3D dynamic rigid body with material-dependent positive density and real contacts. On entering/exiting dynamic mode the adapter atomically destroys/recreates the corresponding physics body. Dynamic bodies are tracked by *element object identity*, because physics pose updates must not silently recreate a collider every frame.
- Scene geometry is translated after each Box3D step using `b3Body_GetPosition`. The same scene element drives rendering, picking and support queries; `scene.revision` denotes authoring and `scene.motionRevision` is a separate volatile motion counter.
- New **Kotwica** tool (keyboard `6`): select an existing `box` in the *same real Splot scene* to release its anchor, or select its current position to anchor again. Disabled outside the Box3D research backend. Editing, movement, camera, animal, gripped crate and boar behavior are otherwise unchanged.
- Explicit events `part-dynamic`, `part-anchored`, UI `part-motion-change`. The **opt-in local-only** test journal includes `dynamicParts` count, not a remote user tracker.

### Constraints and hard truth
This is a **translation-only physics experiment**. The Box3D body is dynamic and interacts with gravity/contacts, but rotation is locked because the present world `box` is an AABB and the scene cannot faithfully encode arbitrary rigid-body orientation. It does **NOT** simulate torques, flex, bending, multi-part joints, load-bearing structural breakage or beam tumbling. In particular, the legacy `panel` remains static; `setBoxMotion` declines panel activation with a visible `box-only-research-boundary`, rather than faking panel physics.

A broad push to physical connected structures should wait for a principled **shape + canonical rigid transform + motion/lifecycle + body contacts + explicit attachment/support constraints** data model. Native Box3D and render/collider meshes may remain distinct approximations but must have a documented source of truth and validation.

The authoring schema is still insufficient for world-bounded saves after arbitrarily large off-world dynamic motion; neither kinetic state/velocity nor solver state is serialized for continuous replay. Tests must cover long falls and moving support before any claim of robust scene save, co-op, Medium synchronization or persistent Jaskinia assets.

## Tests: evidence classes kept separate

**Actually executed in this campaign:**
- Pure scene/mode tests with the exact fetched source in V8: **8/8 PASS** for validated transitions, stable ID, anchoring at settled coordinates, preserving authorship revision while moving, and refusing unsupported panels.
- Adapter contract with a **mocked Box3D API**, deterministic stub gravity (not real Box3D): **7/7 PASS** for fixed↔dynamic collider replacement, simulation-updated world geometry, support-query consistency, reanchoring and removal, with otherwise unchanged humanoid/boar registration.
- Standalone playable `src/next/Splot_Next_GRAJ.html` regenerated as a 16-module research bundle and V8 syntax validated; selectors matched. The deterministic `?physics=box3d&probe=material` runs the same in-game fixture and reports PASS/FAIL **once executed in a real browser**.
- `tests/research/material-part-lifecycle.test.mjs` committed for subsequent normal Node runner execution. It is NOT recorded as having run under Node.

**Not executed / still RED gate:**
- Real Box3D WebAssembly dynamic-part physics in a browser. Attempting an isolated cloud browser was blocked before start by the connected browser provider's exhausted wallet; its results are not available. No Opera navigation was performed because new tabs can interrupt Owner's current test.
- Device performance, continuous contacts, another dynamic crate hitting the released construction, standing on / riding moving dynamic support, collision reaction near occupied volume, very long off-ground falls and real Owner feel.
- The on-screen tool is research UI, not Owner-approved ergonomics or visual language. No main/PR#3/PR#4 code changes: branch is isolated.

## Most revealing next Owner-style scenario
Create two separate anchored boxes at different elevations using the existing builder, **release the upper box**, let it land on the lower one, then **anchor it in place or remove the support** and observe the consequences while carrying a crate. This is a real-world material interaction where the prior K2's fixed-painter treatment was not enough. If it fails, determine precisely whether the culprit is the backend, incorrect contact proxy, support authority, wrong visual/physical transform or gameplay feel, not another exception for this scene.

Do not promote only because falling works. The meaningful longer-term threshold is **a constructible, inspectable world where the same objects can be authored, attached, released, acted upon and observed without conflicting truths**. 
