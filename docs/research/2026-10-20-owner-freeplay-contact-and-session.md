# Splot — Owner free play, boar contacts, browser focus, and low-friction observation
**20 October 2026 | Branch:** `research/box3d-donor-live-parity-2026-10-20` | **Status:** R&D / neither physics engine approved for release.

## New first-hand Owner evidence (supersedes earlier speculative preferences)
Owner played in Opera **while an agent was opening its research/test tabs**. This was a real opportunistic user test, not a deliberately scheduled Owner test.

- The old Splot Next controller could not climb the entrance ramp; both the integrated Rapier variant and the integrated *actual frozen Box3D donor* allowed it.
- In ordinary free play, **both variants worked broadly satisfactorily** to the Owner. Differences were mostly balance/tuning, not decisive capability gaps.
- The **only salient experiential difference** was the boar: Rapier showed very unpleasant, unstable/strange boar collision; Box3D did not collide with the animal. This is *Owner observation*, not a clean physics benchmark or proof noncollision is always desirable.
- Owner **prefers Box3D** if its engineering cost is acceptable; the preference has historical/emotional value, rooted in discovering early Erin Catto Box3D materials just after its original release and subsequent JV/JV Web experiments. Do not discard this preference just because Rapier has a ready-made controller.
- Opening a new Opera tab with the agent's connector takes focus and may interrupt Owner play. Owner accepts Opera as a collaborative browser, but that is **not blanket permission to ignore interruption cost**. For now, prefer GitHub/code/local/headless investigation and passive reads. Avoid unexpected new tabs during suspected live testing.

### Concrete explanation confirmed by source
- `src/next/rapier-live.mjs`: human and boar are **both kinematic rigid bodies carrying capsule colliders** and using Rapier KCC queries. They can obstruct one another, but are not two finite-mass dynamic animals exchanging physically reciprocal impulses. The observed unstable contact is *plausibly related*, not yet causally demonstrated in a controlled side-by-side capture.
- `src/next/box3d-live.mjs`: human and boar instantiate `ConstraintVelocityCharacter` **controller-owned capsule movers**; they are query shapes and **do not create actor rigid-body colliders**. Hence the boar and player do not collide with each other in the current implementation. This is a missing behavior/explicit research choice, not evidence that Box3D's solver is naturally better at animal contact.
- The two variants cannot honestly be compared on boar feel while their actor interaction contracts differ. The correct question is what **kind of bodily interaction** Splot wants (free passage, soft mutual deflection, hard blockage, heavy-body push, falling, etc.). A single universal collision rule is not automatically best.
- **Do not fix this by adding arbitrary hard capsule blocking to Box3D.** This risks importing the very behavior the Owner disliked. Nor should we permanently remove boar interaction from Rapier without testing whether it loses useful gameplay.

## New local playtest observation instrument (implemented, not a connected telemetry service)

`src/next/playtest-journal.mjs` provides a limited, opt-in browser-side journal; wired into the same playable Splot Next in `src/next/app.mjs` and the standalone HTML:

- A small **Zacznij test / Zakończ test / Raport** group is added to the existing tools panel. Recording **defaults off**, does **not use network**, does not infer identity, and does not record raw key values, mouse trajectories, other tabs or browsing outside the game.
- A brief **nonpersistent last-UI-input signal** is displayed in the accessible UI (recent interaction in this Splot tab; visible/background). Last input is not proof the Owner is present, engaged, available, or occupied. When idle, availability is **unknown**.
- With test recording explicitly enabled: a bounded in-memory trace of world state samples (player/boar/crate coarse positions, physical mode, grip and part count), semantic edit/grip actions, world events, and **actor proximity**. Proximity is **not itself evidence of collision or transmitted force**.
- Traces are downloadable as local JSON `splot-playtest-local-v1`. They **do not survive closing the tab** unless exported. No Medium server, AgentMail, external analytics or Jaskinia connector receives them automatically.
- An agent using a **passive browser tab reader** could inspect the Splot page's small status/summary when the tab is already open and connected, **without navigating to a new page**; it cannot monitor arbitrary inactive tabs or infer the Owner's off-tab occupation.
- A bounded event journal keeps at most 1500 events and follows **actual event identity**, not array length, after the Splot simulation rotates its 80-event ring. The recorder is intentionally not a production telemetry subsystem.

### Validation actually performed in this campaign
- JavaScript execution tests: 8/8 checks for opt-in, activity signal, world samples, proximity-as-observation, events, stop behavior, no event duplication, no outgoing transports.
- Static bundle: 13 modules parsed as a single JavaScript program, **PASS**; 43 explicit selector references checked against actual HTML ids, no missing ids; standalone includes both Box3D and Rapier.
- Dedicated Node test file `tests/research/playtest-journal.test.mjs` is committed, including a rolling 80-event regression. **It was not executed in Node** in this campaign.
- **No new Opera tab was opened to test this instrument**, deliberately respecting the Owner's interruption feedback. Therefore browser UI/runtime, actual focus behavior and real session ergonomics are **not yet user-tested**. This must remain an explicit open verification gate.

## Future Jaskinia / Medium direction (research hypothesis, not an implementation pledge)
The long-range system needs a small **session / play / observation contract** that independent projects can expose to their shared Jaskinia home or Medium cooperators. It should say *which playable version*, *what stage of testing*, *whether there was recent interaction*, and *what causal changes occurred* — without pretending to know human attention and without requiring every game to join a technical monolith.

Prefer three distinct signals:
1. **Executable truth:** version, project, world revision, engine, test identity, key events and evidence.
2. **In-game interaction evidence:** recent in-app interaction, explicitly declared test session, structured event window.
3. **Attention / collaboration consent:** explicit Owner opt-in/out to agent observation or interruptions. The absence of input is never a claim that the user is free, busy, or asleep.

A possible eventual consented flow: Splot emits opt-in event summaries → a thin Jaskinia presentation surfaces the active session → Medium can offer agents a read-only view and an interruption policy → future agents choose passive inspection or defer tab-opening. **None of this remote flow exists today.** Do not build a global event bus before one game's evidence demonstrates value.

## Engineering priority after this observation
**Preference-adjusted provisional direction:** advance **Box3D as preferred candidate**, keep Rapier as valuable control. First priority is an Owner-visible qualitative boar/body interaction counterexample — distinguish soft contact, hard blocking, and pass-through using a coherent body/authority model — alongside material agency. Do not automatically force hard boar collision, rebuild the renderer, or tune the strict existing grip test until green.

Because the Owner found both versions broadly playable, the next decisive payoff is *meaningful material play and legibility*, not re-litigating the basic ability to climb stairs. Protect the existing ramp success. Respect Owner play time and browser focus as a real resource.
