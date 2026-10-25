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
 // R3 counterexample: follow the actual default human controller around the
 // ramp (via open ground), walk beneath the ORIGINAL deck, then walk out.
 // No actor teleport and no authored synthetic roof in this trial.
 const route=await context.newPage();
 await route.goto(base+'?visibility=player-occlusion',{waitUntil:'domcontentloaded'});
 await route.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 await route.locator('#pause').click();
 const path=await route.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
  const positions=[{stage:'start',xyz:[h.x,h.y,h.z],support:h.support}];
  g.world.paused=false;
  for(const [stage,n,dir] of [
   ['clear-ramp-side',40,[0,1]],
   ['travel-beside-deck',160,[1,0]],
   ['enter-below-deck',45,[0,-1]]
  ]){
   g.step(n,dir);
   positions.push({stage,xyz:[h.x,h.y,h.z],support:h.support});
  }
  g.world.paused=true;
  return positions;
 });
 await route.waitForTimeout(800);
 const under=await route.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human'),
   q=occlusionToPoint(g.world.scene,g.camera,[h.x,h.y,h.z+h.h*.55]);
  return {xyz:[h.x,h.y,h.z],support:h.support,
   blocker:q.blocker?.id||null,visible:q.visible,presence:g.presenceInfo};
 });
 await route.screenshot({path:'/tmp/splot-occlusion-actual-deck.png'});
 report.underDeckRoute={path,under};
 console.log('OCCLUSION ACTUAL DECK',JSON.stringify(report.underDeckRoute));
 assert.ok(under.xyz[0]>18.5&&under.xyz[0]<27.6&&under.xyz[1]>11&&under.xyz[1]<15,
  'R3 route should arrive beneath actual platform in playable world');
 assert.ok(under.xyz[2]<.5,'player must remain BELOW deck rather than walking across top');
 assert.equal(under.blocker,'footbridge-deck',
  'actual bridge should be between camera and player torso');
 assert.equal(under.presence?.blocker,'footbridge-deck',
  'optional cue should report original authored deck, not synthetic roof');
 // Exit the shadow by returning to the open southern edge, without teleport.
 const afterExit=await route.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
  g.world.paused=false;g.step(80,[0,1]);g.world.paused=true;
  return [h.x,h.y,h.z];
 });
 await route.waitForTimeout(450);
 const emerged=await route.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human'),
   o=occlusionToPoint(g.world.scene,g.camera,[h.x,h.y,h.z+h.h*.55]);
  return {xyz:[h.x,h.y,h.z],blockedBy:o.blocker?.id||null,visible:o.visible,presence:g.presenceInfo};
 });
 report.underDeckRoute.afterExit=afterExit;
 report.underDeckRoute.emerged=emerged;
 await route.screenshot({path:'/tmp/splot-occlusion-exit-deck.png'});
 assert.ok(emerged.xyz[1]>15.5&&emerged.visible===true&&!emerged.presence?.occluded,
  'player must regain unaugmented view after physically leaving platform shadow');
 await route.close();
 // Player-facing R3 verification: the same route through actual DOM
 // keyboard input, plus in-game camera controls. No g.step/teleport here.
 const keyboard=await context.newPage();
 await keyboard.goto(base+'?visibility=player-occlusion',{waitUntil:'domcontentloaded'});
 await keyboard.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const move=async(key,test)=>{
  await keyboard.keyboard.down(key);
  try{await keyboard.waitForFunction(test,null,{timeout:9000,polling:100});}
  finally{await keyboard.keyboard.up(key);}
 };
 await move('w',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y>16.4);
 await move('d',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x>22.4);
 await move('s',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y<14.25);
 await keyboard.waitForTimeout(650);
 const keyUnder=await keyboard.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
  const q=occlusionToPoint(g.world.scene,g.camera,[h.x,h.y,h.z+h.h*.55]);
  return {xyz:[h.x,h.y,h.z],support:h.support,rayBlocker:q.blocker?.id||null,
   cue:g.presenceInfo,physics:g.physics};
 });
 report.WASD={under:keyUnder};
 console.log('OCCLUSION WASD UNDER',JSON.stringify(keyUnder));
 assert.equal(keyUnder.physics,'box3d');
 assert.ok(keyUnder.xyz[2]<.5,'WASD should enter below platform, not climb it');
 assert.equal(keyUnder.rayBlocker,'footbridge-deck',
  'WASD and real camera should occlude own player beneath the original platform');
 assert.equal(keyUnder.cue?.blocker,'footbridge-deck');
 await keyboard.screenshot({path:'/tmp/splot-occlusion-WASD-under.png'});
 // Camera rotation changes the real ray while the player stands still.
 await keyboard.locator('#turn-left').click();
 await keyboard.waitForTimeout(450);
 report.WASD.rotated=await keyboard.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
  return {ray:occlusionToPoint(g.world.scene,g.camera,[h.x,h.y,h.z+h.h*.55]).blocker?.id||null,
   cue:g.presenceInfo,xyz:[h.x,h.y,h.z]};
 });
 assert.equal(report.WASD.rotated.cue?.blocker,report.WASD.rotated.ray,
  'camera orbit must update own-player occlusion instead of stale pre-orbit state');
 await keyboard.locator('#turn-right').click();
 await move('w',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y>17);
 await keyboard.waitForTimeout(450);
 report.WASD.emerged=await keyboard.evaluate(()=>{
  const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
  return {xyz:[h.x,h.y,h.z],
   cue:g.presenceInfo,
   ray:occlusionToPoint(g.world.scene,g.camera,[h.x,h.y,h.z+h.h*.55]).blocker?.id||null};
 });
 assert.equal(report.WASD.emerged.ray,null,'WASD exit must expose human');
 assert.equal(report.WASD.emerged.cue?.occluded,false,'cue should disappear after keyboard exit');
 await keyboard.screenshot({path:'/tmp/splot-occlusion-WASD-exit.png'});
 await keyboard.close();
 await writeFile('/tmp/splot-occlusion-ab.json',JSON.stringify(report,null,2));
 console.log('OCCLUSION A/B',JSON.stringify(report));
 console.log('PASS actual Chrome own-presence visual research gated by raycast; ordinary rendering unchanged');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
