// R7: actual mobile build/observe/undo/resume loop. Synthetic authored part
// only. All user interactions are Playwright taps or real CDP touch events.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18921;
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+sep))throw Error('outside-root');
  const bytes=await readFile(path);
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'}[extname(path)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const result={schema:'splot-R7-mobile-loop-v1',intent:'First characterize tool-menu friction without changing product. Not physical phone.',steps:[]};
try{
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const capture=async stage=>{
  const v=await page.evaluate(()=>{
   const g=window.__splotNext,w=g.world;
   return {mode:g.mode,paused:w.paused,parts:w.scene.elements.map(x=>x.id),
    menuOpen:document.body.classList.contains('menu-open'),
    activeModeText:document.querySelector('#active-mode').textContent,
    pauseText:document.querySelector('#pause').textContent,
    floatingPauseExists:!!document.querySelector('#mobile-pause'),
    note:document.querySelector('#notice').textContent};
  });
  result.steps.push({stage,...v});
  await page.screenshot({path:'/tmp/splot-R7-'+stage+'.png'});
  console.log('R7 STEP',JSON.stringify({stage,...v}));return v;
 };
 const enterTool=async name=>{await page.locator('#mobile-menu').tap();await page.locator(name).tap();};
 const begin=await capture('00-fresh');
 assert.equal(begin.mode,'move');assert.equal(begin.paused,false);
 await enterTool('#pause');
 assert.equal((await capture('01-paused')).paused,true);
 await page.locator('[data-mode="box"]').tap();
 const tool=(await capture('02-tool')).mode;assert.equal(tool,'box');
 const ground=await page.evaluate(()=>{
  const g=window.__splotNext,c=document.querySelector('#world'),r=c.getBoundingClientRect();
  for(let y=4;y<28;y+=1.5)for(let x=4;x<38;x+=1.5){
   const p=projectPoint(g.camera,[x,y,0]),cx=r.x+p.x/c.width*r.width,cy=r.y+p.y/c.height*r.height;
   if(cx<35||cx>r.right-40||cy<175||cy>r.bottom-200)continue;
   if(document.elementFromPoint(cx,cy)?.id!=='world')continue;
   const hits=pickPixel(g.world.scene,g.camera,p.x,p.y);
   if(hits[0]?.id==='ground')return {x:cx,y:cy,world:[x,y,0]};
  }
  return null;
 });
 assert.ok(ground,'there must be a visible unobstructed ground point within mobile touch area');
 result.touchPoint=ground;
 await page.touchscreen.tap(ground.x,ground.y);
 assert.ok((await capture('03-built')).parts.includes('block-10'),'actual touch must author block');
 await page.locator('[data-mobile-action="undo"]').tap();
 assert.equal((await capture('04-undo')).parts.includes('block-10'),false);
 await page.locator('[data-mobile-action="redo"]').tap();
 assert.ok((await capture('05-redo')).parts.includes('block-10'));
 // The mobile label is a return-to-move affordance, not a physics toggle.
 await page.locator('#active-mode').tap();
 assert.equal((await capture('06-move')).mode,'move');
 // In baseline, pause requires reopening tool drawer. Count this friction.
 await enterTool('#pause');
 const resumed=await capture('07-resumed');
 assert.equal(resumed.paused,false);
 await page.locator('#mobile-menu').tap();
 const stick=await page.locator('#joystick').boundingBox();
 const start=await page.evaluate(()=>{const b=window.__splotNext.world.bodies.find(b=>b.id==='human');return [b.x,b.y]});
 const input=await context.newCDPSession(page);
 const x=stick.x+stick.width*.5,y=stick.y+stick.height*.5;
 await input.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:21,x,y}]});
 await input.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:21,x:x+30,y}]});
 await page.waitForTimeout(440);
 await input.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await input.detach();
 const end=await page.evaluate(()=>{const b=window.__splotNext.world.bodies.find(b=>b.id==='human');return [b.x,b.y]});
 result.joystickMovement=Math.hypot(end[0]-start[0],end[1]-start[1]);
 assert.ok(result.joystickMovement>.25,'world should respond after mobile build and redo without scene reset');
 await capture('08-live');
 result.mobileMenuOpenings=2;result.physicsToggleAccessibleOnlyThroughMenu=true;
 await writeFile('/tmp/splot-R7-loop.json',JSON.stringify(result,null,2));
 console.log('PASS R7 baseline mobile build→Undo/Redo→move→resume with menu friction evidence',JSON.stringify({ground,joystickMovement:result.joystickMovement,opens:result.mobileMenuOpenings}));
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
