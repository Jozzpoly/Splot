# Contract matrix: fact, limitations, falsification tests

These labels describe **this dated candidate**, not eternal project requirements.

| Domain | What exists | What is NOT proven / defect | Most revealing next test |
|---|---|---|---|
| Movement | Player can move and vary pace through small contact checks | Materially precise continuous swept contact and high-fidelity ramps | Head-on, sideways, edge and fast diagonal step around two ramps |
| Grip | Can grab, drag, release, push a crate | No torque/rotation, real hands, tension and leverage; kinematic offset | Drag a long beam around a corner and compare to crate |
| Drop | Crate can lose deck support and fall to ground | Rotational tipping, rigid-body piles and support load | Half-overhang crate, stacked crates, actor underneath |
| Verticality | One bridge, one ramp, under/over body Z and support | No authorable second elevated construction in playable kernel | Add rotated second bridge without editing physics code |
| Raycast/contact | Thin ramp slab queried for some contacts and rays | Not a single robust shared solver; some exceptions | Same edge tested by body, shot, sight and picking |
| View | Ground/projection Z, auto/cutaway/solid visual modes | No true depth buffer; stacked surfaces alias in projection | Two actors on same XY at different heights; pick either surface |
| Authoring | Place/remove crates and walls, save world | No platform/ramp/beam authoring; editing by selected body's height | Studio-built construction with two versions, replay/undo |
| AI | Boar finds detours when topology changes | Globally informed A*, no observation/knowledge | Create hidden passage behind boar; compare sensory conditions |
| Mobile | Touch joystick/two-finger action tested in Chromium emulation | No Owner hardware acceptance; ergonomics, text/tap hold unresolved in real usage | 5 minutes actual phone use: move/grip/drop/build/UI |
| Art | Visual feedback, terrain marks and basic bodies | No approved artistic language, occlusion/composition maturity | Same mechanic with two radically different deliberately authored looks |
| Donor K3 | Shapes and triangles from parameters, tests | K3 product regression; conservative contact approximations | Independent scenes, rotated bridges and surface selection |

**Status categories:** the 72 positive baseline tests and 15 K3 geometry tests are mechanically verified in the accompanying suites; known failures and design gaps are **not** converted into PASS. A code-level PASS is not a gameplay/UX PASS. Retain red examples when redesigning.
