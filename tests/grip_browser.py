from pathlib import Path
from playwright.sync_api import sync_playwright
import json
base=Path(__file__).resolve().parent.parent
out=base/'captures/grip';out.mkdir(parents=True,exist_ok=True)
url=(base/'Splot_Forge_GRAJ.html').as_uri()
results=[]
with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for name,w,h,dpr in [('desktop',1280,800,1),('portrait',375,720,2),('landscape',844,390,2)]:
    ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,has_touch=True,is_mobile=name!='desktop')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((base/'Splot_Forge_GRAJ.html').read_text(),wait_until='load');page.wait_for_function('window.__forge!==undefined')
    page.evaluate('window.__forge.pause()')
    initial=page.evaluate("()=>{const w=__forge.world;return {x:w.bodies.find(b=>b.id==='player').x,c:w.bodies.find(b=>b.id==='crate').x}}")
    page.evaluate("()=>__forge.runSteps(13,{selected:'player',move:[1,0],ai:false})")
    # Actual keyboard press or mobile button, not programmatic grip.
    if name=='desktop':page.keyboard.press('e')
    else:page.locator('#mobile-grip').click(force=True)
    held=page.evaluate("()=>({g:__forge.world.grips.player,actor:__forge.world.bodies.find(b=>b.id==='player').x,crate:__forge.world.bodies.find(b=>b.id==='crate').x})")
    before=page.evaluate("()=>({a:__forge.world.bodies.find(b=>b.id==='player').x,c:__forge.world.bodies.find(b=>b.id==='crate').x})")
    page.evaluate("()=>__forge.runSteps(24,{selected:'player',move:[-1,0],ai:false})")
    after=page.evaluate("()=>({a:__forge.world.bodies.find(b=>b.id==='player').x,c:__forge.world.bodies.find(b=>b.id==='crate').x})")
    assert held['g']=='crate', (name, held, page.locator('#status').inner_text())
    assert after['a'] < before['a']-.4 and after['c']<before['c']-.4,(name,before,after)
    assert abs((after['a']-before['a'])-(after['c']-before['c']))<1e-5,(name,before,after)
    page.screenshot(path=str(out/f'{name}_held.png'))
    viewport=page.evaluate("()=>({canvas:[document.querySelector('#world').width,document.querySelector('#world').height], rect:(()=>{let r=document.querySelector('#world').getBoundingClientRect();return [r.width,r.height]})(),dpr:window.devicePixelRatio})")
    results.append({'name':name,'held':held,'before':before,'after':after,'viewport':viewport,'errors':errors})
    assert not errors,(name,errors)
    page.close();ctx.close()
  browser.close()
(out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
