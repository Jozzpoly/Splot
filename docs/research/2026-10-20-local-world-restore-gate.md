# Splot — Save → Load → Inspect → Continue (research contract)
**20.10.2026 · child work inside draft PR #5 · no promotion to main**

## Why this work mattered
Owner built 132 authored scene elements (125 new placements) with a live Box3D world, but UI only exported `Splot_Nowy_Rozdzial.json`. There was no way to open that same creation the next day; any in-place experimentation began from a fresh K2/Next fixture. This is a **broken creative feedback loop**, not a lack of another physics algorithm.

This work adds an explicitly local **Wczytaj JSON** to the existing editor, including the compact mobile menu. `Zapis JSON` has also been made visible in that menu. A user picks a previously exported JSON; files stay local in that tab, are neither uploaded to GitHub nor sent to a server.

## Precisely what is restored
- The exact accepted `splot-next-live-research-1` scene format: ordered authored `box` and `panel` elements, their IDs, materials, authored/dynamic mode, positions and revision.
- Saved actor and crate **positions**, dimensions, mass, yaw, identities; simulation time value.
- A **fresh Box3D world** (or selected Rapier/legacy backend), recreated against the validated scene and bodies. The new game starts **paused**, at the saved camera-relevant player position. Click `Uruchom` to begin physics from that pose. Editor stays functional and generates non-colliding IDs even for sparse crate numbering.
- Neither historic velocities, contacts, constraints, active grip, exact solver island state, nor a deterministic replay are restored. `vz` and `support` are intentionally reset; physics recomputes contacts. This is *resume creative authoring*, **not** time-continuous simulation. No save backward-compatibility promise.
- Changes are applied transactionally at the application level: parse + validate + construct the fresh physics bridge *before* switching from the existing world. Unsupported / malformed / duplicate / oversized input is rejected and the existing scene remains intact. Known research limits: 256 authored elements, 2000 bodies, selected JSON under 8 MiB.

## Evidence — separate classes
- Unit `tests/research/scene-restore.test.mjs`: validate canonical JSON, dynamic part identity, authored revisions, saved positions, fresh physics defaults, malformed/duplicate rejection, and continued numbering after sparse crate IDs.
- Actual headless Chrome with actual Box3D WASM: imported a **synthetic** 132-part/61-body JSON mirroring the *scale and format* of the Owner's private file; verified fresh dynamic Body registration, paused inspection, manual resume and continued authoring, and rejection of a corrupt file without discarding the open world. This **did not** transmit or run the exact Owner-provided private 132-part file on GitHub.
- **Private local format check of the actual two Owner files:** 132-part/61-body (1 dynamic) and 19-part/343-body (2 dynamic) exports satisfy the loader's examined envelope for format, IDs, numeric fields, motion annotations and body limits. This check used local files and an independent Python implementation of the schema checks; it is **not** proof that the exact files have run through the JavaScript importer + WASM browser. Both originals stayed private.
- Actual Chrome emulating mobile touch: built/released a box, saved via the visible mobile UI, received a browser download, used the browser's file chooser to load the same file and reached paused inspect state. A physical phone/browser is **not** verified.

## Architectural guardrails
- Private saves/records remain in conversation attachments or the user's local disk; do not upload private fixtures to a public repo.
- A scene loader is NOT a replay engine, version migration, persistent Jaskinia asset library, or evidence of perfect contact/state reconstruction.
- Source modules under `src/next` remain canonical; `build-next.py --check` must continue to prove byte-identical standalone output. Node and browser CI are separate from Owner feel approval.
- Strong next priorities: in-place move/resize/reorient and undo/redo, visible-geometry resolution for overlapping authored parts, camera refresh-invariant smoothing, and deterministic physics-state contracts *only when repeated need justifies them*.

**Owner acceptance question:** Can the exact 132-element creation be picked from their disk, inspected, improved and saved again without frustration and without losing earlier progress? This remains to be tested with the real file and on their hardware.
