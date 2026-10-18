"""K2→current screenshot comparison at same authored scenario, not a quality metric."""
from pathlib import Path
import os,sys
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import json
root=Path(__file__).resolve().parent.parent
baseline=Path(os.environ.get('SPLOT_K2_BASELINE','/mnt/data/Splot_K2_Chwyt_i_Materialny_Kontakt/Splot_K2_Chwyt_GRAJ.html'))
if not baseline.is_file():
 print('SKIP — optional historical K2 baseline HTML not found; set SPLOT_K2_BASELINE')
 sys.exit(0)
current=root/'Splot_Ciaglosc_GRAJ.html'
out=root/'captures'
res=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for label,path in [('baseline_K2',baseline),('current',current)]:
  ctx=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1)
  tab=ctx.new_page();errors=[];tab.on('pageerror',lambda e:errors.append(str(e)))
  tab.set_content(path.read_text(),wait_until='load')
  tab.wait_for_function('!!window.__forge')
  tab.evaluate("()=>__forge.scenario('przeciaganie')")
  tab.wait_for_timeout(190)
  info=tab.evaluate('''()=>({bodies:__forge.world.bodies.length, authored:__forge.world.authored.length,
     hasGrip:(typeof __forge.world.grips==='object'), scenarioName:document.querySelector('#scenario')?.value||'unspecified',
     canvas:(()=>{let a=document.getElementById('world').getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height}})()})''')
  tab.screenshot(path=str(out/(label+'_full.png')))
  tab.locator('#world').screenshot(path=str(out/(label+'_canvas.png')))
  assert not errors,(label,errors)
  res.append({'build':label,'info':info,'errors':errors})
  ctx.close()
 browser.close()
for r in res:print(r)
# No binary pixel gate: old visual state may contain moving ambience.
(out/'visual_baseline_compare.json').write_text(json.dumps(res,indent=2))
