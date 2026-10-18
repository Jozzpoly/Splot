from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
captures=root/'captures/shortcut';captures.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
 failures=[];page.on('pageerror',lambda e: failures.append(str(e)))
 page.set_content((root/'Splot_Forge_GRAJ.html').read_text())
 page.wait_for_function('window.__forge!==undefined')
 page.locator('[data-scenario="skrot"]').click()
 page.evaluate('()=>__forge.pause()');page.evaluate('()=>__forge.runSteps(1,{ai:true})')
 page.locator('#debug').click();page.wait_for_timeout(250)
 before=page.evaluate('()=>({path:__forge.world.nav.path.length,crate:__forge.world.bodies.find(b=>b.id==="crate").x,revision:__forge.world.revision})')
 page.screenshot(path=str(captures/'before_blocked.png'))
 page.keyboard.press('e')
 grip=page.evaluate('()=>__forge.world.grips.player')
 assert grip=='crate',grip
 page.evaluate('()=>__forge.runSteps(38,{selected:"player",move:[-1,0],ai:false})')
 page.evaluate('()=>__forge.runSteps(55,{selected:"player",move:[0,1],ai:false})')
 page.evaluate('()=>__forge.runSteps(1,{ai:true})');page.wait_for_timeout(350)
 after=page.evaluate('()=>({path:__forge.world.nav.path.length,crate:[__forge.world.bodies.find(b=>b.id==="crate").x,__forge.world.bodies.find(b=>b.id==="crate").y],revision:__forge.world.revision})')
 assert after['path']<before['path']-10,(before,after)
 page.screenshot(path=str(captures/'after_open.png'))
 page.evaluate('()=>__forge.runSteps(900,{ai:true})')
 outcome=page.evaluate('()=>({reached:__forge.world.goal.eaten,boar:[__forge.world.bodies.find(b=>b.id==="boar").x,__forge.world.bodies.find(b=>b.id==="boar").y],routes:__forge.world.stats.routes})')
 assert outcome['reached'],outcome
 page.wait_for_timeout(150);page.screenshot(path=str(captures/'after_boar.png'))
 assert not failures,failures
 (captures/'results.json').write_text(json.dumps({'before':before,'after':after,'outcome':outcome,'errors':failures},indent=2))
 print(json.dumps({'before':before,'after':after,'outcome':outcome,'errors':failures},indent=2))
 b.close()
