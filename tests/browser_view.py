from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
import json
root=Path(__file__).resolve().parent.parent
out=root/'captures';results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,width,height,dpr in [('desktop',1280,800,1),('portrait',375,720,2),('landscape',844,390,2)]:
  ctx=b.new_context(viewport={'width':width,'height':height},device_scale_factor=dpr,is_mobile=name!='desktop',has_touch=True)
  p=ctx.new_page();err=[];p.on('pageerror',lambda e:err.append(str(e)))
  p.set_content((root/'Splot_Ciaglosc_GRAJ.html').read_text());p.wait_for_function('window.__forge!==undefined')
  p.evaluate("()=>{__forge.scenario('przeslo');__forge.choose('scout');__forge.pause()}")
  p.wait_for_timeout(125)
  baseline=p.evaluate('()=>__forge.state()');assert p.evaluate('()=>__forge.viewMode')=='auto'
  p.locator('#world').screenshot(path=str(out/f'{name}_view_auto.png'))
  if name=='desktop':p.locator('#viewmode').click()
  else:p.locator('#mobile-view').tap()
  p.wait_for_timeout(110)
  assert p.evaluate('()=>__forge.viewMode')=='cut',(name,'wrong view')
  assert p.evaluate('()=>__forge.state()')==baseline,(name,'render toggled world state')
  p.locator('#world').screenshot(path=str(out/f'{name}_view_cutaway.png'))
  a=Image.open(out/f'{name}_view_auto.png').convert('RGB')
  c=Image.open(out/f'{name}_view_cutaway.png').convert('RGB')
  if a.size!=c.size: raise AssertionError(('resize',name,a.size,c.size))
  import numpy as np
  aa=np.asarray(a).astype('int16');cc=np.asarray(c).astype('int16')
  ratio=float((abs(aa-cc).max(axis=2)>12).mean());assert ratio>.01,(name,ratio)
  if name=='desktop':p.locator('#viewmode').click()
  else:p.locator('#mobile-view').tap()
  assert p.evaluate('()=>__forge.viewMode')=='solid'
  assert p.evaluate('()=>__forge.state()')==baseline
  assert not err,(name,err)
  results.append({'name':name,'changed_pixel_ratio':round(ratio,4),'modes':['auto','cut','solid'],'world_unchanged':True,'errors':err})
  ctx.close()
 b.close()
(out/'view_results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
print(json.dumps(results,indent=2,ensure_ascii=False))
