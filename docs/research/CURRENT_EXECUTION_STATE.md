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

## Decision for next autonomous run
**Stop blindly reducing 105-element stress, tweaking solver counts, or solving artificial physics at any cost.** This is now a small, manageable physical island. Best next question: identify which initial crate–crate and crate–new-static contacts transfer the first abnormally large lateral impulse under the 4+7 case, preferably via exact contact/impulse diagnostics in real Box3D `0.1.1` (verify runtime ABI, do not assume current library docs match). Challenge whether the conflict is physically underdetermined due to instant solid materialization. Then evaluate only a *small number* of explicit opt-in, materially-grounded creation semantics against the exact witness; stop before promoting a policy requiring Owner judgement.

The strategic project objective is **a playable, organic, permissively editable world**, not victory over one synthetic fixture. Actual Owner testing of construction feel, physics, renderer legibility, and desktop/mobile is an OPEN gate. Splot remains autonomous from Jaskinia.

## Execution discipline / limits
On a brief `kontynuuj`: verify actual PR head, read this current file, inspect latest relevant CI log, challenge result, choose bounded hypothesis, do multiple useful steps before returning; keep concise evidence/state/next. Avoid another endless one-push/one-poll cycle: batch related candidate tests inside one CI, preserve checkpoints, poll at meaningful intervals, and use atomic GitHub branch updates. Separate real gameplay CI PASS from deliberately observed physical FAIL within research PASS. Validate research harness return values and fixture invariants before expensive CI — this run itself caught two controller bugs.

**Cannot autonomously resume ordinary chat after the turn ends:** CI persists independently, but a future conversational continuation needs a new user turn. Do not pretend scheduled or background assistant work happened without a real automation.

Prior 79KB chronological archive remains at `docs/START_NEXT_SESSION_2026-10-21.md` and git history; **not the ordinary agent startup read**. Owner-facing test warning remains at `docs/PRETEST_SPLOT_NEXT_2026-10-22.md`. No publication of original private Owner source JSON.
