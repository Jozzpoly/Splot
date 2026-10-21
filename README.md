# Splot — living-world research, playable baseline and 2.5D donors

> **SPLOT NEXT — aktualny kandydat do zabawy na badawczej gałęzi PR #5 (nie na `main`).**
> Pobierz [**Splot_Next_GRAJ.html**](src/next/Splot_Next_GRAJ.html) przez **Download raw** i otwórz w przeglądarce z dostępem do internetu. Fizyczny Box3D jest teraz uruchamiany automatycznie — bez `?physics=box3d`. W narzędziach **Przestrzeń → Obraz: 100%** można przełączyć 75% i 50% jakości obrazu w locie; pełna rozdzielczość pozostaje domyślna, fizyka i konstrukcja nie są resetowane. Mała informacja pod nagłówkiem podaje prawdziwy aktywny silnik; komunikat **AWARIA ... fizyka AWARYJNA** oznacza, że Box3D się nie załadował i nie należy tego traktować jako testu Box3D. `?physics=legacy` pozostaje świadomym trybem porównawczym. To nadal eksperyment; telefon Ownera i swobodny feel nie są zatwierdzone.
>
> Sekcja **Start here** poniżej dotyczy historycznego grywalnego K2, nadal obecnego w `main`. Nie pomyl obu uruchamianych światów.

> **Research state update (20.10.2026):** for the active but unpromoted Splot Next work, begin at [next-session entrypoint](docs/START_NEXT_SESSION_2026-10-21.md). K2 below remains the `main` baseline; PR #3→#4→#5 are *dependent draft experiments*, not released updates. The deterministic Next gate is `bash tests/verify-next.sh` on the PR #5 branch; gameplay/mobile approval remains pending.

**Status (2026-10-18): experimental / Owner review pending.** This public repository holds a reproducible **playable baseline** and a separate, **non-promoted** construction-geometry research donor. It is not a validated game engine, not the canonical geometry system for Feniks Studio, and not a replacement for Jaskinia.

Splot explores a small 2D-like living world with material manipulation, multiple elevations and behavior that responds to changes in the world. Core priority: **the player must be able to *do* interesting things in a convincing, legible, responsive world**. A successful isolated kernel test does not mean the game improved. The K3 geometry lab passed its own tests and failed the Owner's actual gameplay comparison because it removed much of the game.

## Start here

- **Play:** [`index.html`](index.html) — single-file browser build (same bytes as `Splot_Ciaglosc_GRAJ.html`), no dependencies or server required. In GitHub's file viewer use *Download raw* and open locally; use GitHub Pages only after separately enabling and validating deployment.
- **Source:** [`src/world.mjs`](src/world.mjs) (simulation), [`src/app.js`](src/app.js) (render/input), [`src/index.html`](src/index.html) (UI), [`build.py`](build.py) (offline HTML build).
- **Tests:** `node --test tests/*.test.mjs`; a full local sequence is in [`tests/verify.sh`](tests/verify.sh). Browser suites need Python Playwright and Chromium available locally.
- **For Opus / Astra:** [`docs/DONOR_HANDOFF.md`](docs/DONOR_HANDOFF.md) — concrete APIs, cross-project boundaries and acceptance probes.
- **Current truth and open problems:** [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md), [`docs/CONTRACT_MATRIX.md`](docs/CONTRACT_MATRIX.md), [`docs/PROVENANCE_AND_STATUS.md`](docs/PROVENANCE_AND_STATUS.md).
- **Experimental geometry:** [`donors/k3-geometry/`](donors/k3-geometry/) — isolated donor for parameterized construction → geometry/support/rays; **not** today's world kernel or UI. It does not deliver complete contact, authoring UX or gameplay.

## Run and verify

Python 3 and Node.js 20+; no npm packages for the game itself:

```sh
python3 build.py
node --test tests/*.test.mjs
node --test donors/k3-geometry/geometry.test.mjs
node tests/stress.mjs
node tests/authoring_chaos.mjs
```

Playwright browser checks (optional local dependencies):

```sh
python3 tests/browser_gameplay.py
python3 tests/mobile_owner_contract.py
python3 tests/mobile_rotation.py
python3 tests/browser_view.py
```

The test scripts in this historical candidate launch `/usr/bin/chromium`; this must be adapted if your machine uses another path. No test automates *feeling, joy, fatigue, real-device ergonomics, artistic direction or all possible spatial configurations*.

## Current gameplay scope

- Single 84×54 procedural terrain field; one authored-in-code ramp/bridge and various static solids.
- Human locomotion, dynamic crates, bounded kinematic grip and drag, pushing, falling and landing; a small reactive boar, plus authoring tools for crates and walls.
- Serializable JSON world snapshot; scenario presets; simple impressions, visuals and three viewing modes (automatic / cutaway / solid).
- Mobile-first HUD adaptation and two-finger input candidate: verified in emulated Chromium, **not approved on Owner's physical phone**.

**Important:** this does not solve generic elevated construction authoring, torque/rotating rigid bodies, robust support/occlusion, perceptually bounded NPC knowledge, selecting stacked surfaces, or genuinely convincing 2.5D. See the contract matrix before integrating anything.

## Working rules

Read [`AGENTS.md`](AGENTS.md). Public repo: no Owner recordings, raw conversation history, device exports, private snapshots or non-reviewed personal assets. Source history and issue/PR discussions should distinguish observations, reproductions, hypotheses and proven fixes. Opus and Astra may reuse specific donors without adopting Splot's choice of axes, UI, kernel or authoring data model.

**One experienced failure we don't repeat:** isolated technical progress must not delete actual player affordances when presented as a new playable version.
