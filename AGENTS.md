# Splot — kontrakt pracy agentów

> **Przed nowym runem na Splot Next:** przeczytaj KRÓTKI [aktualny stan i granice pracy](docs/research/CURRENT_EXECUTION_STATE.md) (PR HEAD i CI zweryfikuj na żywo). [Długi dziennik](docs/START_NEXT_SESSION_2026-10-21.md) to archiwum historyczne do odczytu tylko na żądanie dowodów — nie aktualna instrukcja i nie zgoda na awans do main.

1. **Owner-observed FAIL ma veto** nad PASS kernela, estetyki lub syntetycznej przeglądarki. Nie usprawiedliwiaj gorszej gry czystszą geometrią.
2. **Nie promuj laboratorium do następcy gry.** K3 ma dawstwo geometrii, ale nie odziedziczył chwytu, dzika, autorstwa, świata ani języka obrazu — Owner odrzucił go jako grę.
3. Zmiana substytutu może wyrzucić cały stary kod. Musi jednak jawnie porównać realne możliwości: ruch, chwyt, pchanie, porzucanie, edycję w kilku regionach, autonomię, zapis, kadr i telefon. Zastępuj możliwości czymś lepszym, nie licz linijek.
4. Red-green: najpierw reprodukcja objawu, potem minimalna hipoteza, zmiana, pełna regresja, Chromium, swobodna próba oraz raport granic dowodu.
5. Bramka publikacji grywalnej: kilka minut swobodnej interakcji; desktop i mobilne widoki; przyciski faktycznie dostępne i używane; obraz czytelny bez debugowania; porównanie ze starszą wersją; zawsze status Owner testu.
6. Geometria, podparcia, promienie, rendering, autorstwo i nawigacja powinny wywodzić się z kompatybilnych faktów świata. **Jeden XYZ nie oznacza automatycznie spójnej fizyki ani rozwiązanego 2.5D.**
7. Materiał źródłowy Ownera: nagrania, surowe zapisy, prywatne rozmowy i zewnętrzne modele **nie są automatycznie do publikacji** w publicznym repo.
8. Repo, Jaskinia i Feniks Studio mają oddzielne odpowiedzialności. Splot nie przejmuje ich kodu, architektury ani harmonogramu. Integrację uzasadnia rzeczywisty, testowalny przypadek użycia.
9. Dług i otwarte kontrprzykłady są jawne. Nie kasuj wad przez przepisywanie testu, chyba że nowy wynik jest poprawny według rzeczywistych zasad świata — zachowaj uzasadnienie i niezależne próby obydwu sytuacji.
10. Raportuj Ownerowi **krótko**, pracuj i testuj **długo**. Staraj się prowadzić autonomiczne wieloiteracyjne kampanie; nie kończ po pierwszym lokalnym PASS.

11. **Owner correction 25.10:** nie rozwijaj dalej map-authoringu na telefonie (nie blokuj istniejącego). Profesjonalny autorat map/światów należy do przyszłej linii Jaskinia/Studio, natomiast Splot ma badać świat fizyczny i swobodną interakcję. Mobilne **granie/sterowanie**, gdy jest przedmiotem konkretnej poprawki, nadal ma osobną bramkę jakości i nie jest zatwierdzone samym emulatorem.
12. **Mobile input is a product gate when a mobile-play change actually matters:** no positive label from tapping one button in Playwright. Check real pointer movement, hold, second-finger action, cancel, scroll/text selection, menu state and rotation at 320×568, 393×852 and 844×390. A physical Owner phone test remains separate.
13. **A screen is not an occlusion proof.** Compare geometry, support, ray, actor layering and surface picking. Camera cutaway is a view aid. Do not call it full 2.5D or depth correctness.

## 20.10.2026 — correction after Owner free play and excessive draft churn

- **Do not create another nested draft PR for a minor new mechanic.** Current dependency chain is #3 (spatial reset) → #4 (Box3D) → #5 (material part lifecycle). PR #5 is RESEARCH, not an accepted playable baseline. Consolidate intentionally after a real browser run and Owner gameplay review, not by stacking further branches.
- Keep **one reproducible Splot Next standalone**: `python3 build-next.py`, then `bash tests/verify-next.sh`. Do not manually splice modules into the shipped HTML. `--check` must be a no-write, byte-identical reproducibility guard.
- Verification results must identify their evidence level: **pure function**, **mocked adapter**, **real Box3D WASM/browser**, **Owner free play**, **physical mobile**. A unit PASS is not a browser PASS. `tests/research/causal-pressure.test.mjs` deliberately contains known RED controls and is excluded from routine green verification but must remain visible as debt.
- Each significant campaign delivers one **playable causal scenario**, demonstrates no loss of movement, crate grip, support/removal, camera and authoring, and compares to the previous Owner-accepted behavior. Art/readability counts as product functionality, not polish after physics.
- When observing via Opera, inspect existing tabs passively; creating/navigating a tab can steal Owner focus. Last-input and blur signals cannot prove identity or availability. Private Owner traces never enter the public repo.
- Before claiming large-scale material worlds, measure real frame time and Box3D cost on intended devices; document static/active/sleeping bodies, runtime geometry generation, spatial query index and save semantics. Current world is capped at 256 authored elements; a release/anchor toggle **is not** large-scale optimization.
