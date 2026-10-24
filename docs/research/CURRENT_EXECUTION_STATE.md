# Splot Next — CURRENT AGENT EXECUTION

**Agent-only sparse bootstrap · 24 October 2026 · source of current research direction**

## Verified live truth
- Active [PR #5](https://github.com/Jozzpoly/Splot/pull/5): **DRAFT**, branch `research/material-part-lifecycle-2026-10-20`, base donor research `research/box3d-donor-live-parity-2026-10-20`; do NOT merge or touch `main` without Owner authorization.
- **Default gameplay unchanged:** 60 Hz Box3D × 4 substeps. `?substeps=8/12/16` remains opt-in R&D; it reduced some ejections but is NOT generally safe under live staged materialization.
- Repeated standard suite **90 Node PASS / 0 FAIL / 2 TODO** and Chrome+real Box3D PASS on latest test code. Synthetic 177-crate/127-part full creator pressure with 60×8 PASS twice, but other synthetic material-contact cases still FAIL physically.
- Source-level uncertainty: a newly added anchored box overlapping an **asleep** crate leaves it asleep and in conflict; deliberate local/global waking can generate horizontal speed >20–60 m/s and lateral escape, then falling outside finite ground. This is a world-materialization semantics problem, not just a floor thickness or pixel display bug. Do NOT hide it by clamps, prohibitions, blanket waking, or arbitrary new physics defaults.

## Minimized, reproducible witness (new)
Actual Chrome+Box3D 0.1.1 at **60 Hz × 8 substeps**, same root world (human, boar and base crate), 180 settling ticks, 105 potential authored edit slots with physics steps even when an element is omitted, targeted local waking, 660 subsequent fixed ticks.

- Only **4 additional authored anchored boxes**, zero added panels: original box indices `[14,36,37,38]`.
- Only **7 additional dynamic crates** from original 80-grid layout: indices `[42,52,60,61,62,70,71]` (IDs `crate-242,252,260,261,262,270,271`), plus the original `crate-1` and actors.
- `crate-270` gets >**23.9 m/s** at simulated tick **44**, exits world XY at tick **60**, falls below −2m at tick **93**. Creating `research-box-43` is NOT necessary; the instability is delayed after earlier contacts.
- **Four-box reduction:** [GREEN #40037342461](https://github.com/Jozzpoly/Splot/actions/runs/40037342461), 24 automatic candidate checks, same exact historical first velocity/exit positions, each of four independently necessary *for that signature within the fixed all-crates layout*. Portable JSON artifact `splot-contact-ddmin` (14-day retention).
- **Crate reductions:** [GREEN #40037802650](https://github.com/Jozzpoly/Splot/actions/runs/40037802650) 80→9 within 48 attempts (budget exhausted), followed by [GREEN #40038072931](https://github.com/Jozzpoly/Splot/actions/runs/40038072931) 9→7 with independent leave-one-out checks. Deleting any of the six non-target crates changes/breaks the **exact 44→60→93** signature, BUT deleting certain crates still causes a **different later ejection**. These masks are therefore *locally minimal for the specified event*, NOT globally minimal for all bad contacts or jointly proven minimal across both shapes and crates.
- Diagnostic scripts: `tests/browser-next-contact-ddmin.mjs`, `tests/browser-next-crate-ddmin.mjs`; CI via commit tags `[contact-ddmin]` and `[crate-ddmin]`. Retained CI artifacts `splot-contact-ddmin` and `splot-crate-ddmin` expire after 14 days; the coordinates/indices above survive in repo.

## 24 October — matched seven-crate contact chain (GREEN research; FAIL physics preserved)
- Isolated `tests/browser-next-contact-chain.mjs`; commit `e7bc3fd`, [CI #40109226128](https://github.com/Jozzpoly/Splot/actions/runs/40109226128) PASS; artifact `splot-contact-chain` retains 110 ticks of real solver velocities and approximate AABB neighbours in all three fresh-world variants (14-day retention). Green research CI does **not** mean physical repair.
- Baseline keeps exactly four newly authored anchored boxes, seven dynamic crates, the same seed, 180 settling ticks, 105 construction slots, and 660 subsequent ticks at 60 Hz × 8 substeps. **Two sleeping crates explicitly woken**. Same strict failure: crate-270 speed 23.92 m/s at tick 44, exits world XY at tick 60, under -2m at tick 93.
- Tick 44 horizontal velocity changes over one step: crate-270 **22.63 m/s**, crate-260 **14.92 m/s**, crate-261 **14.79 m/s**, crate-271 **6.10 m/s**. Target crate-270 initially directly overlaps none of the newly created solids in the raw 7-crate geometry. At tick 43 it is geometrically near crates 261 and 271; after tick 44 it is no longer close. This supports a *contact-chain hypothesis*, not proof of exact contact pair, measured impulse, or underlying engine defect.
- Control **same material, no explicit waking**: four solids added, zero bodies explicitly woken; no motion or escape, but unresolved sleeping overlaps remain. Control **no new solids**: no motion or escape. Both controls start from the same world.
- These are pathological synthetic overlaps; game feel and actual construction safety remain unverified. No default game behavior altered.

## Decision for next autonomous run
Do not keep minimizing arbitrary stress fixtures, blindly raise solver rates, or celebrate green CI as proof of physical validity. If the *actual pinned* `box3d.js@0.1.1` exposes contact manifolds/normal impulses, inspect the tick 39–44 graph; otherwise record the ABI limitation rather than substitute approximations. Then evaluate only a few reversible, explicit materially-grounded materialization semantics against both the fixture and intended playful creation, without choosing policy on the Owner's behalf.

The strategic project objective is **a playable, organic, permissively editable world**, not victory over one synthetic fixture. Actual Owner testing of construction feel, physics, renderer legibility, and desktop/mobile is an OPEN gate. Splot remains autonomous from Jaskinia.

## Execution discipline / limits
On a brief `kontynuuj`: verify actual PR head, read this current file, inspect latest relevant CI log, challenge result, choose bounded hypothesis, do multiple useful steps before returning; keep concise evidence/state/next. Avoid another endless one-push/one-poll cycle: batch related candidate tests inside one CI, preserve checkpoints, poll at meaningful intervals, and use atomic GitHub branch updates. Separate real gameplay CI PASS from deliberately observed physical FAIL within research PASS. Validate research harness return values and fixture invariants before expensive CI — this run itself caught two controller bugs.

**Cannot autonomously resume ordinary chat after the turn ends:** CI persists independently, but a future conversational continuation needs a new user turn. Do not pretend scheduled or background assistant work happened without a real automation.

Prior 79KB chronological archive remains at `docs/START_NEXT_SESSION_2026-10-21.md` and git history; **not the ordinary agent startup read**. Owner-facing test warning remains at `docs/PRETEST_SPLOT_NEXT_2026-10-22.md`. No publication of original private Owner source JSON.
