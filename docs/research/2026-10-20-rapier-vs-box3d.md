# Splot — Rapier czy Box3D? Rzeczywisty koszt możliwości
**20.10.2026. R&D decision record, not a final engine choice.** K2 main remains playable; Splot Next PR #3 remains draft.

## Decision now
**Do not remove the working Rapier contact challenger. Do not rule out Box3D.**
The Owner confirms the old Splot Next implementation did not allow traversing the entry ramp while the Rapier build does; that is real Owner-positive evidence for traversability, not proof of complete movement/gameplay superiority.
Use Rapier as the current *working comparison*, and give Box3D a bounded, technically serious parity run. No third K3 lab and no wholesale replacement of renderer, art, editor or map.

## Actual sources, not rankings
- Source under scrutiny: Splot `src/next/rapier-live.mjs` and its 19 Oct recorded browser tests; physics loading remains research-pinned Rapier 0.21.0 from CDN.
- Box3D upstream: https://github.com/erincatto/box3d — native 3D C17 engine by Erin Catto, MIT; feature set includes CCD, hulls, triangle mesh, heightfield, character mover, contact/shape/ray queries, static/kinematic/dynamic bodies, hinge/prismatic/weld/motor/wheel joints, contacts, sleeping, multithreading, recording/replay. The engine is young but **not an empty DIY skeleton**.
- Existing **Box3D Character Controller** donor: `Jozzpoly/Box3d-Character-Controler/main`; exact `box3d.js@0.1.1` + Three.js. `src/character.js` implements `b3World_CollideMover → b3SolvePlanes → b3World_CastMover`, clipping, support/moving-platform transport, intent acceleration and mass-aware dynamic contact response; `src/constraint-velocity-character.js` and `src/donor/index.js` preserve A‴/Donor v1 behavior. Prior accepted baseline has reference 31 m/s² accel, 36 m/s² braking, 1/60 s and 4 substeps; it is not a drop-in Splot gameplay contract.
- Existing E17 Owner-positive evidence: expressing high-level intent to manipulate dynamic objects yielded lift/drag/throw/leverage/stacking play even with poor executor. E19 reciprocal semantic left/right grips were technically qualified but **not** Owner-accepted for gameplay. They are selectively reusable donors, not mandatory controls.
- JV Web source `Jozzpoly/JV-Box3D-Web-experiment/main` uses `box3d.js@0.0.2`, **different binding/API baseline** from Character Controller 0.1.1; this is a compatibility investigation, not an automatic shared runtime.
- Rapier controller documentation: https://rapier.rs/docs/user_guides/javascript/character_controller/ — higher-level KCC with slope sliding/step handling/snap and optional impulses to dynamic bodies. Own project-specific feel still necessary. Rapier has joints (including generic/multibody), contact and spatial queries. It is **not** automatically a reciprocal embodied-player solver.
- Upstream Box3D APIs https://github.com/erincatto/box3d/blob/main/include/box3d/box3d.h and sample https://github.com/erincatto/box3d/blob/main/samples/mover.cpp show mover contact planes + solve + cast; **toolkit, not fully configured drop-in character controller**.

## Executed Splot browser comparison (19→20 Oct)
1. **Rapier within the live game**: previous verified Splot Next ascent from x=12 to x≈22.38, feet Z≈2.42 with `footbridge-deck` support; fall, edit-overlap local-policy and limited grip probes previously passed in Opera. Owner now independently confirms the old code could not traverse ramp and new Rapier version could.
2. **Separate Rapier 0.21 physics-only spike**: dynamic crate landing/removed deck and capsule ramp-to-deck passed after explicitly fixing Z-up capsule orientation and resetting the destroyed deck between scenarios. It is not gameplay feel evidence.
3. **New Box3D 0.1.1 WebAssembly smoke in Opera**: module loaded, dynamic crate settled on deck (center 2.830), removal caused fall (center .430). The *minimal first-attempt custom capsule mover* stopped before ramp entry at x≈12.885. That does **not** establish native Box3D incapability; it lacks the previous Character Controller Donor behavior and Rapier's configured autostep.
4. A follow-up `?spawn=onramp` probe was committed but **not executed**: Opera lost connection. This is open, not a hidden success or failure. No physical mobile comparison or valid matched FPS benchmarking exists.

