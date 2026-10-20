#!/usr/bin/env bash
# Deterministic source/build + runnable Next contracts.
# Deliberately excludes research/causal-pressure.test.mjs: it contains
# known RED probes against the old, deliberately incomplete legacy sim.
# Browser/real-device Box3D execution remains a separate hard acceptance gate.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
python3 build-next.py --check
node tests/check-next-bundle.mjs
node --test \
 tests/spatial-core.test.mjs \
 tests/spatial-sim.test.mjs \
 tests/research/actor-contact.test.mjs \
 tests/research/analytic-support.test.mjs \
 tests/research/actor-contact-pressure.test.mjs \
 tests/research/boar-intent.test.mjs \
 tests/research/crate-visual.test.mjs \
 tests/research/perf-metrics.test.mjs \
 tests/research/scene-restore.test.mjs \
 tests/research/authoring-editor.test.mjs \
 tests/research/box3d-basis.test.mjs \
 tests/research/material-part-lifecycle.test.mjs \
 tests/research/playtest-journal.test.mjs
echo 'PASS: Splot Next deterministic source/build test gate'
echo 'Node stage only: real Box3D Chrome gate runs separately. Physical phone, Owner feel and full structural forces remain unverified.'
