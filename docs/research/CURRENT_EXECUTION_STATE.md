# Splot Next — active execution state

**Agent-only current entrypoint · refreshed 24.10.2026 (Warsaw)**

## Truth now
- Active branch `research/material-part-lifecycle-2026-10-20`, [PR #5](https://github.com/Jozzpoly/Splot/pull/5) **DRAFT**; base `research/box3d-donor-live-parity-2026-10-20`. Never merge or alter `main` without Owner instruction.
- Default playable Box3D: **60 Hz × 4 solver substeps**; opt-in `?substeps=8/12/16` is an R&D comparison, not accepted gameplay.
- Standard Node/Chrome+Box3D suite: historically 90 PASS, 0 FAIL, 2 TODO; rerun on changed source. Synthetic dense 177-crate/127-part storm GREEN twice at 60×8; this does **not** imply correct material contacts.
- **Material open FAIL:** new anchored matter inside sleeping Box3D crates does not wake them. Force waking can produce lateral velocities >20–60 m/s, eject bodies, then they fall below the finite ground. At 8 substeps gradual authored material with local waking also FAILS. Do **not** automatically enable all/local wake or treat 8 substeps as a universal fix.

## Reproduction and next work
- [Last verified subset run](https://github.com/Jozzpoly/Splot/actions/runs/40034200092) demonstrated `crate-270` first >24 m/s at physical tick 44, exits XY tick 60, falls below floor tick 93. It is **NOT** caused by placement of `research-box-43` alone; deletion of that box left the event unchanged. A 30-solid subset (0..14 and 30..44) reproduces it.
- `tests/browser-next-contact-ddmin.mjs` runs a **bounded independent fresh-Box3D delta debugging campaign** in one [contact-ddmin] CI trigger, preserves all 105 editing slots and 660 physical ticks, requires exactly the same crate/timing signature, and archives a JSON of accepted reductions.
- Retrieve the latest workflow/job logs and artifact; distinguish test success from physical-world success. If minimized witness is still large, pursue substructure causality or staged-materialization alternatives in **opt-in research only**. Stop if a candidate changes physics without grounded evidence.
- For scope: successful generator/test runs are **evidence about solver**, not approval of gameplay or feel. Owner freeplay on desktop/mobile remains pending; Splot stays autonomous, don't fold it into Jaskinia.

## Continuation contract
`kontynuuj` → verify GitHub PR head and CI evidence → recover latest result → challenge present hypothesis → select one high-leverage experiment → implement+test+record one outcome → compactly report state / evidence / risk / next. Work through multiple steps **within the same turn** rather than stopping after one CI check. No silent merge, no irreversible changes.

**Efficiency:** GitHub Actions normally 1–2 min, some 3–4 min. Avoid repeated status polling; use a single run for multiple hypotheses. Report CI RED caused by expected falsification as research evidence, not a broken standard suite. Avoid unbounded append-only handoffs and constant Owner-facing procedure narration.

## Source trail
- Extensive chronological research history retained at `docs/START_NEXT_SESSION_2026-10-21.md` and in git commits, **not** the initial read surface.
- The Owner-facing freeplay warning is `docs/PRETEST_SPLOT_NEXT_2026-10-22.md`.
- The agent should query old history only for an identified evidence gap, not load ~79KB on every continuation.
