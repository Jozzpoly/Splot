"""Resize/orientation continuity for the mobile input surface (Chromium emulation)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=b.new_context(viewport={'width':393,'height':852},device_scale_factor=2,is_mobile=True,has_touch=True)
 p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content((root/'Splot_Ciaglosc_GRAJ.html').read_text());p.wait_for_function('window.__forge');p.evaluate('__forge.pause()')
 snap=p.evaluate('__forge.state()')
 for ww,hh in [(393,852),(844,390),(320,568),(393,852)]:
  p.set_viewport_size({'width':ww,'height':hh});p.wait_for_timeout(180)
  x=p.evaluate('''() => {const c=document.querySelector('#world'),r=c.getBoundingClientRect(),j=document.querySelector('#mobile-joystick').getBoundingClientRect();return {h:document.documentElement.scrollHeight,canvasH:r.height,canvasW:r.width,ctrlX:j.left,ctrlY:j.top,ctrlBottom:j.bottom,px:c.height}}''')
  print(ww,hh,x)
  assert x['h']==hh and abs(x['canvasW']-ww)<2 and abs(x['canvasH']-hh)<2,(ww,hh,x)
  assert x['ctrlX']>=0 and x['ctrlY']>=0 and x['ctrlBottom']<=hh+1,(ww,hh,x)
  assert x['px']==hh*2,(ww,hh,x)
  assert p.evaluate('__forge.state()')==snap
 assert not errors,errors
 ctx.close();b.close()
