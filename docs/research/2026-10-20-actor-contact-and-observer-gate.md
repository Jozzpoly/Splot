# Splot Next — first actor-contact falsifier and passive playtest observation
**20 October 2026 • Draft research PR #4 • Box3D preferred by Owner, not final-selected.**

## Why this campaign began
Owner spontaneously played Box3D and Rapier builds while the agent opened browser tabs. The same act of opening a new Opera tab stole focus from Owner play. In first-hand feedback, both builds were broadly satisfactory except that Rapier boar contacts felt unstable/unpleasant and Box3D let the character walk through the animal. Owner prefers Box3D from genuine project history and values it if the development-cost delta is bounded.

**This is not evidence that Box3D has better physical contact:** human/boar are KCC movers without actor rigid-body colliders in our Box3D adapter; in Rapier both are kinematic capsule colliders. That is an application-level policy difference.

## Implemented, isolated hypothesis
- Added `src/next/actor-contact.mjs`, a symmetric capped normal impulse between two controller-owned actors, conditioned on physical Z overlap and limited 2D proximity.
- Adapter `src/next/box3d-live.mjs` supports `actorContact:'ghost'|'compliant'`, default `ghost`. Contact impulses enter the existing Donor velocities between `preStep` and `postStep`; actors continue using the original Box3D world casts and controls. No forced pose teleport, no hard new collider, no Rapier changes.
- In the *same running playable scene*, the Box3D-only button switches between `Kontakt: swobodny` and `Impuls R&D: ON` without reload. URL `?actors=compliant&physics=box3d` can initialize the experiment. An incompatible physics mode disables the button rather than simulating support.
- If the opt-in local session journal is running, it can record `actor-soft-contact-start/end` along with contact peer, approximate surface gap and impulse. Distinguish **physical-force hypothesis** from **proximity-only observation**; the log must not imply hard collision.
- Research branch retains original player/boar pass-through by default and existing Rapier comparator.

### Negative result: correct impulse maths alone is not enough
The pure impulse module passed conservation of paired normal impulse, numerical finiteness, distance/height gating, mass handling and bounded force. Committed `tests/research/actor-contact.test.mjs` includes an 8,000-parameter sweep.

However, the simplified command-vs-impulse pressure model reveals a decisive limitation:

| Head-on test (constant commanded controls, 180 × 1/60 s) | Minimum XY surface gap | Penetrating frames |
| --- | ---: | ---: |
| Ghost / pass-through | ~−0.725 m | 13 |
| Current compliant impulse | ~−0.705 m | 14 |

These **are not Box3D-in-browser results**: they are a simplified two-controller model with intent accelerations, no static collisions, no AI/camera or Owner interaction. They explicitly falsify promotion merely because impulse/momentum equations are locally correct. A mover's locomotion policy keeps supplying commanded motion; a small force cannot be expected to enforce nonpenetration. A genuine soft body feel likely needs a coherent arrangement of motor authority, shape queries/constraints, bodily state/posture, and boar-local behavior. Do not build that entire system by accumulating fixed patches for this one boar.

The in-game button is deliberately labeled `Impuls R&D`, not `miękka kolizja`, so the Owner will not be misled. The no-contact policy remains default.

### Actual verification this iteration
- Source and bundled combined JavaScript syntax: checked via V8 compilation, **PASS**.
- The bodies of `tests/research/actor-contact.test.mjs`, `actor-contact-pressure.test.mjs`, and `playtest-journal.test.mjs` were executed with an equivalent lightweight JavaScript test/assert harness against **the fetched exact source**: 4 + 1 + 4 executable tests passed; 2 further acceptance tests remain TODO. This is not equivalent to executing the committed files using Node's test runner.
- Additional direct numerical probes of ghost vs compliant in a simple simulated pair corroborated the limited improvement.
- **NO new Opera tab or focus-stealing browser navigation** was used. Thus the new in-game button and newest journal metadata have *not* been tested in the live browser, and neither has physical mobile input.
- All files remain on the Box3D parity child branch/PR #4. `main`, PR #3 and approved Splot builds are untouched.

## Agent collaboration / browser protocol
This is a Splot-specific guideline, not a global assumption about Owner attention:
1. Before opening a new Opera tab, prefer repo/source inspection, isolated execution or existing passive tab reads. Browser tab opening **can steal Owner focus**. An active Splot game is a reason to defer navigation, not permission to interrupt.
2. If already connected to an existing Splot tab, read the visible session indicator passively. An explicit `Test rejestrowany` means a local recording was intentionally started; recent inputs are **only in-game interaction evidence**, not proof of Owner identity or off-tab availability.
3. Silence, blur or hidden state is **unknown availability**. Never equate it with 'busy' or 'free'.
4. The local report is in-memory and opt-in. It is not sent to Medium, Jaskinia, ChatGPT or another agent. Automatic sharing requires a separate, consented read-only integration contract; do not fabricate one.
5. For mechanical QA, prefer headless tests that cannot hijack the user's foreground tab. Ask for a spontaneous Owner feel test only when a genuinely different playable experience exists.

## Next boundary
Do not grind for a green boar-contact counter. Move to an **Owner-visible material-agency experiment** with Box3D, where body intention/force, mass and object reactions create something new in play. Use the human–boar case as a pressure/falsification scenario, not the target for a bespoke collision subsystem.

Box3D remains the preferred candidate given the latest Owner feedback; Rapier remains a useful baseline. Neither selection nor the local telemetry architecture is release-ready.
