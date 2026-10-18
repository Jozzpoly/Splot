from pathlib import Path
from playwright.sync_api import sync_playwright
import json, time
root=Path(__file__).resolve().parent.parent
html=(root/'Splot_Ciaglosc_GRAJ.html').read_text()
out=root/'captures';out.mkdir(exist_ok=True)
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,width,height,dpr in [('desktop',1280,800,1),('portrait',375,720,2),('landscape',844,390,2)]:
  ctx=b.new_context(viewport={'width':width,'height':height},device_scale_factor=dpr,is_mobile=name!='desktop',has_touch=True)
  p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(html,wait_until='load');p.wait_for_function('typeof window.__forge === "object"');p.wait_for_timeout(150)
  assert p.locator('canvas#world').count()==1
  p.locator('[data-scenario="zrzut"]').click(force=True) if name=='desktop' else p.evaluate("()=>__forge.scenario('zrzut')")
  p.wait_for_timeout(130)
  before=p.evaluate("()=>({actor:__forge.selected, crate:__forge.world.bodies.find(b=>b.id==='deck-crate').x,support:__forge.world.bodies.find(b=>b.id==='deck-crate').support,player:__forge.world.bodies.find(b=>b.id==='scout').x})")
  assert before['actor']=='scout',before
  p.screenshot(path=str(out/f'{name}_before_drop.png'))
  if name=='desktop':p.keyboard.press('e')
  else:p.locator('#mobile-grip').click(force=True)
  grip=p.evaluate('()=>__forge.world.grips.scout'); assert grip=='deck-crate',(name,grip,p.locator('#status').inner_text())
  # Real controller input, not an injected world mutation.
  if name=='desktop':p.keyboard.down('d')
  else:
   node=p.locator('#mobile-joystick');rect=node.bounding_box();assert rect
   touchx=rect['x']+rect['width']*.5;touchy=rect['y']+rect['height']*.5
   cdp=ctx.new_cdp_session(p)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':touchx,'y':touchy,'id':1}]})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':touchx+rect['width']*.35,'y':touchy,'id':1}]})
  p.wait_for_timeout(590)
  if name=='desktop':p.keyboard.up('d')
  else:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  p.wait_for_timeout(65)
  dropped=p.evaluate("()=>({actor:__forge.world.bodies.find(b=>b.id==='scout').x,crate:__forge.world.bodies.find(b=>b.id==='deck-crate').x,z:__forge.world.bodies.find(b=>b.id==='deck-crate').z,support:__forge.world.bodies.find(b=>b.id==='deck-crate').support,grip:__forge.world.grips.scout,events:__forge.world.history.filter(e=>e.type==='grip-released').slice(-2)})")
  assert dropped['crate']>47.0001,(name,dropped)
  assert dropped['grip'] is None,(name,dropped)
  assert dropped['support'] in (None,'ground'),(name,dropped)
  assert dropped['events'] and dropped['events'][-1]['reason']=='edge-lost-support',(name,dropped)
  p.screenshot(path=str(out/f'{name}_after_drop.png'))
  p.wait_for_timeout(1150)
  landed=p.evaluate("()=>({z:__forge.world.bodies.find(b=>b.id==='deck-crate').z,support:__forge.world.bodies.find(b=>b.id==='deck-crate').support})")
  assert landed['support']=='ground',(name,landed)
  p.screenshot(path=str(out/f'{name}_landed.png'))
  # Existing authoring, UI reset, and save should still work.
  p.evaluate("()=>__forge.scenario('przeciaganie')")
  p.evaluate("()=>__forge.runSteps(13,{selected:'player',move:[1,0],ai:false})")
  if name=='desktop':p.keyboard.press('e')
  else:p.locator('#mobile-grip').click(force=True)
  assert p.evaluate('()=>__forge.world.grips.player')=='crate',(name,'K2 grip lost')
  p.evaluate("()=>__forge.runSteps(35,{selected:'player',move:[-1,0],ai:false})")
  gripmove=p.evaluate("()=>({g:__forge.world.grips.player,actor:__forge.world.bodies.find(b=>b.id==='player').x,crate:__forge.world.bodies.find(b=>b.id==='crate').x})")
  assert gripmove['g']=='crate' and gripmove['crate']<43-0.3,(name,gripmove)
  # Actual editor surface: build a wall in empty ground then remove it.
  p.evaluate("()=>__forge.scenario('przeciaganie')")
  p.wait_for_timeout(90)
  loc=p.evaluate("()=>({sx:viewW*.51+(39-cam.x)*scale,sy:viewH*.57+(30.5-cam.y)*scale*.67,rect:(()=>{let r=document.querySelector('#world').getBoundingClientRect();return {x:r.x,y:r.y}})()})")
  target={'x':loc['rect']['x']+loc['sx'],'y':loc['rect']['y']+loc['sy']}
  assert target['x']>12 and target['x']<width-12 and target['y']>65 and target['y']<height-35,(name,target)
  sel='.panel [data-tool="wall"]'
  if name!='desktop':p.locator('#mobile-options').click()
  p.locator(sel).first.click()
  if name=='desktop':p.mouse.click(target['x'],target['y'])
  else:p.touchscreen.tap(target['x'],target['y'])
  walladded=p.evaluate("()=>__forge.world.authored.length")
  assert walladded==1,(name,'authoring click failed',walladded,target,loc)
  sel='.panel [data-tool="erase"]'
  if name!='desktop':p.locator('#mobile-options').click()
  p.locator(sel).first.click()
  if name=='desktop':p.mouse.click(target['x'],target['y'])
  else:p.touchscreen.tap(target['x'],target['y'])
  assert p.evaluate('()=>__forge.world.authored.length')==0,(name,'authoring erase failed')
  # Real file input: export (same API as button) then import into a fresh session.
  saved=p.evaluate('()=>__forge.state()')
  p.locator('#import-world').set_input_files({'name':'test-session.json','mimeType':'application/json','buffer':saved.encode()})
  p.wait_for_timeout(80)
  assert p.evaluate('()=>JSON.parse(__forge.state()).bodies.length')>=5,(name,'import state')
  p.evaluate("()=>__forge.scenario('zagroda')")
  walls=p.evaluate('()=>__forge.world.authored.length'); assert walls>=15,(name,walls)
  stage=p.evaluate("()=>{let c=document.querySelector('#world'),r=c.getBoundingClientRect();return {css:[r.width,r.height],pixels:[c.width,c.height],dpr:devicePixelRatio,controls:!!document.querySelector('#mobile-grip')}}")
  assert abs(stage['pixels'][0]-stage['css'][0]*dpr)<3,(name,stage)
  assert not errors,(name,errors)
  results.append(dict(mode=name,before=before,edge=dropped,land=landed,grip=gripmove,stage=stage,errors=errors))
  ctx.close()
 b.close()
(out/'browser_gameplay.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
