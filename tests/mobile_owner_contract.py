from pathlib import Path
from playwright.sync_api import sync_playwright
import json
src=(Path(__file__).resolve().parent.parent/'Splot_Ciaglosc_GRAJ.html').read_text()
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,(ww,hh) in [('narrow',(320,568)),('portrait',(393,852)),('landscape',(844,390))]:
  ctx=b.new_context(viewport={'width':ww,'height':hh},device_scale_factor=2,is_mobile=True,has_touch=True)
  p=ctx.new_page();errors=[];p.on('pageerror',lambda e: errors.append(str(e)))
  p.set_content(src);p.wait_for_function('window.__forge');p.wait_for_timeout(150)
  # Menu -> authoring -> tap -> undo -> default movement
  p.locator('#mobile-options').tap();p.locator('.panel [data-tool="wall"]').tap()
  assert p.evaluate("__forge.tool")=='wall'
  assert not p.evaluate("document.body.classList.contains('mobile-menu-open')")
  # Camera-origin safe ground within screen centre; force known scenario to be reproducible
  p.evaluate("__forge.scenario('przeciaganie')")
  p.locator('#mobile-options').tap();p.locator('.panel [data-tool="wall"]').tap()
  pos=p.evaluate('''() => {const r=document.getElementById('world').getBoundingClientRect();return {x:r.x+viewW*.51+(40-cam.x)*scale,y:r.y+viewH*.57+(25-cam.y)*scale*.67}}''')
  assert pos['y']>100 and pos['y']<hh-130,(name,pos)
  p.touchscreen.tap(pos['x'],pos['y'])
  assert p.evaluate('__forge.world.authored.length')==1,(name,pos)
  p.locator('#mobile-options').tap();p.locator('.panel [data-tool="erase"]').tap()
  p.touchscreen.tap(pos['x'],pos['y'])
  assert p.evaluate('__forge.world.authored.length')==0
  p.locator('#mobile-options').tap();p.locator('.panel [data-tool="none"]').tap()
  # Genuine long press & move, then multi-touch action while joystick remains held.
  p.evaluate("__forge.scenario('przeciaganie')")
  p.evaluate("__forge.runSteps(14,{selected:'player',move:[1,0],ai:false})")
  x0=p.evaluate("__forge.world.bodies.find(b=>b.id==='player').x")
  crate0=p.evaluate("__forge.world.bodies.find(b=>b.id==='crate').x")
  assert p.evaluate("!__forge.world.grips.player")
  j=p.locator('#mobile-joystick').bounding_box();a=p.locator('#mobile-grip').bounding_box()
  assert j and a
  cx=j['x']+j['width']/2;cy=j['y']+j['height']/2
  ax=a['x']+a['width']/2;ay=a['y']+a['height']/2
  cdp=ctx.new_cdp_session(p)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx,'y':cy,'id':1}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx+47,'y':cy,'id':1}]})
  p.wait_for_timeout(90)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx+47,'y':cy,'id':1},{'x':ax,'y':ay,'id':2}]})
  p.wait_for_timeout(70)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[{'x':cx+47,'y':cy,'id':1}]})
  p.wait_for_timeout(1100)
  selected=p.evaluate('String(window.getSelection())')
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  x1=p.evaluate("__forge.world.bodies.find(b=>b.id==='player').x")
  crate1=p.evaluate("__forge.world.bodies.find(b=>b.id==='crate').x")
  assert x1 > x0+.2,(name,x0,x1)
  assert crate1 > crate0+.15,(name,'second-finger grip did not move crate',crate0,crate1)
  assert selected=='',(name,selected)
  assert p.evaluate('Math.hypot(__forge.diagnostics.mobileStick.x,__forge.diagnostics.mobileStick.y)')<.01
  # 1-finger long press on stage must not create a selection/menu.
  sx=ww/2;sy=hh*.35
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy,'id':3}]})
  p.wait_for_timeout(900)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  assert p.evaluate('String(window.getSelection())')==''
  assert p.evaluate('document.documentElement.scrollHeight')<=hh+3
  assert not errors,(name,errors)
  results.append(dict(name=name,view=(ww,hh),moved=round(x1-x0,3),crateMoved=round(crate1-crate0,3),edited=True,noSelection=True,scrollHeight=p.evaluate('document.documentElement.scrollHeight'),errors=errors))
  ctx.close()
 b.close()
out=Path(__file__).resolve().parent.parent/'captures/mobile_owner_contract.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))