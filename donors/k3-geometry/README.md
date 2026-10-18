# K3 geometry donor — research-only

`geometry.mjs` is a separately extracted *candidate for parameterized geometry*, not Splot's runtime or a general-purpose physics solver.

- `makeConstruction` creates a deck/ramp/posts from local parameters (including yaw, dimensions, height).
- `trianglesOf` and `allTriangles` provide collision/ray geometry from the construction representation.
- `surfaceCandidates` provides feet-support heights; `rayHits` returns ray-triangle intersections.
- The finite tests check two instances, a third authored instance and other invariants; they do not establish continuous rigid-body physics, robust support contact, complete arbitrary-angle collisions, rendering/selection correctness or editor integration.
- K3 the *playable replacement* was rejected by the Owner because it lost crate grip, world size, boar, richer visuals and interactivity. **Never ship the K3 app as a Splot update.**

Run `node --test donors/k3-geometry/geometry.test.mjs`. See `docs/DONOR_HANDOFF.md` and `docs/CONTRACT_MATRIX.md` before any integration.
