#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
python build.py
node --test tests/*.test.mjs
node tests/stress.mjs
node tests/authoring_chaos.mjs
python tests/browser_gameplay.py
python tests/browser_view.py
python tests/browser_depth.py
python tests/mobile_owner_contract.py
python tests/mobile_rotation.py

python tests/browser_scaffold.py
python tests/browser_surface_selection.py
python tests/browser_surface_selection_extended.py
