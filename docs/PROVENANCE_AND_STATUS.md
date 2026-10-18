# Provenance, scope, and what is not in this public repo

**Snapshot date:** 2026-10-18 (local research campaign). Sources in this repository were recovered from `Splot_Mobile_Odzysk_2026-10-18.zip`, itself a continuation of Forge K2 and the earlier `Splot_Ciaglosc` candidate. The independent K3 `geometry.mjs` and associated tests were taken from `Splot_K3_Konstrukcje_Geometria_Badanie_2026-10-18.zip`. This is the **first curated repository publication**, not a claim that all earlier conversations or source variants have been reproduced.

A2 and Żywy Kadr also provided valuable earlier experiments in freeform building, expressivity and 2D-like visuals, but their complete source trees have **not** been silently merged or rewritten into this baseline. Consult actual donor archives where available, with provenance and targeted review. Our current code is one candidate, not a canon.

The K3 experiment succeeded locally at generating parameterized geometry and failed the Owner's playable acceptance because it stripped away valuable affordances. Kept as research donor only.

## Privacy / external evidence

This public repo deliberately excludes private Owner device recordings, imported chat history, raw user-generated save files, screenshots of private browser tabs, models and unreviewed art assets. There is an additional recording associated with the same handoff whose visible title is **"POLE"**: glowing objects influenced by dragging `+` and `−` controls. It is **not** a recording of the Splot baseline, and its interaction experience must not be cited as proof of Splot gameplay or mobile control correctness. We do not distribute the recording or frames in this repository.

## Verification model

- Rebuild from `src/` with `python3 build.py` and compare generated self-contained HTML to the committed HTML.
- Run positive simulation tests and separate donor tests; run stress and chaos; run browser tests where Chromium/Playwright are available.
- Test full gameplay and Owner's real phone separately. A passing automated touch test is not sufficient.
- If a fresh test fails, report that failure; don't silently use older results as a substitute.

## Release gate for future playable builds

Any release as a *new game* must be visibly compared against previous playable behavior in the same scenario: movement, crate drag/drop, building and removing geometry, creature response, save/restore, frame legibility, PC and real phone. A geometry probe may deliberately lack these, but is labeled a donor and never marketed as a successor.
