"""Reality gate: authoring actual structures using the visible app, no JS calls to mutate world."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
src=(root/'index.html').read_text()
report=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,(width,height,mobile) in [('desktop',(1280,800,False)),('portrait',(393,852,True)),('landscape',(844,390,True))]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=mobile,has_touch=mobile)
  p=context.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
  p.set_content(src);p.wait_for_function('window.__forge');p.evaluate("__forge.scenario('warsztat')");p.wait_for_timeout(450)
  assert p.evaluate('__forge.world.constructions.length')==4,name
  assert p.evaluate('__forge.world.bodies.length')==5,name
  turns=0 if name=='landscape' else 3
  if mobile:
   p.locator('#mobile-options').tap()
   for _ in range(turns):p.locator('#scaffold-turn').tap()
   p.locator('.panel [data-tool="scaffold"]').tap()
  else:
   p.locator('.panel [data-tool="scaffold"]').click()
   for _ in range(turns):p.locator('#scaffold-turn').click()
  assert p.evaluate('__forge.tool')=='scaffold'
  px,py=(24.5,21) if name=='landscape' else (23.8,27)
  target=p.evaluate('''({x,y}) => {const r=document.getElementById('world').getBoundingClientRect();return {x:r.x+viewW*.51+(x-cam.x)*scale,y:r.y+viewH*.57+(y-cam.y)*scale*.67}}''',{'x':px,'y':py})
  assert 8<target['x']<width-8 and 120<target['y']<height-120,(name,target)
  if mobile:p.touchscreen.tap(target['x'],target['y'])
  else:p.mouse.click(target['x'],target['y'])
  assert p.evaluate('__forge.world.constructions.length')==6,(name,p.evaluate('document.querySelector("#status").textContent'))
  assert p.evaluate('__forge.world.constructions[4].z1')>1
  p.evaluate('__forge.pause()')
  saved=p.evaluate('__forge.state()')
  # The construction actually survives serialization via the app's canonical world state.
  assert p.evaluate('''s => {const v=JSON.parse(s);return v.constructions.length===6&&v.constructions[4].id!==v.constructions[0].id}''',saved)
  # Import through the actual UI path, after saving the authored six-part scene.
  p.locator('#import-world').set_input_files({'name':'splot-scaffolds.json','mimeType':'application/json','buffer':saved.encode('utf-8')})
  p.wait_for_timeout(90)
  assert p.evaluate('__forge.state()')==saved,(name,'authoring data changed on UI import')
  if mobile:
   p.locator('#mobile-options').tap();p.locator('.panel [data-tool="erase"]').tap()
  else:p.locator('.panel [data-tool="erase"]').click()
  first=p.evaluate('''() => {const d=__forge.world.constructions[1];const x=(d.ax+d.bx)/2,y=(d.ay+d.by)/2,z=d.z0,r=document.getElementById('world').getBoundingClientRect();return {x:r.x+viewW*.51+(x-cam.x)*scale,y:r.y+viewH*.57+(y-cam.y)*scale*.67-z*scale*.53,id:d.id}}''')
  # For phone the first platform is on-screen; for a narrow landscape view
  # the same world-space click can be outside the canvas, so only test UI erasure
  # when the geometry is actually in view.
  erased=False
  if first['x']>10 and first['x']<width-10 and first['y']>110 and first['y']<height-20:
   if mobile:p.touchscreen.tap(first['x'],first['y'])
   else:p.mouse.click(first['x'],first['y'])
   erased=p.evaluate('__forge.world.constructions.length')==5
   assert erased,(name,first,p.evaluate('document.querySelector("#status").textContent'))
  p.wait_for_timeout(180)
  if not mobile:
   p.keyboard.press('r')
   assert p.evaluate('__forge.world.constructions.length')==4,(name,'R must remain Reset')
   p.keyboard.press('t')
   assert p.evaluate('__forge.tool')=='scaffold',(name,'T rotates selected construction authoring')
  assert not errs,(name,errs)
  shot=root/'captures'/f'scaffold_{name}.png';shot.parent.mkdir(exist_ok=True);p.screenshot(path=str(shot))
  report.append(dict(name=name,created=True,sceneStructures=p.evaluate('__forge.world.constructions.length'),eraseChecked=erased,noErrors=True,savedBytes=len(saved)))
  context.close()
 browser.close()
(root/'captures'/'scaffold_browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
