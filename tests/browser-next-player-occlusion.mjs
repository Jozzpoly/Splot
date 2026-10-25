// Opt-in real-browser R2: one player, one overhead authored material piece.
// Compare unchanged default screen against an experimental own-presence cue.
// An actual screen-space cue is NOT evidence of Owner approval.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18906;
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+sep))throw Error('unsafe-path');
  const body=await readFile(path);
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'}[extname(path)]||'application/octet-stream'));
  res.end(body);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const base='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html';
const report={schema:'splot-player-occlusion-ab-v1',note:'Synthetic real Chrome + Box3D. Only visual evidence; no real Owner feel.'};
try{
 const context=await browser.newContext({viewport:{width:1100,height:740},deviceScaleFactor:1});
 const measure=async enabled=>{
  const page=await context.newPage();
  await page.goto(base+(enabled?'?visibility=player-occlusion':''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await page.locator('#pause').click();
  const state=await page.evaluate(()=>{
   const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
   const before={position:[h.x,h.y,h.z],sceneRevision:g.world.scene.revision,
     bodies:g.world.bodies.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}))};
   // Material over the player, but above the head: contact-free visual roof.
   const added=g.build({id:'synthetic-occlusion-roof',kind:'box',
      min:[h.x-3.5,h.y-3.5,2.3],max:[h.x+3.5,h.y+3.5,2.65],material:'wood'});
   if(!added.ok)throw Error('fixture:'+added.reason);
   g.challenger.syncStatics();
   return {before,added,afterRevision:g.world.scene.revision};
  });
  await page.waitForTimeout(650);
  const opaque=await page.evaluate(()=>{
   const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
   const point=[h.x,h.y,h.z+h.h*.55],occlusion=occlusionToPoint(g.world.scene,g.camera,point);
   const overlay=document.querySelector('#overlay'),data=overlay.getContext('2d').getImageData(0,0,overlay.width,overlay.height).data;
   let n=0;for(let i=3;i<data.length;i+=4)if(data[i])n++;
   return {occlusion:occlusion.blocker?.id||null,visible:occlusion.visible,alphaCount:n,
     cue:g.presenceInfo??null,rev:g.world.scene.revision,
     physics:g.physics,worldParts:g.world.scene.elements.map(e=>e.id)};
  });
  await page.screenshot({path:enabled?'/tmp/splot-occlusion-on.png':'/tmp/splot-occlusion-off.png'});
  let restored=null;
  if(enabled){
   // Real UI action: delete the roof, not a direct mutation of scene.elements.
   await page.locator('[data-mode="erase"]').click();
   const centre=await page.evaluate(()=>{
    const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human'),
     el=document.querySelector('#world'),r=el.getBoundingClientRect(),
     q=projectPoint(g.camera,[h.x,h.y,2.65]);
    return {x:r.left+q.x/el.width*r.width,y:r.top+q.y/el.height*r.height};
   });
   await page.mouse.click(centre.x,centre.y);
   await page.mouse.move(4,4);
   await page.waitForFunction(()=>{
    const g=window.__splotNext;
    return !g.world.scene.elements.some(e=>e.id==='synthetic-occlusion-roof')&&
     g.presenceInfo?.occluded===false;
   },null,{timeout:5000});
   restored=await page.evaluate(()=>{
    const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
    const state=occlusionToPoint(g.world.scene,g.camera,[h.x,h.y,h.z+h.h*.55]);
    return {visible:state.visible,blocker:state.blocker?.id||null,
      worldRevision:g.world.scene.revision,physics:g.physics,
      hasRoof:g.world.scene.elements.some(e=>e.id==='synthetic-occlusion-roof'),
      presence:g.presenceInfo};
   });
   await page.screenshot({path:'/tmp/splot-occlusion-revealed.png'});
  }
  await page.close();
  return {setup:state,visual:opaque,restored};
 };
 const off=await measure(false),on=await measure(true);
 report.off=off;report.on=on;
 assert.equal(on.restored?.visible,true,'erasing the material should expose own player');
 assert.equal(on.restored?.hasRoof,false,'real erase must delete exactly synthetic blocker');
 assert.equal(on.restored?.physics,'box3d','ordinary creator interaction keeps Box3D solver');
 assert.equal(off.visual.occlusion,'synthetic-occlusion-roof','actual ray must find roof');
 assert.equal(on.visual.occlusion,off.visual.occlusion,'same occluder in both variants');
 // The idle boar is autonomous and may move during independent CDN startup.
 // Compare the controlled player's pose and resting physical crate, not boar
 // animation phase: it has no causal relation to this stationary roof ray.
 for(const id of ['human','crate-1']){
  const a=on.setup.before.bodies.find(b=>b.id===id),
   b=off.setup.before.bodies.find(b=>b.id===id);
  assert.ok(a&&b&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-5,
   'same player/resting crate physics for '+id);
 }
 assert.deepEqual(on.visual.worldParts,off.visual.worldParts,'purely visual option cannot change authored parts');
 assert.equal(on.visual.physics,'box3d');
 console.log('OCCLUSION A/B INITIAL',JSON.stringify({off:off.visual,on:on.visual}));
 assert.ok(on.visual.alphaCount>=off.visual.alphaCount+100,
   'RED: an opt-in owned-player occlusion cue should be visible only behind a real blocker');
 // Follow-up control: no overhead blocker -> no cue, to avoid always-on HUD noise.
 const exposed=await context.newPage();
 await exposed.goto(base+'?visibility=player-occlusion',{waitUntil:'domcontentloaded'});
 await exposed.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 await exposed.waitForTimeout(350);
 const clear=await exposed.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human'),
   info=g.presenceInfo??null;
  const oc=occlusionToPoint(g.world.scene,g.camera,[h.x,h.y,h.z+h.h*.55]);
  const px=document.querySelector('#overlay').getContext('2d').getImageData(0,0,
   document.querySelector('#overlay').width,document.querySelector('#overlay').height).data;
  let alphaCount=0;for(let i=3;i<px.length;i+=4)if(px[i])alphaCount++;
  return {occluded:!oc.visible,blocker:oc.blocker?.id,alphaCount,info};
 });
 report.unoccluded=clear;
 assert.ok(clear.alphaCount<50,'No constant own-player cue where actor remains visible');
 await exposed.close();
 // Phone-size real Chrome emulation is not evidence for an actual handset,
 // but must catch overflow and disabled 2D overlay on portrait surfaces.
 const mobileCtx=await browser.newContext({viewport:{width:393,height:852},
  deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const phone=await mobileCtx.newPage();
 await phone.goto(base+'?visibility=player-occlusion',{waitUntil:'domcontentloaded'});
 await phone.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 await phone.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
  g.pause();
  const a=g.build({id:'synthetic-occlusion-roof',kind:'box',
   min:[h.x-3.5,h.y-3.5,2.3],max:[h.x+3.5,h.y+3.5,2.65],material:'wood'});
  if(!a.ok)throw Error('mobile-fixture:'+a.reason);
  g.challenger.syncStatics();
 });
 await phone.waitForFunction(()=>window.__splotNext.presenceInfo?.occluded===true,null,{timeout:3500});
 report.portrait=await phone.evaluate(()=>{
  const g=window.__splotNext,el=document.querySelector('#overlay');
  const px=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  let alpha=0;for(let i=3;i<px.length;i+=4)if(px[i])alpha++;
  return {width:el.width,height:el.height,alpha,solver:g.physics,info:g.presenceInfo,
    hud:document.querySelector('#hud')?.textContent};
 });
 assert.equal(report.portrait.solver,'box3d');
 assert.equal(report.portrait.info.blocker,'synthetic-occlusion-roof');
 assert.ok(report.portrait.alpha>200,'portrait overlay must be present');
 await phone.screenshot({path:'/tmp/splot-occlusion-portrait.png'});
 await mobileCtx.close();
 await writeFile('/tmp/splot-occlusion-ab.json',JSON.stringify(report,null,2));
 console.log('OCCLUSION A/B',JSON.stringify(report));
 console.log('PASS actual Chrome own-presence visual research gated by raycast; ordinary rendering unchanged');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