## Where development work actually diverges
| Question | Rapier | Box3D |
|---|---|---|
| Basic physics, collisions, CCD, motors/joints, casts | Pre-built | Pre-built |
| Standard step/slope locomotion | Configurable higher-level KCC, implemented in Splot | Mover toolkit; custom movement policy; extensive existing donor can be selectively reused |
| Embodied, reciprocal player↔object physics | Must design/adapt Splot interactions | Research evidence/implementations exist in Character Controller, but not plug-and-play |
| Desktop/browser packaging | Running Splot candidate; CDN is temporary | Tested in existing JS apps; wrapper version compatibility/wasm deployment must be qualified |
| Replay/repro | Needs intentional application-level deterministic contract | Upstream recording/replay is unusually useful; portability through exact JS binding not assumed |
| Complex structures that load, fail, detach | Not automatically solved | Not automatically solved |
| Crate/body insertion through other bodies | Current Splot Rapier adapter uses a local relocation workaround, not a complete authoring policy | Body contacts can separate overlaps, but deep initial penetration may resolve undesirably; neither engine is a complete permissive-editing transaction solver |

**Critical distinction:** neither engine will manufacture a good image/material language, camera, editor UX, authored part attachment semantics, world consequences, NPC knowledge or pleasure of manipulation. Separate causal world policy from engine-specific collision/solver implementation. Do not mechanically promote E19 or JV systems as canonical Splot behavior.

## Resource recommendation / no invented 5× ratio
- **Current Rapier** should stay available as the working live baseline. There is positive proof of slope/bridge access.
- **Box3D** is a serious candidate, not a downgrade. It may become more economical if Splot's central advantage is reciprocal material interaction and physically diverse constructions, particularly if the existing E17/Donor concepts can be adapted cheaply.
- Claim `Box3D is 5× more work` or `Rapier offers 5× the capabilities` is **not supported**. Comparing source line counts, one ramp result, or library marketing would be misleading.
- The closest real cost delta: port and stabilize locomotion on Splot's ramp; see whether moving platform, crate manipulation and dynamic contact can be assembled from Box3D + existing donor without a proliferation of special cases. Then measure integration size, fixes, and regressions at a version-pinned JS/WASM API.

## Next one bounded live comparison
**Same live Splot Next visual/gameplay scene, stable seed & exact same authoring actions; swappable physics only**. Do not create a new app or replace the renderer to compare solvers.

1. **Movement contract**: ground→ramp→deck→ground; walking, precision movement, moving support and stopping near ramp edges. Require both to produce comparable controllability and no sneaky teleport.
2. **Touching matter**: unassisted push, continuous drag, release, edge fall, heavy and light crate, moment/rotation when allowed; note whether dynamic contacts react and preserve meaningful authority.
3. **World edit during runtime**: add a solid near/through player, remove a supporting part under an object, detached dynamic part. Each operation must be visible, reversible, and causally accounted for; neither pure hard reject nor silent penetration by default.
4. **Engine adapter/lifecycle**: retained stable part IDs, revision-driven collider creation/removal, world proxy validation, deterministic reset/snapshot strategies, no dependency on old Splot mini-solver. Pin versions for each.
5. **Device reality**: bundle both locally, measure real build size/init/step cost and frame time on desktop and actual mobile. No fake '0 ms' inference and no per-platform special environment that hides cost.
6. **Owner veto**: comparable scenes + controls, surprising unplanned play. Distinguish technically correct contact from desirability, visual readability and rhythm.

**Stop rule:** after one focused equivalent live route + one unplanned manipulation session, if Box3D requires an expanding accumulation of ungrounded special-case gameplay patches and provides no offsetting leverage from donors, stay with Rapier. If it performs comparably with bounded adaptation and allows better reciprocal matter gameplay or simpler future research, keep both until Owner gameplay and cost evidence decide. Never choose purely for ecosystem unification.

## Safety and version boundaries
- Keep `main` and accepted K2 untouched; PR #3 remains draft.
- Box3D snapshot is pinned to wrapper 0.1.1 in the smoke. Upstream native `main` may have newer features not present in that binding; do not assume parity.
- Third-party wrappers (including box3d-wasm and forks) exist but are additional integration candidates, not identical packages; evaluate licensing, exact pinned engine SHA, feature coverage, API differences, offline reliability before substitution.
- Do not check Owner video or privately recorded frames into public GitHub.
