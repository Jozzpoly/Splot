from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
out=root/'captures'
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
 problems=[];p.on('pageerror',lambda e:problems.append(str(e)))
 p.set_content((root/'Splot_Ciaglosc_GRAJ.html').read_text(),wait_until='load')
 p.wait_for_function('window.__forge')
 p.evaluate("()=>{__forge.scenario('przeslo');__forge.pause()}")
 for who in ['player','scout']:
  p.evaluate('(who)=>__forge.choose(who)',who)
  p.wait_for_timeout(120)
  p.screenshot(path=str(out/f'under_over_{who}.png'))
  print(who,p.evaluate('()=>({selected:__forge.selected,support:__forge.world.bodies.find(b=>b.id===__forge.selected).support})'))
 print('errors',problems)
 assert not problems
 b.close()
