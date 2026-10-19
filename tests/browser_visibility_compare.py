"""Experimental rejection gate: actor-fragment visibility in the actual live Splot.
This is NOT an art/Owner acceptance test or a measurement of physical mobile FPS.
"""
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text(encoding='utf-8')
captures=root/'captures'
captures.mkdir(exist_ok=True)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium',
                               args=['--no-sandbox','--disable-dev-shm-usage'])
    for name,width,height,mobile in [('desktop',1280,800,False),('portrait',393,852,True),('landscape',844,390,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},
                                   is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        page=context.new_page()
        failures=[]
        page.on('pageerror',lambda error:failures.append(str(error)))
        page.set_content(html)
        page.wait_for_function('window.__forge')
        page.evaluate("""() => {
          __forge.scenario('warsztat');
          __forge.pause();
          const b=__forge.world.bodies.find(v=>v.id==='player');
          Object.assign(b,{x:18.55,y:14.55,z:0,support:'ground'});
          cam.x=b.x;cam.y=b.y;
          document.getElementById('viewmode').click(); // auto -> cut
          document.getElementById('viewmode').click(); // cut -> solid
        }""")
        page.wait_for_timeout(150)
        assert page.evaluate('__forge.viewMode')=='solid',name
        state=page.evaluate('__forge.state()')
        before=page.locator('#world').screenshot()
        if mobile:
            page.locator('#mobile-options').tap()
            page.locator('#visibility-preview').tap()
            page.locator('#mobile-close-menu').tap()
        else:
            page.locator('#visibility-preview').click()
        page.wait_for_timeout(150)
        assert page.evaluate('__forge.visibilityPreview') is True,name
        assert page.evaluate('__forge.state()')==state,(name,'A/B view mutated world')
        after=page.locator('#world').screenshot()
        assert not failures,(name,failures)
        if name=='desktop':
            a=Image.open(BytesIO(before)).convert('RGB')
            b=Image.open(BytesIO(after)).convert('RGB')
            diff=ImageChops.difference(a,b)
            bbox=diff.getbbox()
            assert bbox is not None,(name,'visibility preview did not change any visible pixels')
            # A pixel change alone is NOT a proof of correct or attractive depth.
            print('VISIBLE A/B delta bounding box:',bbox)
        (captures/f'visibility_painter_{name}.png').write_bytes(before)
        (captures/f'visibility_fragment_{name}.png').write_bytes(after)
        print(name,'A/B smoke PASS; world unchanged; no JS errors')
        context.close()
    browser.close()
