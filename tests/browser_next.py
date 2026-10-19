"""The new spatial core must survive actual page input; Playwright is emulation, not Owner approval."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
content=(root/'src/next/Splot_Next_GRAJ.html').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for title,width,height,mobile in [('desktop',1120,720,False),('portrait',393,852,True),('landscape',844,390,True)]:
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(content,wait_until='load')
        page.wait_for_function('window.__splotNext && window.__splotNext.camera')
        assert page.evaluate('__splotNext.world.scene.elements.length')==7
        original=page.evaluate('__splotNext.world.scene.revision')
        if mobile:
            assert not page.evaluate("document.body.classList.contains('menu-open')")
            page.locator('#mobile-menu').tap()
            page.locator('[data-mode="panel"]').tap()
            assert not page.evaluate("document.body.classList.contains('menu-open')")
        else:
            page.locator('[data-mode="panel"]').click()
        assert page.evaluate('__splotNext.mode')=='panel'
        coords=[]
        for xy in [[12.4,17.0,0],[15.0,17.0,0]]:
            pos=page.evaluate('xyz=>projectPoint(__splotNext.camera,xyz)',xy)
            point=page.evaluate('''q=>{const c=document.querySelector('#world'),r=c.getBoundingClientRect();return {x:r.left+q.x*r.width/c.width,y:r.top+q.y*r.height/c.height}}''',pos)
            coords.append(point)
        print(title,'authoring coords',coords)
        for pt in coords:
            assert 2<pt['x']<width-3 and 2<pt['y']<height-3,(title,pt)
            if mobile:page.touchscreen.tap(pt['x'],pt['y'])
            else:page.mouse.click(pt['x'],pt['y'])
        assert page.evaluate('__splotNext.world.scene.elements.length')==8,(title,page.locator('#notice').inner_text())
        assert page.evaluate('__splotNext.world.scene.elements.at(-1).kind')=='panel'
        assert page.evaluate('__splotNext.world.scene.revision')==original+1
        if not mobile:
            page.locator('[data-mode="move"]').click()
            before=page.evaluate('__splotNext.world.bodies[0].x')
            page.keyboard.down('d');page.wait_for_timeout(430);page.keyboard.up('d')
            after=page.evaluate('__splotNext.world.bodies[0].x')
            assert after>before+.1,(before,after)
        else:
            assert page.evaluate('getComputedStyle(document.querySelector("#joystick")).display')!='none'
        page.wait_for_timeout(200)
        assert not errors,(title,errors)
        page.screenshot(path=str(root/f'browser-{title}.png'))
        print(title,'PASS',page.evaluate('__splotNext.renderer'))
        page.close()
    browser.close()
