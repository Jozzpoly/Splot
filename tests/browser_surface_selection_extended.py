"""Adversarial editor contract: same screen location, both strata; authored platform erase prioritizes objects."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
src=(root/'index.html').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,(width,height,mobile) in [('desktop',(1280,800,False)),('portrait',(393,852,True)),('narrow',(320,568,True)),('landscape',(844,390,True))]:
  cx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=mobile,has_touch=mobile);p=cx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(src);p.wait_for_function('window.__forge')
  p.evaluate("()=>{__forge.scenario('przeslo');__forge.pause();__forge.choose('player')}")
  p.wait_for_timeout(350)
  if mobile:p.locator('#mobile-options').tap();p.locator('.panel [data-tool="crate"]').tap()
  else:p.locator('.panel [data-tool="crate"]').click()
  target=p.evaluate("""()=>{const x=44,y=29,z=2.6,r=document.getElementById('world').getBoundingClientRect();return{x:r.left+viewW*.51+(x-cam.x)*scale,y:r.top+viewH*.57+(y-cam.y)*scale*.67-z*scale*.53};}""")
  assert 10<target['x']<width-10 and 60<target['y']<height-20,(name,target)
  if mobile:p.touchscreen.tap(target['x'],target['y'])
  else:p.mouse.click(target['x'],target['y'])
  upper=p.evaluate("__forge.world.bodies.filter(b=>b.id.startsWith('made-crate-')).at(-1)")
  assert upper['support']=='bridge' and abs(upper['z']-2.6)<1e-6,(name,upper)
  p.evaluate("()=>__forge.choose('scout')") # Switch actor; target must remain screen/world-derived.
  # 'Q' or touch level button selects the lower layer at the same location.
  if mobile:p.locator('#mobile-pick-layer').tap()
  else:p.locator('#pick-layer').click()
  before=p.evaluate('__forge.state()')
  assert p.evaluate('__forge.state()')==before
  if mobile:p.touchscreen.tap(target['x'],target['y'])
  else:p.mouse.click(target['x'],target['y'])
  crates=p.evaluate("__forge.world.bodies.filter(b=>b.id.startsWith('made-crate-')).map(b=>({id:b.id,z:b.z,support:b.support}))")
  assert len(crates)==2 and crates[1]['support']=='ground',(name,crates)
  # After changing tools, target is back to top (no hidden selected-actor policy).
  if mobile:p.locator('#mobile-options').tap();p.locator('.panel [data-tool="erase"]').tap()
  else:p.locator('.panel [data-tool="erase"]').click()
  if mobile:p.touchscreen.tap(target['x'],target['y'])
  else:p.mouse.click(target['x'],target['y'])
  top_remaining=p.evaluate("__forge.world.bodies.filter(b=>b.id.startsWith('made-crate-')).map(b=>b.support)")
  assert top_remaining==['ground'],(name,top_remaining)
  if mobile:p.locator('#mobile-pick-layer').tap()
  else:p.locator('#pick-layer').click()
  if mobile:p.touchscreen.tap(target['x'],target['y'])
  else:p.mouse.click(target['x'],target['y'])
  assert p.evaluate("__forge.world.bodies.filter(b=>b.id.startsWith('made-crate-')).length")==0,(name,'ground crate not erased')
  assert not errors,(name,errors)
  print(name,'PASS upper/lower create and upper/lower erase, actor switched; no JS errors')
  cx.close()
 # Desktop authored platform + crate, eraser must remove crate first, platform second.
 cx=browser.new_context(viewport={'width':1280,'height':800});p=cx.new_page();p.set_content(src);p.wait_for_function('window.__forge')
 p.evaluate("()=>{__forge.scenario('warsztat');__forge.pause()}");p.wait_for_timeout(400)
 p.locator('.panel [data-tool="crate"]').click()
 point=p.evaluate("""()=>{const d=__forge.world.constructions[1],x=(d.ax+d.bx)/2,y=(d.ay+d.by)/2,z=d.z0,r=document.getElementById('world').getBoundingClientRect();return {x:r.left+viewW*.51+(x-cam.x)*scale,y:r.top+viewH*.57+(y-cam.y)*scale*.67-z*scale*.53,id:d.id};}""")
 p.mouse.click(point['x'],point['y'])
 assert p.evaluate("__forge.world.bodies.some(b=>b.id.startsWith('made-crate-')&&b.support===__forge.world.constructions[1].id)")
 p.locator('.panel [data-tool="erase"]').click();p.mouse.click(point['x'],point['y'])
 assert p.evaluate('__forge.world.constructions.length')==4,'Do not delete platform beneath placed crate'
 assert p.evaluate("__forge.world.bodies.filter(b=>b.id.startsWith('made-crate-')).length")==0
 p.mouse.click(point['x'],point['y'])
 assert p.evaluate('__forge.world.constructions.length')==3,'Second erase deletes now-empty platform'
 print('authored platform PASS object-first erasure')
 # A newly supported elevated wall must remain importable and individually editable.
 p.evaluate("()=>{__forge.scenario('warsztat');__forge.pause()}")
 p.wait_for_timeout(330)
 p.locator('.panel [data-tool="wall"]').click()
 point=p.evaluate('''()=>{const d=__forge.world.constructions[1],x=(d.ax+d.bx)/2,y=(d.ay+d.by)/2,z=d.z0,r=document.getElementById('world').getBoundingClientRect();return {x:r.left+viewW*.51+(x-cam.x)*scale,y:r.top+viewH*.57+(y-cam.y)*scale*.67-z*scale*.53};}''')
 p.mouse.click(point['x'],point['y'])
 assert p.evaluate('__forge.world.authored.length')==1,'new elevated wall not placed'
 saved=p.evaluate('__forge.state()')
 p.locator('#import-world').set_input_files({'name':'splot-elevated-wall.json','mimeType':'application/json','buffer':saved.encode('utf-8')})
 p.wait_for_timeout(100)
 assert p.evaluate('__forge.state()')==saved,'elevated wall lost across UI save/import'
 p.locator('.panel [data-tool="erase"]').click();p.mouse.click(point['x'],point['y'])
 assert p.evaluate('__forge.world.constructions.length')==4,'removing wall must retain support'
 assert p.evaluate('__forge.world.authored.length')==0,'elevated wall not erased'
 print('authored platform PASS elevated-wall import / erase / support preserved')
 cx.close();browser.close()
