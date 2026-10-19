"""KNOWN PRODUCT/UX COUNTEREXAMPLE, not a passing quality gate.
Same projected pixel on bridge is placed at different heights depending on the
selected ACTOR; this is a repro of implicit layer selection, NOT a bug fix.
Run: python tools/repro_screen_pick_ambiguity.py
Requires Chromium + playwright. Does not modify the world source or save files.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root = Path(__file__).resolve().parent.parent
source = (root / 'index.html').read_text(encoding='utf-8')
records = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True, executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--disable-dev-shm-usage'])
    for selected in ['player', 'scout']:
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800},
                                  device_scale_factor=1)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.set_content(source)
        page.wait_for_function('window.__forge')
        page.evaluate("() => { __forge.scenario('przeslo'); __forge.pause() }")
        page.evaluate('(who) => __forge.choose(who)', selected)
        page.wait_for_timeout(800)  # Camera converges to same XYZ actors.
        page.locator('.panel [data-tool="crate"]').click()
        point = page.evaluate("""() => {
            const r = document.getElementById('world').getBoundingClientRect();
            return {
                x: r.left + viewW*.51 + (45-cam.x)*scale,
                y: r.top + viewH*.57 + (28.5-cam.y)*scale*.67 - 2.6*scale*.53
            };
        }""")
        page.mouse.click(point['x'], point['y'])
        created = page.evaluate("""() =>
            __forge.world.bodies.filter(b => b.id.startsWith('made-crate-'))
                .map(b => ({x:b.x, y:b.y, z:b.z, support:b.support}))""")
        records.append({'who': selected, 'pixel': point, 'created': created,
                        'page_errors': errors})
        ctx.close()
    browser.close()
print(json.dumps(records, ensure_ascii=False, indent=2))
assert all(not r['page_errors'] for r in records), records
assert all(len(r['created']) == 1 for r in records), records
assert abs(records[0]['pixel']['x'] - records[1]['pixel']['x']) < 1, records
assert abs(records[0]['pixel']['y'] - records[1]['pixel']['y']) < 1, records
assert records[0]['created'][0]['support'] == 'ground', records
assert records[1]['created'][0]['support'] == 'bridge', records
print('KNOWN COUNTEREXAMPLE REPRODUCED — NOT A PRODUCT PASS.')
