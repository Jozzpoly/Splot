# Splot Next — CURRENT AGENT EXECUTION

**Agent-only sparse bootstrap · 25 October 2026 · source of current research direction**

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

## 25 October — bounded materialization A/B (research PASS, material-contact problem OPEN)
- Eight opt-in Chrome + actual Box3D 0.1.1 scenarios, **both real default 4 substeps and research 8 substeps**, 60 Hz, 180 settling + 660 running ticks: [CI #40193079285](https://github.com/Jozzpoly/Splot/actions/runs/40193079285) PASS, code `f63c42d`, evidence artifact `splot-materialization-ab` (14-day retention). Stable full geometry, four anchored boxes, seven added crates (same authored seed and schedule per variant); test validates final geometry to <1e-6.
- Variants and whether ANY crate leaves supported world bounds: **instant creation + local wake: FAIL at 4 and 8**; **create all then wake: FAIL at 4, no escape at 8**; **stagger 4 builds at ticks 15/75/135/195: no escape at either 4 or 8**; **rise 4 anchored blocks vertically over 24 solver steps each: no escape at either 4 or 8**.
- This is **not successful contact reconciliation**. All four policies leave **5–8 approximate crate↔static AABB overlaps** at the end. Especially dangerous: batch waking reduces catastrophic motion only in one solver setting. Avoid promoting solver rate or batch waking from one scenario.
- Baseline witness at 8 substeps retains strict tick 44 speed, tick 60 XY exit, tick 93 below-ground. At 4 substeps events differ (XY escape tick 82 and below-ground tick 121): do not conflate signatures.
- The vertical-extrusion variant directly mutates a *research fixture* across 24 ticks; it is **not implemented in the playable game**. Staggered creation also changes construction timing and would materially affect Owner experience. Comparison is not a head-to-head cost benchmark. Actual solver states after settling can differ with 4 vs 8 substeps despite identical authored seeds. No Owner playtest of these semantics exists.
- The work has reached diminishing returns for synthetic fixture optimization. Important unanswered question is which semantics, if any, could be fun, controllable and causally legible in real construction, while preventing both catastrophic ejections and dormant unresolved overlap.

## Decision for next autonomous run
**Do not automatically extend the synthetic contact campaign.** The minimal witness, matched controls and 4×/8× creation-semantics A/B provide a sufficient present diagnosis: temporal construction changes the result but none of the tested policies reconciles crowded contacts. No new physics default or materialization policy is authorized or justified.

**Prioritize the playable creator loop:** source-backed review of part visibility, selected-layer/outline, camera perception and edit→Undo→run on a small meaningful authored structure, then an Owner freeplay gate on the actual current build (desktop/phone). Reuse existing `?faces=exterior-boxes`, `?camera=seconds`, `?pixels=75` research A/B where relevant; do not turn those into defaults without evidence. Prefer one strong end-to-end example over more simulator-only stress. Owner feedback may override this plan.

The strategic project objective is **a playable, organic, permissively editable world**, not victory over one synthetic fixture. Actual Owner testing of construction feel, physics, renderer legibility, and desktop/mobile is an OPEN gate. Splot remains autonomous from Jaskinia.

## Execution discipline / limits
On a brief `kontynuuj`: verify actual PR head, read this current file, inspect latest relevant CI log, challenge result, choose bounded hypothesis, do multiple useful steps before returning; keep concise evidence/state/next. Avoid another endless one-push/one-poll cycle: batch related candidate tests inside one CI, preserve checkpoints, poll at meaningful intervals, and use atomic GitHub branch updates. Separate real gameplay CI PASS from deliberately observed physical FAIL within research PASS. Validate research harness return values and fixture invariants before expensive CI — this run itself caught two controller bugs.

**Cannot autonomously resume ordinary chat after the turn ends:** CI persists independently, but a future conversational continuation needs a new user turn. Do not pretend scheduled or background assistant work happened without a real automation.

Prior 79KB chronological archive remains at `docs/START_NEXT_SESSION_2026-10-21.md` and git history; **not the ordinary agent startup read**. Owner-facing test warning remains at `docs/PRETEST_SPLOT_NEXT_2026-10-22.md`. No publication of original private Owner source JSON.
