"""Real visible tool path: cycling the selected projected surface changes edit target, not actor/world."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
source=(root/'index.html').read_text()
records=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,(width,height,mobile) in [('desktop',(1280,800,False)),('portrait',(393,852,True)),('landscape',(844,390,True))]:
  context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=mobile,has_touch=mobile)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(source);page.wait_for_function('window.__forge')
  page.evaluate("()=>{__forge.scenario('przeslo');__forge.pause()}")
  page.evaluate("()=>__forge.choose('scout')")
  page.wait_for_timeout(500)
  if mobile:
   page.locator('#mobile-options').tap();page.locator('.panel [data-tool="crate"]').tap()
  else:page.locator('.panel [data-tool="crate"]').click()
  assert page.locator('#pick-layer').count()==1, 'Explicit layer control must exist'
  before=page.evaluate('__forge.state()')
  point=page.evaluate('''()=>{const r=document.getElementById('world').getBoundingClientRect(),x=45,y=28.5,z=2.6;
    return {x:r.x+viewW*.51+(x-cam.x)*scale,y:r.y+viewH*.57+(y-cam.y)*scale*.67-z*scale*.53};}''')
  assert 5<point['x']<width-5 and 40<point['y']<height-5,(name,point)
  if mobile:page.locator('#mobile-pick-layer').tap()
  else:page.locator('#pick-layer').click()
  assert page.evaluate('__forge.state()')==before, 'Cycling UI must not alter the world'
  if mobile:page.touchscreen.tap(point['x'],point['y'])
  else:page.mouse.click(point['x'],point['y'])
  created=page.evaluate("__forge.world.bodies.filter(b=>b.id.startsWith('made-crate-')).map(b=>({support:b.support,z:b.z}))")
  assert len(created)==1 and created[0]['support']=='ground',(name,created)
  assert not errors,(name,errors)
  records.append(dict(name=name,pixel=point,created=created))
  context.close()
 browser.close()
print(json.dumps(records,ensure_ascii=False,indent=2))
