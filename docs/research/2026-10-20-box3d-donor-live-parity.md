# Splot — Box3D Donor v1 inside the live XYZ world
Date: **20 Oct 2026** | Status: **bounded research challenger, NOT accepted gameplay or a final physics choice**

## Why this matters

The Owner has confirmed that the old Splot Next solver could not climb the entry ramp, whereas the Rapier version can. The initial, naive Box3D smoke also failed at the foot of the ramp; that smoke omitted the already-built Box3D Character Controller Donor. Rejecting Box3D on that basis would misattribute the failure of a simplified adapter to the 3D physics engine.

This experiment keeps the **same Splot Next game, scene geometry, camera, editor, actors and rendering**. Select physics by URL only. Rapier remains the working reference; this comparison is contained in a child research branch from draft Splot PR #3.

## Frozen donor provenance (not an upstream dependency)

Six original files were copied byte-for-byte from `Jozzpoly/Box3d-Character-Controler/main` as a frozen candidate under `src/next/box3d-donor/`:

| Donor file | Git blob SHA |
| --- | --- |
| `math.js` | `2b2f369a439e15576f59d0ba44761db65d6861d7` |
| `character.js` | `f3620a0da92dd89698eee025ed65eedadbf137da` |
| `constraint-velocity.js` | `b3b8816956f01d8c41c89b207bfc1729f424c8aa` |
| `constraint-velocity-character.js` | `6fe519f833ee17af2f518699ecbd9cbfb8466db2` |
| `donor/profile.js` | `920965717bfd3ea64dea24d90ebb184711fafcdc` |
| `donor/contact-memory.js` | `801eb1b4ba7d633d4e2e8fd68d9aa82f8e122b02` |

They preserve real, previously tested mover semantics such as `CollideMover → SolvePlanes → CastMover`, supports, moving support transport and inertial contact consequences. The Splot wrapper **changes controller parameters** to Splot's experimental speed/gravity and maps Splot's physical axes to the Y-up Box3D convention. **Do not claim exact Owner acceptance of this modified configuration.**

E17 and E19 were intentionally **not** copied: E17 depends on E15 hybrid embodiment, E19's technically qualified reciprocal grips were not Owner gameplay-approved. They remain selective mechanical/interaction donors, not a cost-free turnkey library.

## Build / reproducibility

- `src/next/box3d-live.mjs` is a replaceable Box3D physics adapter; `src/next/box3d-basis.mjs` independently owns proper right-handed `[x,y,z] → [x,z,-y]` coordinate mapping.
- The browser loads pinned `box3d.js@0.1.1/inline` through esm.sh. It is NOT an offline release and requires a working network. JV Web currently uses binding `box3d.js@0.0.2`; do not assume seamless API compatibility.
- Both Rapier 0.21.0 and Box3D 0.1.1 were assembled into the **same standalone Splot Next HTML** and loaded through Opera. `build-next.py` now includes the frozen donor source modules; this generated HTML was compiled for syntax as a single JS program in V8.
- Pure basis tests `node --test tests/research/box3d-basis.test.mjs`: **2 PASS, 0 FAIL**, including 5,000 coordinate round trips and six slope orientations.
- `main` and PR #3 remain unchanged by this bounded challenger.

## Real browser observations in Opera

The bundled standalone was loaded in the connected desktop Opera browser. A deterministic fixture was added: when `probe` is present the original game stops while the external WASM module loads, then **creates a fresh identical world before running the probe**. This avoids contamination from async startup and AI/physics ticks.

| Physical attempt | Box3D frozen Donor + adapter | Rapier live adapter | Interpretation |
| --- | --- | --- | --- |
| Controlled ground→ramp→deck (225 × 1/60 s, input +X) | **PASS**, human x≈25.75, feet z≈2.40, support=footbridge-deck | **PASS**, human x≈22.38, feet z≈2.42, support=footbridge-deck | Both can traverse; endpoint X is NOT an apples-to-apples speed/feel verdict |
| Remove elevated deck; fall to ground | **PASS**, z=0, ground support | Previously passed in Rapier | Scoped support-removal test, not full structural destruction |
| Existing first-attempt weak Box3D grip law | **FAIL**: human x≈21.67, crate x≈14.45, grip released at step 25 | **PASS**: human x≈19.01, crate x≈17.47, held gap max≈1.54m, never released | Rapier's existing rope joint is currently stronger |
| Alternative E17-inspired bounded-intent FORCE + capped player outbound velocity | **FAIL at strict gap criterion**: human x≈19.42, crate x≈17.39, held gap max≈2.03m vs required 1.9m; **grip remained engaged across 100 steps** | Unchanged working Rapier reference | Real improvement, still RED. Not the E17 actuator; avoid tuning for green |
| Create static solid through player's occupied volume | **FAIL**: persistent overlap, explicitly reported `authoring-contact-unresolved` | Prior Rapier local relocator reported pass for its **own limited policy** | Neither engine automatically supplies a good permissive-authoring transaction |

**Caution:** one initial tab displayed interacting UI state while other tasks may have been accessing the connected browser; deterministic probe outcomes above were re-run and checked by exact URL where possible. Screenshots, touch input and feel are separate acceptance issues; none is established here.

**Hardware and quality limits**: no physical phone test; no matched CPU/GPU timings; `ms CPU` HUD does not measure full GPU cost; no WebAssembly package-size/offline verification; no genuine dynamic structural joints, mass-bearing beams, angle-aware crate rendering, save of full physical state, or dynamic-part collapse. No Owner hands-on validation of the new Box3D build.

## What the results actually change

1. **Box3D cannot be rejected as a poor traversal foundation.** Its proper existing controller cleared the identical Splot ramp without recreating locomotion from scratch. The earlier simplified smoke was misleading as a comparison of engine capability.
2. **Box3D is still not a cost-free swap**: the Donor has a real dependency graph; changing up-axis, mapping parts into collider frames, lifecycle, and updating Splot's experimental interaction grammar all cost engineering. E17 is especially not a standalone function.
3. **Rapier remains a valid working baseline for continuous grip.** It solved the current simplified tether using a built-in rope joint, while our Box3D research adapter is still RED at the declared 1.9m held-gap criterion.
4. **The decisive unknown is material agency**, not whether an actor can cross a ramp. Body-to-body reciprocity, physically different masses, leverage, obstacle contacts, emergent construction, moving supports and useful play all still require a fair Owner test.
5. **No substantiated “5× more work” conclusion** is possible. The experiments falsified one major supposed Box3D cost but left other work (grips, authoring changes, full integration and target performance) open.

## New execution boundary

Keep the Rapier gameplay candidate unmodified in PR #3. Maintain this Box3D challenger only on its child research branch until Owner feel/causal quality and runtime gates are established. **Do not merge solely because ramp tests turned green.** Do not adopt E17/E19 controls by default; instead identify whether a genuinely better and intuitive material interaction becomes possible.

Suggested next high-value controlled scene: actor grips a heavy crate, braces against fixed terrain, changes direction, removes a nearby support and observes displacement, momentum, failure/release. Capture player-controlled movement and whole-scene readability, not a 2D numeric assertion only.

The critical outstanding engineering debt for both solvers is a principled permissive-edit transaction (insert geometry at/through an occupied volume) and an independently meaningful, physically interactive construction lifecycle. This is a world-design problem, not proof of an inferior solver.
