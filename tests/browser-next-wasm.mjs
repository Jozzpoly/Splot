// Real Chromium + remote ESM/WebAssembly integration test of the EXACT
// checked-in playable standalone, with no navigation in Owner's Opera.
// This is browser proof (not Owner feel, not real phone, not offline packaging).
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve(process.cwd()),port=18879;
const server=createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+pathname);
  if(!(file===root||file.startsWith(root+sep)))throw Error('outside document root');
  const data=await readFile(file);
  res.setHeader('content-type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.wasm':'application/wasm'}[extname(file)])||'application/octet-stream');
  res.end(data);
 }catch(e){res.statusCode=404;res.end(String(e?.message||e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1280,height:820}});
const rootUrl=`http://127.0.0.1:${port}/src/next/Splot_Next_GRAJ.html`;
let failures=0;
try{
 // Owner's natural entrypoint must not silently enter a different engine
 // than the one this R&D line qualifies. No special query string required.
 const entry=await context.newPage();
 console.log('\nRUN owner entrypoint: standalone GRAJ without physics query');
 await entry.goto(rootUrl,{waitUntil:'domcontentloaded'});
 await entry.waitForFunction(()=>['box3d','legacy-fallback','legacy'].includes(window.__splotNext?.physics),null,{timeout:60000});
 const boot=await entry.evaluate(()=>({
  physics:window.__splotNext.physics,
  status:document.querySelector('#engine-state')?.textContent?.trim(),
  notice:document.querySelector('#notice')?.textContent?.trim()
 }));
 console.log('OWNER ENTRYPOINT',JSON.stringify(boot));
 assert.equal(boot.physics,'box3d','plain GRAJ must start actual Box3D by default');
 assert.match(boot.status||'',/Box3D/i,'visible engine indicator must name actual solver');
 // Creator-facing A/B quality changes are deliberate and reversible;
 // dynamic Box3D world, authoring identity, and pointer-to-world picking
 // must survive a resolution switch without loading a different scene.
 const startWorld=await entry.evaluate(()=>{
  const g=window.__splotNext;
  return {canvas:[document.querySelector('#world').width,document.querySelector('#world').height],
   bodies:g.world.bodies.map(b=>b.id),parts:g.world.scene.elements.map(e=>e.id),scale:g.renderScale};
 });
 const expectedSizes={75:[960,615],50:[640,410],100:[1280,820]};
 for(const percent of [75,50,100]){
  await entry.locator('#quality').click();
  await entry.waitForFunction(p=>window.__splotNext?.renderScale===p/100,percent,{timeout:2000});
  await entry.waitForTimeout(70);
  const fact=await entry.evaluate(()=>{
   const g=window.__splotNext,canvas=document.querySelector('#world');
   return {pixels:[canvas.width,canvas.height],parts:g.world.scene.elements.map(e=>e.id),
    bodies:g.world.bodies.map(b=>b.id),engine:g.physics,scale:g.renderScale};
  });
  console.log('RENDER QUALITY UI',percent,JSON.stringify(fact));
  assert.deepEqual(fact.pixels,expectedSizes[percent],'real backing buffer must resize in place');
  assert.deepEqual(fact.parts,startWorld.parts,'render-only quality cannot rebuild authored world');
  assert.deepEqual(fact.bodies,startWorld.bodies,'render-only quality cannot replace solver bodies');
  assert.equal(fact.engine,'box3d');
 }
 // A reduced-resolution canvas must still pick the correct *world* location,
 // not a pixel-scaled wrong place behind the visible ground.
 await entry.locator('#quality').click();
 await entry.locator('#quality').click(); // now 50%
 await entry.locator('[data-mode="crate"]').click();
 const point=await entry.evaluate(()=>{
  const camera=window.__splotNext.camera,canvas=document.querySelector('#world'),
   p=projectPoint(camera,[9,10,0]),r=canvas.getBoundingClientRect();
  return {x:r.x+p.x/canvas.width*r.width,y:r.y+p.y/canvas.height*r.height};
 });
 await entry.mouse.click(point.x,point.y);
 const crate=await entry.evaluate(()=>window.__splotNext.world.bodies.find(b=>b.id==='crate-2'));
 assert.ok(crate,'world picking must still create a physical crate at 50% image quality');
 assert.ok(Math.hypot(crate.x-9,crate.y-10)<.2,'new physical crate must match the clicked world point');
 console.log('PASS in-world render quality A/B 100/75/50 and physical picking',JSON.stringify(crate));
 await entry.close();
 // Real Owner distribution path: a downloaded single HTML file may be
 // opened directly via file://, not via our localhost development server.
 // Network is still needed for the external ESM/WASM donor.
 const localPage=await context.newPage();
 const fileUrl='file://'+resolve(root,'src/next/Splot_Next_GRAJ.html');
 console.log('\nRUN downloaded standalone opened via file://',fileUrl);
 await localPage.goto(fileUrl,{waitUntil:'domcontentloaded'});
 await localPage.waitForFunction(()=>['box3d','legacy-fallback'].includes(window.__splotNext?.physics),
  null,{timeout:60000});
 const local=await localPage.evaluate(()=>({
  physics:window.__splotNext.physics,
  banner:document.querySelector('#engine-state')?.textContent,
  message:window.__splotNext.physicsMessage
 }));
 console.log('DOWNLOADED HTML FILE',JSON.stringify(local));
 assert.equal(local.physics,'box3d','directly opening downloaded standalone must run real Box3D');
 await localPage.close();
 // If Box3D CDN is unavailable the page must unmistakably disclose the
 // legacy FALLBACK, instead of silently pretending to be the intended game.
 const failed=await context.newPage();
 await failed.route('**/box3d.js@0.1.1/**',route=>route.abort('failed'));
 await failed.goto(rootUrl,{waitUntil:'domcontentloaded'});
 await failed.waitForFunction(()=>window.__splotNext?.physics==='legacy-fallback',null,{timeout:60000});
 const fallback=await failed.evaluate(()=>({
  label:document.querySelector('#engine-state')?.textContent,
  pausedButtonDisabled:document.querySelector('#pause')?.disabled,
  engine:window.__splotNext.physics
 }));
 assert.equal(fallback.engine,'legacy-fallback');
 assert.match(fallback.label||'',/AWARIA.+legacy|AWARIA.+AWARYJNA/);
 assert.equal(fallback.pausedButtonDisabled,false,'fallback cannot leave controls permanently locked');
 console.log('PASS visible failed-Box3D fallback',JSON.stringify(fallback));
 await failed.close();
 // CDN latency is real. Verify that starting the new game cannot silently
 // advance LEGACY physics or accept a build while Box3D is still fetching.
 const gated=await browser.newContext({viewport:{width:1280,height:820}});
 const slow=await gated.newPage();
 let releaseFetch=null;
 let delayed=false;
 await slow.route('**/box3d.js@0.1.1/**',async route=>{
  delayed=true;
  await new Promise(resolve=>{releaseFetch=resolve});
  await route.abort('failed');
 });
 console.log('\nRUN slow Box3D bootstrap: no legacy steps or edits while loading');
 try{
  await slow.goto(rootUrl,{waitUntil:'domcontentloaded'});
  await slow.waitForFunction(()=>window.__splotNext?.physics==='loading-box3d',null,{timeout:8000});
  await slow.waitForTimeout(250);
  assert.ok(delayed,'test MUST intercept actual Box3D network module, not false-positive cache');
  const before=await slow.evaluate(()=>({
   paused:document.querySelector('#pause').disabled,
   physics:window.__splotNext.physics,time:window.__splotNext.world.time,
   bodies:window.__splotNext.world.bodies.length,
   parts:window.__splotNext.world.scene.elements.length
  }));
  await slow.locator('[data-mode="crate"]').click();
  await slow.mouse.click(580,520);
  await slow.locator('#reset').evaluate(el=>el.click());
  await slow.waitForTimeout(220);
  const during=await slow.evaluate(()=>({
   time:window.__splotNext.world.time,
   bodies:window.__splotNext.world.bodies.length,
   parts:window.__splotNext.world.scene.elements.length,
   resetDisabled:document.querySelector('#reset').disabled
  }));
  console.log('BOOTSTRAP HELD',JSON.stringify({before,during}));
  assert.equal(before.physics,'loading-box3d');
  assert.equal(before.paused,true);
  assert.equal(during.resetDisabled,true,'Reset must be disabled during engine loading');
  assert.equal(before.time,0,'simulation time may not elapse on unloaded engine');
  assert.deepEqual({time:during.time,bodies:during.bodies,parts:during.parts},{time:0,bodies:before.bodies,parts:before.parts},
   'held-loading Box3D must not mutate world via simulation or UI building');
  releaseFetch?.();releaseFetch=null;
  await slow.waitForFunction(()=>window.__splotNext?.physics==='legacy-fallback',null,{timeout:12000});
  assert.equal(await slow.locator('#pause').isDisabled(),false,'explicit failed fetch must unlock pause');
  assert.match(await slow.locator('#engine-state').textContent(),/AWARIA/);
  console.log('PASS slow startup remained frozen, then disclosed CDN failure');
 }catch(e){failures++;console.error('FAIL held bootstrap:',String(e));
 }finally{
  releaseFetch?.();
  await gated.close();
 }

 // New R&D default must really be a permissive solver-owned spawn, not a
 // hidden URL opt-in. Explicit legacy remains an honest A/B control.
 for(const [label,suffix,shouldAdd] of [
  ['owner-default','',true],
  ['legacy-control','?admission=legacy',false]
 ]){
  const candidate=await context.newPage();
  await candidate.goto(rootUrl+suffix,{waitUntil:'domcontentloaded'});
  await candidate.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await candidate.locator('#pause').click();
  await candidate.waitForTimeout(900); // let camera follow converge before exact hit test
  await candidate.locator('[data-mode="crate"]').click();
  await candidate.waitForTimeout(80);
  const pixel=await candidate.evaluate(()=>{
   const g=window.__splotNext;
   const q=g.build({id:'admission-wall',kind:'box',
    min:[8,8,0],max:[9,9,1],material:'stone'});
   if(!q.ok)throw Error('wall fixture:'+q.reason);
   g.challenger.syncStatics();
   const c=document.querySelector('#world'),r=c.getBoundingClientRect();
   const p=projectPoint(g.camera,[7.75,8.5,0]);
   return {x:r.x+p.x/c.width*r.width,y:r.y+p.y/c.height*r.height,
    onCanvas:document.elementFromPoint(r.x+p.x/c.width*r.width,r.y+p.y/c.height*r.height)===c};
  });
  assert.equal(pixel.onCanvas,true,label+' click must target actual playable canvas');
  await candidate.mouse.click(pixel.x,pixel.y);
  const actual=await candidate.evaluate(()=>({
   engine:window.__splotNext.physics,
   crates:window.__splotNext.world.bodies.filter(b=>b.kind==='crate').length,
   newCrate:window.__splotNext.world.bodies.find(b=>b.id==='crate-2')??null,
   href:location.href,
   target:document.querySelector('#target').textContent.trim(),
   notice:document.querySelector('#notice').textContent.trim()
  }));
  console.log('NATURAL CRATE ADMISSION',label,JSON.stringify(actual));
  assert.equal(actual.engine,'box3d');
  if(shouldAdd){
   assert.equal(actual.crates,2,'plain GRAJ must accept solver-resolvable partial penetration');
  }else{
   assert.equal(actual.crates,1,'explicit legacy must refuse the same occupied position');
  }
  if(!shouldAdd)assert.match(actual.notice,/occupied/);
  await candidate.close();
 }
 console.log('PASS REAL CHROME natural Box3D admission default and explicit legacy control');
 const legacyPage=await context.newPage();
 console.log('\nRUN deliberate comparison: ?physics=legacy');
 await legacyPage.goto(rootUrl+'?physics=legacy',{waitUntil:'domcontentloaded'});
 const legacy=await legacyPage.evaluate(()=>({
  physics:window.__splotNext?.physics,
  status:document.querySelector('#engine-state')?.textContent?.trim()
 }));
 assert.equal(legacy.physics,'legacy','legacy must be opt-in and testable');
 assert.match(legacy.status||'',/legacy|starsz/i,'legacy mode must be labeled as comparison');
 await legacyPage.close();
 for(const probe of ['material','material-stack','ascent','fall']){
  const page=await context.newPage();
  const jsErrors=[],networkErrors=[];
  page.on('pageerror',e=>jsErrors.push(String(e).slice(0,700)));
  page.on('requestfailed',req=>networkErrors.push({url:req.url().slice(0,240),error:req.failure()?.errorText}));
  const url=rootUrl+`?physics=box3d&probe=${probe}`;
  console.log('\nRUN',probe,url);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  try{
   await page.waitForFunction(()=>window.__splotNext&&
    ['box3d','legacy-fallback'].includes(window.__splotNext.physics)&&
    (window.__splotNext.physicsMessage||window.__splotNext.physics==='legacy-fallback'),
    {timeout:100000});
  }catch(e){console.error('WAIT TIMEOUT:',String(e).slice(0,300));}
  const result=await page.evaluate(()=>{
   const game=window.__splotNext;
   return {engine:game?.physics||'missing',message:game?.physicsMessage||'',
    notice:document.querySelector('#notice')?.textContent||'',
    actor:game?.world?.bodies?.find(b=>b.id==='human')?.support||null,
    elements:game?.world?.scene?.elements?.length??null,
    dynamic:game?.world?.scene?.elements?.filter(e=>e.motionType==='dynamic').length??null};
  });
  console.log('RESULT',probe,JSON.stringify(result));
  if(jsErrors.length)console.error('JS ERRORS',JSON.stringify(jsErrors));
  if(networkErrors.length)console.error('NETWORK FAIL',JSON.stringify(networkErrors.slice(0,8)));
  const pass=result.engine==='box3d'&&result.message.startsWith('PASS / box3d /');
  if(!pass){failures++;console.error('FAIL',probe);await page.screenshot({path:`/tmp/splot-${probe}-FAIL.png`}).catch(()=>{});}
  else console.log('PASS real Chromium / Box3D WASM',probe);
  await page.close();
 }
 // Real UI path: the Owner's editor tools and canvas pointer picking,
 // not debug API mutation nor a pre-authored fixture.
 const page=await context.newPage();
 const runtimeErrors=[];
 page.on('pageerror',e=>runtimeErrors.push(String(e)));
 console.log('\nRUN manual-ui: build elevated box → click to release → click to reanchor');
 await page.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const canvas=page.locator('#world');
 const clickProjected=async(p)=>{
  const projected=await page.evaluate(v=>{
   const c=window.__splotNext.camera;
   const projected=projectPoint(c,v);
   const el=document.querySelector('#world');
   const rect=el.getBoundingClientRect();
   return {x:rect.left+(projected.x/el.width)*rect.width,
    y:rect.top+(projected.y/el.height)*rect.height};
  },p);
  await page.mouse.click(projected.x,projected.y);
  return projected;
 };
 try {
  await page.locator('[data-mode="box"]').click();
  await page.locator('#height').click();
  await page.locator('#height').click(); // 2.4 m above picked ground
  const hit=await clickProjected([10.5,17.2,0]);
  const block=await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10'));
  assert.ok(block&&block.kind==='box','editor click must create block-10');
  assert.ok(block.min[2]>2.3,'editor height selector must elevate actual world geometry');
  await page.locator('[data-mode="material"]').click();
  await clickProjected([(block.min[0]+block.max[0])/2,(block.min[1]+block.max[1])/2,block.max[2]]);
  await page.waitForFunction(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')?.motionType==='dynamic',null,{timeout:3000});
  await page.waitForFunction(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')?.min[2]<.15,null,{timeout:6000});
  const landed=await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10'));
  await clickProjected([(landed.min[0]+landed.max[0])/2,(landed.min[1]+landed.max[1])/2,landed.max[2]]);
  await page.waitForFunction(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')?.motionType==='anchored',null,{timeout:3000});
  const final=await page.evaluate(()=>({part:window.__splotNext.world.scene.elements.find(e=>e.id==='block-10'),
   engine:window.__splotNext.physics,mode:window.__splotNext.mode}));
  const [download]=await Promise.all([
   page.waitForEvent('download'),page.locator('#save').click()
  ]);
  const saved=JSON.parse(await readFile(await download.path(),'utf8'));
  const savedBox=saved.scene?.elements?.find(e=>e.id==='block-10');
  assert.ok(savedBox&&savedBox.motionType==='anchored','saved authoring must preserve final lifecycle');
  assert.ok(Math.abs(savedBox.min[2]-final.part.min[2])<.03,'saved pose must match live anchored geometry');
  // Direct manipulation: an anchored authored block should MOVE rather
  // than create a replacement. Undo/redo and vertical change must preserve
  // the exact same ID and the Box3D anchored body.
  await page.locator('[data-mode="edit"]').click();
  const first=await page.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')));
  const [from,to]=await page.evaluate(e=>{
   const camera=window.__splotNext.camera,canvas=document.querySelector('#world');
   const r=canvas.getBoundingClientRect(),point=[
    (e.min[0]+e.max[0])/2,(e.min[1]+e.max[1])/2,e.max[2]];
   const pixel=pos=>{
    const p=projectPoint(camera,pos);
    return {x:r.left+p.x/canvas.width*r.width,y:r.top+p.y/canvas.height*r.height};
   };
   return [pixel(point),pixel([point[0]+1.1,point[1],point[2]])];
  },first);
  await page.mouse.move(from.x,from.y);
  await page.waitForTimeout(60);
  const overlayPixels=async()=>page.evaluate(()=>{
   const c=document.querySelector('#overlay'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let n=0;for(let i=3;i<p.length;i+=4)if(p[i])n++;
   return n;
  });
  const hoverPixels=await overlayPixels();
  await page.mouse.down();
  await page.waitForTimeout(60);
  const selectedPixels=await overlayPixels();
  assert.ok(selectedPixels>hoverPixels+160,
   'selecting a part must render a persistent geometry outline beyond the hover marker');
  await page.mouse.move(to.x,to.y,{steps:6});
  await page.mouse.up();
  const afterDrag=await page.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')));
  assert.ok(Math.abs(afterDrag.min[0]-first.min[0]-1.1)<.10,'pointer drag must move same part by approx 1.1m');
  assert.equal(afterDrag.id,first.id);
  await page.locator('#undo').click();
  const undone=await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10'));
  assert.deepEqual(undone,first,'undo must restore original geometry');
  await page.locator('#redo').click();
  const redone=await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10'));
  assert.deepEqual(redone,afterDrag,'redo must restore moved geometry');
  await page.locator('#edit-up').click();
  const raised=await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10'));
  assert.ok(Math.abs(raised.min[2]-redone.min[2]-.25)<1e-8,'height nudge changes same part Z');
  assert.equal(raised.id,first.id);
  // Panel orientation and slope must survive the same gesture: shape
  // editing is not allowed to flatten the material support topology.
  const panelBefore=await page.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='footbridge-ramp')));
  const [panelFrom,panelTo]=await page.evaluate(e=>{
   const c=window.__splotNext.camera,el=document.querySelector('#world'),r=el.getBoundingClientRect();
   const pt=[(e.a[0]+e.b[0])/2,(e.a[1]+e.b[1])/2,(e.a[2]+e.b[2])/2];
   const scr=p=>{const v=projectPoint(c,p);return {x:r.left+v.x/el.width*r.width,y:r.top+v.y/el.height*r.height};};
   return [scr(pt),scr([pt[0],pt[1]+.8,pt[2]])];
  },panelBefore);
  console.log('PANEL POINTER TARGET',JSON.stringify(await page.evaluate(q=>{
   const c=window.__splotNext.camera,el=document.querySelector('#world'),rect=el.getBoundingClientRect();
   const px=(q.x-rect.left)/rect.width*el.width,py=(q.y-rect.top)/rect.height*el.height;
   return {screen:q,over:document.elementFromPoint(q.x,q.y)?.id,
    hits:pickPixel(window.__splotNext.world.scene,c,px,py).slice(0,5).map(x=>x.id)};
  },panelFrom)));
  await page.mouse.move(panelFrom.x,panelFrom.y);
  await page.mouse.down();
  await page.mouse.move(panelTo.x,panelTo.y,{steps:6});
  await page.mouse.up();
  const panelAfter=await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='footbridge-ramp'));
  assert.ok(Math.abs(panelAfter.a[1]-panelBefore.a[1]-.8)<.15,'panel drag must translate source A/B rather than replace topology');
  assert.ok(Math.abs((panelAfter.b[2]-panelAfter.a[2])-(panelBefore.b[2]-panelBefore.a[2]))<1e-8);
  await page.locator('#undo').click();
  assert.deepEqual(await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='footbridge-ramp')),
   panelBefore,'panel undo must restore existing deck');
  // Real Q/layer UI acceptance: overlapping parts should be visited ONCE
  // each even though a ray pierces multiple faces on each same solid.
  const fixtures=await page.evaluate(()=>{
   const g=window.__splotNext;
   const front=g.build({id:'cycle-front',kind:'box',min:[8,18,1],max:[12,22,3],material:'stone'});
   const back=g.build({id:'cycle-back',kind:'box',min:[8,18,.5],max:[12,22,1.5],material:'wood'});
   return [front.ok,back.ok];
  });
  assert.deepEqual(fixtures,[true,true]);
  await clickProjected([10,20,3]);
  const target1=await page.locator('#target').textContent();
  assert.match(target1,/cycle-front.*element 1\/2/,'top visible part is first, not each of its faces');
  await page.locator('#layer').click();
  const target2=await page.locator('#target').textContent();
  assert.match(target2,/cycle-back.*element 2\/2/,'Q reaches the occluded second part in one step');
  await page.locator('#layer').click();
  assert.match(await page.locator('#target').textContent(),/cycle-front.*element 1\/2/,
   'Q wraps back to first distinct part');
  console.log('PASS REAL CHROME LAYER CYCLE: intersecting solids each counted once');
  console.log('PASS REAL DESKTOP PANEL EDIT: translation preserves material shape and undo');
  console.log('PASS REAL DESKTOP DIRECT EDIT: anchored box drag → undo → redo → raise with same identity');
  console.log('PASS real pointer/editor Box3D + exported scene JSON:',
   JSON.stringify({screen:hit,part:final.part,engine:final.engine,saveFormat:saved.format}));
 }catch(e){
  failures++;console.error('FAIL real pointer/editor Box3D:',String(e));
  console.error('UI snapshot:',await page.evaluate(()=>({mode:window.__splotNext?.mode,
    physics:window.__splotNext?.physics,
    notice:document.querySelector('#notice')?.textContent,
    parts:window.__splotNext?.world?.scene?.elements?.filter(x=>x.id.startsWith('block-'))})));
  if(runtimeErrors.length)console.error('JS ERRORS',runtimeErrors);
  await page.screenshot({path:'/tmp/splot-manual-ui-FAIL.png'}).catch(()=>{});
 }
 await page.close();
 // Browser-level scene restore. ~132 authored parts and 59 crates are
 // synthetic but match the SHAPE/SCALE of the Owner's private exported world.
 // Do not commit the private raw save into a public test fixture.
 const resumedPage=await context.newPage();
 const reloadErrors=[];resumedPage.on('pageerror',e=>reloadErrors.push(String(e)));
 await resumedPage.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await resumedPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const snapshot=await resumedPage.evaluate(()=>{
   const w=window.__splotNext.world;
   const saved={format:'splot-next-live-research-1',scene:JSON.parse(JSON.stringify(w.scene)),
    bodies:JSON.parse(JSON.stringify(w.bodies)),time:204.43};
   for(let i=0;i<125;i++){
    const z=i===124?4:0, x=3+(i%12)*2.6,y=3+Math.floor(i/12)*2.4;
    saved.scene.elements.push({id:'block-'+(i+10),kind:'box',
     min:[x,y,z],max:[x+1.2,y+1.2,z+1.1],material:'stone',
     ...(i===124?{motionType:'dynamic'}:{})});
   }
   saved.scene.revision=133;
   for(let i=2;i<=59;i++)saved.bodies.push({id:'crate-'+i,kind:'crate',
    x:2.5+(i%11)*2.2,y:2.5+Math.floor(i/11)*2.3,z:0,r:.43,h:.86,
    mass:36,support:'ground',vz:0,yaw:0});
   saved.bodies.find(b=>b.id==='human').x=21;
   saved.bodies.find(b=>b.id==='human').y=16;
   return saved;
  });
  await resumedPage.locator('#load-file').setInputFiles({name:'Splot_Nowy_Rozdzial.json',
   mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});
  await resumedPage.waitForFunction(()=>window.__splotNext?.world?.scene?.elements.length===132,null,{timeout:20000});
  const initial=await resumedPage.evaluate(()=>{
   const g=window.__splotNext;return {parts:g.world.scene.elements.length,
    bodies:g.world.bodies.length,revision:g.world.scene.revision,
    time:g.world.time,dynamic:g.challenger.status.dynamicParts,
    mode:document.querySelector('#pause')?.textContent,
    freshVelocity:g.world.bodies.find(b=>b.id==='human').vz};
  });
  assert.equal(initial.parts,132);assert.equal(initial.bodies,61);
  assert.equal(initial.dynamic,1);assert.equal(initial.revision,133);
  assert.equal(initial.mode,'Uruchom');assert.equal(initial.freshVelocity,0);
  await resumedPage.locator('#pause').click();
  await resumedPage.waitForFunction(()=>window.__splotNext?.world?.time>204.46,null,{timeout:8000});
  await resumedPage.locator('#pause').click();
  await resumedPage.locator('[data-mode="box"]').click();
  const xy=await resumedPage.evaluate(v=>{
   const c=window.__splotNext.camera,p=projectPoint(c,v);
   const el=document.querySelector('#world'),r=el.getBoundingClientRect();
   return {x:r.left+p.x/el.width*r.width,y:r.top+p.y/el.height*r.height};
  },[21,18,0]);
  await resumedPage.mouse.click(xy.x,xy.y);
  const built=await resumedPage.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-135'));
  assert.ok(built,'editor must continue building with no duplicate ID after load');
  const corrupt={...snapshot,bodies:[...snapshot.bodies,snapshot.bodies[0]]};
  await resumedPage.locator('#load-file').setInputFiles({name:'broken.json',
   mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
  await resumedPage.waitForFunction(()=>document.querySelector('#notice')?.textContent?.includes('Nie wczytano świata'),null,{timeout:5000});
  assert.equal(await resumedPage.evaluate(()=>window.__splotNext.world.scene.elements.length),133,
   'malformed import must leave current edited world intact');
  assert.deepEqual(reloadErrors,[],'no runtime exception in imported play');
  console.log('PASS REAL CHROME RESTORE: 132 authored + 61 bodies → Box3D fresh paused → resume → edit → unsafe import rejected');
 }catch(e){
  failures++;console.error('FAIL browser scene restore:',String(e));
  console.error('RESTORE SNAPSHOT',await resumedPage.evaluate(()=>({
   physics:window.__splotNext?.physics,mode:window.__splotNext?.mode,
   elements:window.__splotNext?.world?.scene?.elements.length,
   bodies:window.__splotNext?.world?.bodies.length,
   notice:document.querySelector('#notice')?.textContent,
   errors:document.querySelector('#hud')?.textContent})));
  if(reloadErrors.length)console.error('JS ERRORS',reloadErrors);
  await resumedPage.screenshot({path:'/tmp/splot-restore-FAIL.png'}).catch(()=>{});
 }
 await resumedPage.close();
 // The opt-in camera mode must resolve in the SAME playable WASM game.
 const cameraPage=await context.newPage(),cameraErrors=[];
 cameraPage.on('pageerror',e=>cameraErrors.push(String(e)));
 await cameraPage.goto(rootUrl+'?physics=box3d&camera=seconds',{waitUntil:'domcontentloaded'});
 try{
  await cameraPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await cameraPage.waitForTimeout(250);
  const cameraState=await cameraPage.evaluate(()=>{
   const g=window.__splotNext;
   return {mode:g.profile().cameraMode,rafFrames:g.profile().frames,cam:g.camera.target};
  });
  assert.equal(cameraState.mode,'seconds');
  assert.ok(cameraState.rafFrames>0);
  const prevBuilds=await cameraPage.evaluate(()=>window.__splotNext.visualStats.staticBuilds);
  await cameraPage.waitForTimeout(320);
  assert.equal(await cameraPage.evaluate(()=>window.__splotNext.visualStats.staticBuilds),prevBuilds,
   'static authored geometry must not rebuild just because Chrome draws more frames');
  const revisionEdit=await cameraPage.evaluate(()=>window.__splotNext.build({
   id:'cache-invalidation-check',kind:'box',min:[6,7,1],max:[7,8,2],material:'wood'
  }));
  assert.ok(revisionEdit.ok);
  await cameraPage.waitForFunction(prev=>window.__splotNext.visualStats.staticBuilds>prev,prevBuilds,{timeout:5000});
  assert.ok(cameraState.cam.every(Number.isFinite));
  assert.deepEqual(cameraErrors,[]);
  console.log('PASS REAL CHROME CAMERA A/B: opt-in seconds mode enabled on live Box3D scene');
 }catch(e){failures++;console.error('FAIL CAMERA A/B',String(e));}
 await cameraPage.close();
 // Real desktop pointer + shared picking at both camera elevation limits.
 // The authored part remains distinct from Box3D physical contacts; camera
 // changes must not corrupt selection or per-part undo history.
 const inspect=await context.newPage();
 console.log('\nRUN orbit camera extreme elevation → pick/edit/undo in one world');
 await inspect.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await inspect.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await inspect.locator('#pause').click();
  const r=await inspect.evaluate(()=>{
   return window.__splotNext.build({id:'orbit-inspection-part',kind:'box',
    min:[11,17,0],max:[12.4,18.4,1.7],material:'wood'});
  });
  assert.equal(r.ok,true);
  await inspect.locator('[data-mode="edit"]').click();
  const dragLook=async(yFrom,yTo)=>{
   await inspect.mouse.move(430,yFrom);
   await inspect.mouse.down({button:'right'});
   await inspect.mouse.move(430,yTo,{steps:9});
   await inspect.mouse.up({button:'right'});
   await inspect.waitForTimeout(90);
   return inspect.evaluate(()=>window.__splotNext.camera.elevation);
  };
  const aimed=(id)=>inspect.evaluate(id=>{
   const g=window.__splotNext,box=g.world.scene.elements.find(x=>x.id===id),
    top=[(box.min[0]+box.max[0])/2,(box.min[1]+box.max[1])/2,box.max[2]];
   const q=projectPoint(g.camera,top),el=document.querySelector('#world'),r=el.getBoundingClientRect();
   return {x:r.left+q.x/el.width*r.width,y:r.top+q.y/el.height*r.height};
  },id);
  const rootZ=await inspect.evaluate(()=>window.__splotNext.world.scene.elements.find(x=>x.id==='orbit-inspection-part').min[2]);
  for(const [label,from,to,lo,hi] of [['overhead',380,190,1.42,1.44],['oblique',305,580,.37,.39]]){
   const elev=await dragLook(from,to);
   assert.ok(elev>=lo&&elev<=hi,label+' camera elevation must remain valid');
   const pt=await aimed('orbit-inspection-part');
   assert.ok(pt.x>5&&pt.x<1020&&pt.y>5&&pt.y<810,'target must be in visible canvas');
   await inspect.mouse.move(pt.x,pt.y);
   const target=await inspect.locator('#target').textContent();
   console.log('ELEVATION PICK',JSON.stringify({label,elev,pixel:pt,target}));
   assert.ok(target.includes('orbit-inspection-part'),
    label+' visible part must be pickable from projection after camera pitch orbit');
   await inspect.mouse.click(pt.x,pt.y);
   await inspect.locator('#edit-up').click();
   const raised=await inspect.evaluate(()=>window.__splotNext.world.scene.elements.find(x=>x.id==='orbit-inspection-part').min[2]);
   assert.ok(Math.abs(raised-rootZ-.25)<.02,label+' should modify same material identity');
   await inspect.locator('#undo').click();
   const undid=await inspect.evaluate(()=>window.__splotNext.world.scene.elements.find(x=>x.id==='orbit-inspection-part').min[2]);
   assert.ok(Math.abs(undid-rootZ)<.02,label+' undo must restore material geometry');
  }
  console.log('PASS REAL CHROME camera extreme elevation preserves authored picking and undo');
  await inspect.locator('[data-mode="move"]').click(); // no selected wireframe in A/B captures
  // Disposable intentionally overlapping fixture for visual inspection,
  // not a replay, asset import or representation of the Owner's saved world.
  // Screenshots document real browser rendering at two pitch extremes.
  const visualFixture=await inspect.evaluate(()=>{
   const g=window.__splotNext;
   let created=0;
   for(let i=0;i<80;i++){
    const x=9.4+(i%10)*.72,y=11.3+Math.floor(i/10)*.75;
    const z=(i%6)*.26;
    const result=g.build({id:'visual-inspection-'+i,kind:'box',
     min:[x,y,z],max:[x+.96,y+.99,z+.88+(i%3)*.25],
     material:['stone','wood','steel'][i%3]});
    if(result.ok)created++;
   }
   g.challenger.syncStatics();
   return {created,authored:g.world.scene.elements.length,engine:g.physics};
  });
  assert.equal(visualFixture.created,80);
  await dragLook(575,345);
  await inspect.waitForTimeout(180);
  await inspect.screenshot({path:'/tmp/splot-orbit-overhead.png'});
  await dragLook(290,575);
  await inspect.waitForTimeout(180);
  await inspect.screenshot({path:'/tmp/splot-orbit-oblique.png'});
  console.log('VISUAL FIXTURE SCREENSHOTS',JSON.stringify(visualFixture));
  // The identical synthetic scene rendered through a derived anchored-AABB
  // exterior. Save separately for eye-level comparison with the plain view.
  const ext=await context.newPage();
  await ext.goto(rootUrl+'?physics=box3d&faces=exterior-boxes',{waitUntil:'domcontentloaded'});
  await ext.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await ext.locator('#pause').click();
  const stats=await ext.evaluate(()=>{
   const g=window.__splotNext;
   const extra=g.build({id:'orbit-inspection-part',kind:'box',min:[11,17,0],max:[12.4,18.4,1.7],material:'wood'});
   if(!extra.ok)throw Error('missing shared reference part');
   for(let i=0;i<80;i++){
    const x=9.4+(i%10)*.72,y=11.3+Math.floor(i/10)*.75,z=(i%6)*.26;
    const q=g.build({id:'visual-inspection-'+i,kind:'box',
     min:[x,y,z],max:[x+.96,y+.99,z+.88+(i%3)*.25],
     material:['stone','wood','steel'][i%3]});
    if(!q.ok)throw Error(q.reason);
   }
   g.challenger.syncStatics();
   return {engine:g.physics,count:g.world.scene.elements.length,exterior:g.visualStats.exteriorBoxes};
  });
  assert.equal(stats.exterior,true);
  // Use natural right-mouse drag: same camera endpoints as the plain shot.
  const pitchDrag=async(a,b)=>{
   await ext.mouse.move(430,a);await ext.mouse.down({button:'right'});
   await ext.mouse.move(430,b,{steps:9});await ext.mouse.up({button:'right'});
   await ext.waitForTimeout(170);
  };
  await pitchDrag(380,190);
  await ext.screenshot({path:'/tmp/splot-orbit-exterior-overhead.png'});
  await pitchDrag(305,580);
  await ext.screenshot({path:'/tmp/splot-orbit-exterior-oblique.png'});
  const outer=await ext.evaluate(()=>({stats:window.__splotNext.visualStats,
   engine:window.__splotNext.physics,parts:window.__splotNext.world.scene.elements.length}));
  console.log('EXTERIOR AABB VISUAL A/B',JSON.stringify({stats,outer,baselineParts:visualFixture.authored}));
  assert.equal(outer.parts,visualFixture.authored,'visual A/B must preserve same authored count');
  await ext.close();
 }catch(e){failures++;console.error('FAIL camera extreme picking:',String(e));
  await inspect.screenshot({path:'/tmp/splot-camera-extremes-FAIL.png'}).catch(()=>{});
 }
 await inspect.close();
 // Synthetic touch is NOT a physical phone acceptance. It catches the
 // easier but costly failures: hidden tools, pointer ownership, view clipping.
 const mobile=await browser.newContext({viewport:{width:393,height:852},
  deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const phone=await mobile.newPage();
 const mobileErrors=[];
 phone.on('pageerror',e=>mobileErrors.push(String(e)));
 console.log('\nRUN mobile-touch: menu → elevated block → release via touch');
 await phone.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await phone.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await phone.locator('#mobile-menu').tap();
  await phone.locator('#height').tap();
  await phone.locator('#height').tap();
  await phone.locator('[data-mode="box"]').tap(); // closes menu on selection
  const mobileTapWorld=async(p)=>{
   const xy=await phone.evaluate(v=>{
    const c=window.__splotNext.camera,p=projectPoint(c,v);
    const el=document.querySelector('#world'),r=el.getBoundingClientRect();
    const x=r.left+p.x/el.width*r.width,y=r.top+p.y/el.height*r.height;
    return {x,y,top:document.elementFromPoint(x,y)?.id||document.elementFromPoint(x,y)?.className||'unknown',
      dimensions:[r.width,r.height]};
   },p);
   console.log('TOUCH WORLD',JSON.stringify(xy));
   assert.ok(xy.x>0&&xy.x<393&&xy.y>50&&xy.y<730,'tap location must be inside usable game view');
   await phone.touchscreen.tap(xy.x,xy.y);
  };
  await mobileTapWorld([10.5,17.2,0]);
  const block=await phone.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10'));
  assert.ok(block?.min[2]>2.3,'mobile tap did not build an elevated block');
  await phone.locator('#mobile-menu').tap();
  await phone.locator('[data-mode="material"]').tap();
  await mobileTapWorld([(block.min[0]+block.max[0])/2,(block.min[1]+block.max[1])/2,block.max[2]]);
  await phone.waitForFunction(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')?.motionType==='dynamic',null,{timeout:5000});
  await phone.locator('#mobile-menu').tap();
  assert.ok(await phone.locator('#save').isVisible(),'mobile Save must be accessible');
  assert.ok(await phone.locator('#load').isVisible(),'mobile Load must be accessible');
  const [mobileDownload]=await Promise.all([
   phone.waitForEvent('download'),phone.locator('#save').tap()
  ]);
  const mobileSaved=JSON.parse(await readFile(await mobileDownload.path(),'utf8'));
  assert.equal(mobileSaved.scene.elements.length,8);
  assert.equal(mobileSaved.scene.elements.find(e=>e.id==='block-10')?.motionType,'dynamic');
  const [picker]=await Promise.all([
   phone.waitForEvent('filechooser'),phone.locator('#load').tap()
  ]);
  await picker.setFiles({name:'Splot_Nowy_Rozdzial.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(mobileSaved))});
  await phone.waitForFunction(()=>document.querySelector('#pause')?.textContent==='Uruchom',null,{timeout:8000});
  assert.equal(await phone.evaluate(()=>window.__splotNext.world.scene.elements.length),8);
  // Actual Chromium native touch sequence, not DOM-dispatched PointerEvents:
  // touching a built anchored part while in Edit must drag its original ID.
  await phone.locator('#mobile-menu').tap();
  await phone.locator('[data-mode="box"]').tap();
  await mobileTapWorld([11.5,18.7,0]);
  const anchoredMobile=await phone.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='block-11')));
  assert.ok(anchoredMobile&&anchoredMobile.kind==='box');
  await phone.locator('#mobile-menu').tap();
  await phone.locator('[data-mode="edit"]').tap();
  assert.ok(await phone.locator('#target').isVisible(),'mobile must show targeted part/layer');
  const [touchStart,touchEnd]=await phone.evaluate(e=>{
   const c=window.__splotNext.camera,canvas=document.querySelector('#world'),r=canvas.getBoundingClientRect();
   const xyz=[(e.min[0]+e.max[0])/2,(e.min[1]+e.max[1])/2,e.max[2]];
   const project=p=>{const a=projectPoint(c,p);return {x:r.left+a.x/canvas.width*r.width,y:r.top+a.y/canvas.height*r.height};};
   return [project(xyz),project([xyz[0]+.7,xyz[1],xyz[2]])];
  },anchoredMobile);
  const session=await mobile.newCDPSession(phone);
  const finger=(x,y)=>[{x,y,id:9}];
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:finger(touchStart.x,touchStart.y)});
  for(let step=1;step<=5;step++){
   const t=step/5;
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:finger(
    touchStart.x+(touchEnd.x-touchStart.x)*t,touchStart.y+(touchEnd.y-touchStart.y)*t)});
  }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const draggedMobile=await phone.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-11'));
  assert.ok(Math.abs(draggedMobile.min[0]-anchoredMobile.min[0]-.7)<.12,
   'native mobile pointer drag must move an existing anchored part');
  console.log('PASS synthetic native mobile TOUCH DRAG / stable authored ID:',draggedMobile.id);
  console.log('PASS synthetic mobile touch / Box3D edit → save download → native file picker → paused restore');
 }catch(e){
  failures++;console.error('FAIL synthetic mobile:',String(e));
  console.error('MOBILE SNAPSHOT',await phone.evaluate(()=>({physics:window.__splotNext?.physics,
   mode:window.__splotNext?.mode,menu:document.body.className,
   blocks:window.__splotNext?.world?.scene?.elements?.filter(x=>x.id.startsWith('block-')),
   viewport:[innerWidth,innerHeight]})));
  if(mobileErrors.length)console.error('JS ERRORS',mobileErrors);
  await phone.screenshot({path:'/tmp/splot-mobile-FAIL.png'}).catch(()=>{});
 }
 await mobile.close();
 // Historical K2 mobile FAIL: one captured joystick finger and a SECOND
 // touch on Chwyt must produce both actor displacement and real grip.
 // This uses CDP native multi-touch, not fabricated JS pointer events.
 const pairContext=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const pairPage=await pairContext.newPage();
 console.log('\nRUN two-finger Box3D: captured joystick + Chwyt');
 await pairPage.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await pairPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const fixture=await pairPage.evaluate(()=>{
   const w=window.__splotNext.world;
   const saved={format:'splot-next-live-research-1',scene:structuredClone(w.scene),bodies:structuredClone(w.bodies),time:0};
   Object.assign(saved.bodies.find(b=>b.id==='human'),{x:13.12,y:15.2,z:0,vz:0,support:'ground'});
   return saved;
  });
  await pairPage.locator('#load-file').setInputFiles({name:'two-finger.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(fixture))});
  await pairPage.waitForFunction(()=>document.querySelector('#pause')?.textContent==='Uruchom',null,{timeout:8000});
  await pairPage.locator('#mobile-menu').tap();
  await pairPage.locator('#pause').tap();
  await pairPage.locator('#mobile-menu').tap();
  const positions=await pairPage.evaluate(()=>{
   const center=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};
   const stick=center('#joystick'),grip=center('.touch-action button:first-child');
   return {stick:{x:stick.x+24,y:stick.y},grip};
  });
  const initial=await pairPage.evaluate(()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x);
  const session=await pairContext.newCDPSession(pairPage);
  const p1={...positions.stick,id:31},p2={...positions.grip,id:32};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p1]});
  await pairPage.waitForTimeout(180);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p1,p2]});
  await pairPage.waitForTimeout(240);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[p1]});
  await pairPage.waitForTimeout(100);
  const actual=await pairPage.evaluate(()=>{
   const w=window.__splotNext.world;
   return {x:w.bodies.find(b=>b.id==='human').x,grip:w.grip,events:w.events.filter(e=>e.type==='grip').length};
  });
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  console.log('TWO-FINGER',JSON.stringify({initial,actual}));
  assert.ok(actual.x>initial+.02,'first finger must move Box3D human');
  assert.equal(actual.grip,'crate-1','second finger must grip actual crate during joystick hold');
  assert.ok(actual.events>0,'world must register grip in physical sim');
  console.log('PASS REAL CHROME two-finger Box3D joystick + grip');
  await pairPage.locator('.touch-action button:first-child').tap();
  assert.equal(await pairPage.evaluate(()=>window.__splotNext.world.grip),null,
   'a single touch must release exactly once, not release+regrab');
  // Free-look in Ruch mode: camera should turn by swiping the WORLD canvas.
  // A phone must not require opening the editor rail to inspect a structure.
  const originalYaw=await pairPage.evaluate(()=>window.__splotNext.camera.azimuth);
  const pointBefore={x:168,y:410,id:78},pointAfter={x:285,y:410,id:78};
  const hitTarget=await pairPage.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,pointBefore);
  assert.equal(hitTarget,'world','test pointer must really start on live canvas');
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pointBefore]});
  for(let n=1;n<=5;n++){
   const x=pointBefore.x+(pointAfter.x-pointBefore.x)*n/5;
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:pointBefore.y,id:78}]});
  }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await pairPage.waitForTimeout(70);
  const newYaw=await pairPage.evaluate(()=>window.__splotNext.camera.azimuth);
  console.log('MOBILE CANVAS FREE LOOK',JSON.stringify({originalYaw,newYaw}));
  assert.ok(Math.abs(newYaw-originalYaw)>.3,
   'touch drag in movement mode must rotate camera without opening tools');
  console.log('PASS REAL CHROME native touch free-look over world canvas');
  // Vertical visual inspection should be as natural as horizontal orbit.
  // Real CDP finger, not changing any internal camera state from the test.
  const elevationBefore=await pairPage.evaluate(()=>window.__splotNext.camera.elevation);
  const tiltStart={x:172,y:388,id:84};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[tiltStart]});
  for(let n=1;n<=6;n++){
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',
    touchPoints:[{x:tiltStart.x,y:tiltStart.y-19*n,id:84}]});
  }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await pairPage.waitForTimeout(70);
  const elevationAfter=await pairPage.evaluate(()=>window.__splotNext.camera.elevation);
  console.log('MOBILE CAMERA ELEVATION',JSON.stringify({elevationBefore,elevationAfter}));
  assert.ok(elevationAfter>elevationBefore+.25,
   'vertical touch drag on world canvas should raise view toward top-down');
  assert.ok(elevationAfter<1.48,'vertical camera should not reach invalid projection poles');
  console.log('PASS REAL CHROME touch camera vertical orbit');
  // The full pitch range must be bounded (not just initial swipe response).
  // This protects shared render/picking camera projection from singularities.
  const sweep=async(fromY,toY,id)=>{
   const from={x:175,y:fromY,id};
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
   for(let k=1;k<=12;k++)await session.send('Input.dispatchTouchEvent',
    {type:'touchMove',touchPoints:[{x:175,y:fromY+(toY-fromY)*k/12,id}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await pairPage.waitForTimeout(35);
   return pairPage.evaluate(()=>window.__splotNext.camera.elevation);
  };
  const low=await sweep(270,725,86);
  const high=await sweep(600,165,87);
  console.log('MOBILE CAMERA LIMITS',JSON.stringify({low,high}));
  assert.ok(low>=.38-1e-4&&low<=.39,'camera tilt must stop well before horizontal ray singularity');
  assert.ok(high>=1.42&&high<=1.43+1e-4,'camera tilt must stop before vertical projection pole');
  console.log('PASS native touch orbit pitch clamps at both extremes');
  // Stronger real-gesture contract: moving with the captured joystick
  // while a second independent finger rotates the live camera.
  const simultaneousBefore=await pairPage.evaluate(()=>{
   const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
   return {x:h.x,y:h.y,yaw:g.camera.azimuth};
  });
  const worldFinger={x:165,y:390,id:83},stickFinger={...positions.stick,id:82};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stickFinger]});
  await pairPage.waitForTimeout(140);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stickFinger,worldFinger]});
  for(let n=1;n<=6;n++){
   const dragged={...worldFinger,x:worldFinger.x+n*16};
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[stickFinger,dragged]});
  }
  await pairPage.waitForTimeout(180);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[stickFinger]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await pairPage.waitForTimeout(60);
  const simultaneousAfter=await pairPage.evaluate(()=>{
   const g=window.__splotNext,h=g.world.bodies.find(b=>b.id==='human');
   return {x:h.x,y:h.y,yaw:g.camera.azimuth,engine:g.physics};
  });
  console.log('SIMULTANEOUS PHONE WALK + LOOK',JSON.stringify({simultaneousBefore,simultaneousAfter}));
  assert.equal(simultaneousAfter.engine,'box3d');
  assert.ok(Math.hypot(simultaneousAfter.x-simultaneousBefore.x,
   simultaneousAfter.y-simultaneousBefore.y)>.08,
   'joystick must continue moving physical actor while another finger orbits camera');
  assert.ok(Math.abs(simultaneousAfter.yaw-simultaneousBefore.yaw)>.25,
   'second finger must independently orbit camera while joystick is held');
  console.log('PASS REAL CHROME native 2-finger walk + camera orbit');
  // A narrow phone still has to SHOW which physics is running without
  // covering Ruch or menu affordances. Visual overlap is not a feel test.
  await pairPage.setViewportSize({width:320,height:568});
  await pairPage.waitForTimeout(360);
  const narrow=await pairPage.evaluate(()=>{
   const rect=id=>{
    const el=document.querySelector(id),r=el.getBoundingClientRect();
    return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,text:el.textContent.trim()};
   };
   return {hud:rect('#hud'),engine:rect('#engine-state'),
    menu:rect('#mobile-menu'),mode:rect('#active-mode')};
  });
  const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>0&&
   Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>0;
  console.log('PHONE 320px HEADER GEOMETRY',JSON.stringify(narrow));
  assert.equal(overlap(narrow.engine,narrow.mode),false,
   'mobile active-mode button must not mask visible engine identity');
  assert.equal(overlap(narrow.hud,narrow.mode),false,
   'mobile active-mode button must not collide with world HUD');
  assert.ok(narrow.engine.right<=320,'physics status must remain inside phone viewport');
  console.log('PASS REAL CHROME 320px engine/mode/HUD legibility contract');
 }catch(e){failures++;console.error('FAIL two-finger:',String(e));
  await pairPage.screenshot({path:'/tmp/splot-two-finger-FAIL.png'}).catch(()=>{});
 }
 await pairContext.close();
 // A crate's VISIBLE upper face should be a selectable placement support
 // for another physical crate. Static authored solids must NOT be silently
 // reparented to moving crates by this narrow physical-stacking contract.
 const stackPage=await context.newPage();
 console.log('\nRUN physical crate-on-crate placement through ordinary UI pointer');
 await stackPage.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await stackPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await stackPage.locator('[data-mode="crate"]').click();
  const pixel=await stackPage.evaluate(()=>{
   const w=window.__splotNext.world,c=window.__splotNext.camera,el=document.querySelector('#world');
   const b=w.bodies.find(x=>x.id==='crate-1');
   const p=projectPoint(c,[b.x,b.y,b.z+b.h]),r=el.getBoundingClientRect();
   return {x:r.left+p.x/el.width*r.width,y:r.top+p.y/el.height*r.height};
  });
  await stackPage.mouse.click(pixel.x,pixel.y);
  const created=await stackPage.evaluate(()=>window.__splotNext.world.bodies.find(b=>b.id==='crate-2'));
  console.log('CRATE TOP CLICK',JSON.stringify({pixel,created}));
  assert.ok(created,'clicking crate surface must create second physical crate');
  assert.ok(created.z>.7,'the new physical crate must spawn ON the visible top, not on ground behind');
  await stackPage.evaluate(()=>window.__splotNext.step(120));
  const after=await stackPage.evaluate(()=>window.__splotNext.world.bodies.find(b=>b.id==='crate-2'));
  assert.ok(after.z>.50,'real Box3D contacts must sustain stacked crate after 120 steps');
  console.log('PASS REAL CHROME crate-on-crate direct placement and physical support');
  // Correction loop: an accidentally built physical crate must be removable
  // through the SAME visible part and the normal Erase tool.
  await stackPage.locator('[data-mode="erase"]').click();
  const erasePixel=await stackPage.evaluate(()=>{
   const w=window.__splotNext.world,c=window.__splotNext.camera,el=document.querySelector('#world');
   const b=w.bodies.find(x=>x.id==='crate-2');
   const p=projectPoint(c,[b.x,b.y,b.z+b.h]),r=el.getBoundingClientRect();
   return {x:r.left+p.x/el.width*r.width,y:r.top+p.y/el.height*r.height};
  });
  await stackPage.mouse.click(erasePixel.x,erasePixel.y);
  const afterErase=await stackPage.evaluate(()=>({
   topExists:window.__splotNext.world.bodies.some(b=>b.id==='crate-2'),
   baseExists:window.__splotNext.world.bodies.some(b=>b.id==='crate-1')
  }));
  assert.equal(afterErase.topExists,false,'Erase must remove the selected physical crate, not a scene face behind');
  assert.equal(afterErase.baseExists,true,'Erase must preserve the underlying physical crate');
  console.log('PASS REAL CHROME direct erase of physical crate after stacking');
  // The visible FRONT/SIDE of the same still-live physical crate must not
  // click through to ground or an authored structure during Erase.
  // This is not a whole-scene CSG problem; it is pointer provenance.
  const crateSide=await stackPage.evaluate(()=>{
   const w=window.__splotNext.world,c=window.__splotNext.camera,el=document.querySelector('#world');
   const b=w.bodies.find(x=>x.id==='crate-1');
   const p=projectPoint(c,[b.x,b.y-b.r,b.z+b.h*.42]),r=el.getBoundingClientRect();
   return {x:r.left+p.x/el.width*r.width,y:r.top+p.y/el.height*r.height,
    target:document.elementFromPoint(r.left+p.x/el.width*r.width,r.top+p.y/el.height*r.height)?.id??null};
  });
  console.log('CRATE SIDE PIXEL',JSON.stringify(crateSide));
  await stackPage.mouse.click(crateSide.x,crateSide.y);
  const left=await stackPage.evaluate(()=>({
   crate:window.__splotNext.world.bodies.some(b=>b.id==='crate-1'),
   parts:window.__splotNext.world.scene.elements.length
  }));
  console.log('CRATE SIDE ERASE STATE',JSON.stringify(left));
  assert.equal(left.crate,false,'visible side of dynamic crate must select its real body for Erase');
  assert.equal(left.parts,7,'erase side must not accidentally delete authored geometry behind crate');
  console.log('PASS REAL CHROME crate side selection + erase provenance');
 }catch(e){failures++;console.error('FAIL real crate top:',String(e));
  await stackPage.screenshot({path:'/tmp/splot-crate-top-FAIL.png'}).catch(()=>{});
 }
 await stackPage.close();
 // Cross-type material test: an authored dynamic Box3D solid must land on the
 // separately simulated movable crate, then react to that crate's removal.
 // This specifically challenges "one physical world" beyond crate-on-crate.
 const contactPage=await context.newPage();
 console.log('\nRUN authored dynamic part falls onto mobile crate → remove support');
 await contactPage.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await contactPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const createdPart=await contactPage.evaluate(()=>{
   const g=window.__splotNext,w=g.world,crate=w.bodies.find(b=>b.id==='crate-1');
   const min=[crate.x-.3,crate.y-.3,crate.z+2.0],max=[crate.x+.3,crate.y+.3,crate.z+2.55];
   const built=g.build({id:'physical-workpiece',kind:'box',min,max,material:'wood'});
   const released=g.partMotion('physical-workpiece','dynamic');
   return {built,released,first:min[2],crateZ:crate.z};
  });
  assert.equal(createdPart.built.ok,true);
  assert.equal(createdPart.released.ok,true);
  await contactPage.evaluate(()=>window.__splotNext.step(180));
  const rested=await contactPage.evaluate(()=>{
   const w=window.__splotNext.world;
   const crate=w.bodies.find(b=>b.id==='crate-1');
   const piece=w.scene.elements.find(e=>e.id==='physical-workpiece');
   return {pieceBottom:piece.min[2],crateTop:crate.z+crate.h,
    offsetXY:Math.hypot((piece.min[0]+piece.max[0])/2-crate.x,(piece.min[1]+piece.max[1])/2-crate.y)};
  });
  console.log('DYNAMIC MATERIAL / CRATE CONTACT',JSON.stringify(rested));
  assert.ok(Math.abs(rested.pieceBottom-rested.crateTop)<.20,
   'dynamic authored material must physically land on independent mobile crate body');
  assert.ok(rested.offsetXY<.25,'material must stay above actual crate contact');
  await contactPage.evaluate(()=>{
   const g=window.__splotNext,w=g.world;
   const i=w.bodies.findIndex(b=>b.id==='crate-1');
   w.bodies.splice(i,1);
   g.challenger.syncBodies();
   g.step(180);
  });
  const afterSupport=await contactPage.evaluate(()=>{
   const w=window.__splotNext.world;
   return w.scene.elements.find(e=>e.id==='physical-workpiece').min[2];
  });
  assert.ok(afterSupport<rested.pieceBottom-.5,
   'authored dynamic material must lose support when physical crate is removed');
  console.log('PASS REAL CHROME cross-type Box3D: authored piece → crate support → released');
 }catch(e){failures++;console.error('FAIL cross-type physical support:',String(e));
  await contactPage.screenshot({path:'/tmp/splot-cross-type-FAIL.png'}).catch(()=>{});
 }
 await contactPage.close();
 // Observational research: old circleRect admission is not the same geometry
 // as actual b3CreateBoxShape's square half-extents. No gameplay change here.
 // Inject deliberate cases directly into an isolated REAL solver, including
 // cases the old admission would refuse, to assess stability before policy.
 const admissionCases=[
  {label:'face-tangent-old-rejects',x:7.57,y:8.5,wall:true},
  {label:'corner-penetration-old-accepts',x:7.66,y:7.66,wall:true},
  {label:'coincident-crates-old-accepts',x:14.2,y:15.2,wall:false}
 ];
 for(const cfg of admissionCases){
  const admission=await context.newPage();
  await admission.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
  try{
   await admission.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
   const observation=await admission.evaluate(({label,x,y,wall})=>{
    const g=window.__splotNext,w=g.world;
    if(wall){
     const built=g.build({id:'wall-for-crate-contact',kind:'box',
      min:[8,8,0],max:[9,9,1],material:'stone'});
     if(!built.ok)throw Error('failed static wall '+built.reason);
     g.challenger.syncStatics();
    }
    const id='admission-'+label;
    const initial={x,y,z:0};
    w.bodies.push({id,kind:'crate',x,y,z:0,r:.43,h:.86,mass:36,
     support:null,vz:0,yaw:0});
    g.challenger.syncBodies();
    g.step(180);
    const b=w.bodies.find(q=>q.id===id);
    const base=w.bodies.find(q=>q.id==='crate-1');
    return {
     engine:g.physics,
     after:{x:b.x,y:b.y,z:b.z},
     displacement:Math.hypot(b.x-x,b.y-y,b.z),
     base:wall?null:{x:base.x,y:base.y,z:base.z},
     finite:[b.x,b.y,b.z,base.x,base.y,base.z].every(Number.isFinite)
    };
   },cfg);
   console.log('ACTUAL BOX3D CRATE ADMISSION PRESSURE',cfg.label,JSON.stringify(observation));
   assert.equal(observation.engine,'box3d');
   assert.equal(observation.finite,true,'overlap admission cannot corrupt world into NaN/Infinity');
   assert.ok(observation.displacement<8,'overlap may resolve but may not eject crate across the world');
  }catch(e){
   failures++;console.error('FAIL Box3D admission pressure:',cfg.label,String(e));
  }
  await admission.close();
 }
 // Perceptual provenance: a moving crate in front of an authored part must
 // be the FIRST target for Popraw. Q deliberately reaches the obscured part.
 // The fixture is permissively overlapping, as in the Owner's real builds.
 const occlusionPage=await context.newPage();
 console.log('\nRUN authored edit occluded by physical crate: visible first, Q deeper');
 await occlusionPage.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await occlusionPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await occlusionPage.locator('#pause').click(); // don't displace fixtures through contact
  const fixture=await occlusionPage.evaluate(()=>{
   const g=window.__splotNext,b=g.world.bodies.find(x=>x.id==='crate-1');
   const result=g.build({id:'behind-crate',kind:'box',min:[b.x-.4,b.y-.2,-.10],
    max:[b.x+.4,b.y+.35,1.20],material:'stone'});
   const p=projectPoint(g.camera,[b.x,b.y-b.r,b.z+.42]);
   const el=document.querySelector('#world'),r=el.getBoundingClientRect();
   return {result,pixel:{x:r.left+p.x/el.width*r.width,y:r.top+p.y/el.height*r.height}};
  });
  assert.equal(fixture.result.ok,true);
  await occlusionPage.locator('[data-mode="edit"]').click();
  await occlusionPage.mouse.move(fixture.pixel.x,fixture.pixel.y);
  const visible=await occlusionPage.locator('#target').textContent();
  console.log('OCCLUDED TARGET BEFORE Q',JSON.stringify({fixture,visible}));
  assert.ok(visible.includes('crate-1'),
   'visible physical crate must be foreground target before hidden authored part');
  await occlusionPage.locator('#layer').click();
  const revealed=await occlusionPage.locator('#target').textContent();
  assert.ok(revealed.includes('behind-crate'),
   'explicit Q should reveal hidden authored part without erasing creator freedom');
  console.log('PASS REAL CHROME visible crate occlusion + deliberate deeper authored selection');
 }catch(e){failures++;console.error('FAIL occlusion provenance:',String(e));
  await occlusionPage.screenshot({path:'/tmp/splot-occlusion-FAIL.png'}).catch(()=>{});
 }
 await occlusionPage.close();
 // Integrated creator loop in ONE uninterrupted Box3D scene, using real UI.
 // This is a reproducible causal rehearsal, not a human freeplay rating.
 const loopPage=await context.newPage();
 console.log('\nRUN integrated creator loop: stack → authored build → edit → undo → release → erase');
 await loopPage.goto(rootUrl+'?physics=box3d',{waitUntil:'domcontentloaded'});
 try{
  await loopPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const pixelFor=async(p)=>loopPage.evaluate(v=>{
   const camera=window.__splotNext.camera,el=document.querySelector('#world'),r=el.getBoundingClientRect();
   const pix=projectPoint(camera,v);
   return {x:r.left+pix.x/el.width*r.width,y:r.top+pix.y/el.height*r.height};
  },p);
  const clickAt=async(p)=>{
   const xy=await pixelFor(p);
   await loopPage.mouse.click(xy.x,xy.y);
  };
  await loopPage.locator('[data-mode="crate"]').click();
  await clickAt([7,7,0]);
  const base=await loopPage.evaluate(()=>structuredClone(window.__splotNext.world.bodies.find(b=>b.id==='crate-2')));
  assert.ok(base,'creator must place real crate on ground using canvas');
  await clickAt([base.x,base.y,base.z+base.h]);
  await loopPage.evaluate(()=>window.__splotNext.step(120));
  const upper=await loopPage.evaluate(()=>structuredClone(window.__splotNext.world.bodies.find(b=>b.id==='crate-3')));
  assert.ok(upper?.z>.5,'creator must stack a second dynamic crate physically');
  await loopPage.locator('#height').click();
  await loopPage.locator('#height').click();
  await loopPage.locator('[data-mode="box"]').click();
  await clickAt([10,8,0]);
  const authored=await loopPage.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')));
  assert.ok(authored?.min[2]>2.3,'creator must add high authored material');
  await loopPage.locator('[data-mode="edit"]').click();
  const cx=(authored.min[0]+authored.max[0])/2,cy=(authored.min[1]+authored.max[1])/2,top=authored.max[2];
  const begin=await pixelFor([cx,cy,top]),finish=await pixelFor([cx+.72,cy,top]);
  await loopPage.mouse.move(begin.x,begin.y);
  await loopPage.mouse.down();
  await loopPage.mouse.move(finish.x,finish.y,{steps:7});
  await loopPage.mouse.up();
  const moved=await loopPage.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10').min[0]);
  assert.ok(moved>authored.min[0]+.45,'direct drag must move SAME authored part');
  await loopPage.locator('#undo').click();
  const undone=await loopPage.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10').min[0]);
  assert.ok(Math.abs(undone-authored.min[0])<.02,'undo must restore the original part transform');
  await loopPage.locator('[data-mode="material"]').click();
  await clickAt([cx,cy,top]);
  const dynamic=await loopPage.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')?.motionType);
  assert.equal(dynamic,'dynamic','UI Kotwica must release authored part into real Box3D');
  await loopPage.evaluate(()=>window.__splotNext.step(180));
  const fallen=await loopPage.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-10')?.min[2]);
  assert.ok(fallen<.2,'released authored part must physically fall');
  await loopPage.locator('[data-mode="erase"]').click();
  const fallenTop=await loopPage.evaluate(()=>{
   const e=window.__splotNext.world.scene.elements.find(e=>e.id==='block-10');
   return [(e.min[0]+e.max[0])/2,(e.min[1]+e.max[1])/2,e.max[2]];
  });
  await clickAt(fallenTop);
  assert.equal(await loopPage.evaluate(()=>window.__splotNext.world.scene.elements.some(e=>e.id==='block-10')),
   false,'creator must delete dynamic authored object with scene edit tool');
  const remaining=await loopPage.evaluate(()=>{
   const b=window.__splotNext.world.bodies.find(b=>b.id==='crate-3');
   return [b.x,b.y,b.z+b.h];
  });
  await clickAt(remaining);
  assert.equal(await loopPage.evaluate(()=>window.__splotNext.world.bodies.some(b=>b.id==='crate-3')),
   false,'creator must erase upper physical crate');
  const lastTop=await loopPage.evaluate(()=>{
   const b=window.__splotNext.world.bodies.find(b=>b.id==='crate-2');
   return [b.x,b.y,b.z+b.h];
  });
  await clickAt(lastTop);
  const end=await loopPage.evaluate(()=>{
   const w=window.__splotNext.world;
   return {engine:window.__splotNext.physics,parts:w.scene.elements.length,
    crates:w.bodies.filter(b=>b.kind==='crate').map(b=>b.id)};
  });
  assert.deepEqual(end.crates,['crate-1'],'same world must retain original crate only');
  assert.equal(end.parts,7,'all temporary authored material must be cleaned');
  console.log('PASS REAL CHROME uninterrupted creator loop',JSON.stringify({base:base.id,upper:upper.id,moved,undone,fallen,end}));
 }catch(e){
  failures++;console.error('FAIL integrated creator loop:',String(e));
  await loopPage.screenshot({path:'/tmp/splot-integrated-FAIL.png'}).catch(()=>{});
 }
 await loopPage.close();
 // In one real playable Box3D session the SAME undo/redo buttons must
 // follow chronological intent across authored shapes and dynamic crates.
 // No reset, no silent snapshot rewind, no hidden separate crate-history UI.
 const historyPage=await context.newPage();
 console.log('\nRUN mixed chronological history through actual UI and moving Box3D crates');
 await historyPage.goto(rootUrl,{waitUntil:'domcontentloaded'});
 try{
  await historyPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await historyPage.locator('#pause').click();
  await historyPage.waitForTimeout(250);
  const click=async point=>{
   const {x,y}=await historyPage.evaluate(point=>{
    const g=window.__splotNext,c=document.querySelector('#world'),r=c.getBoundingClientRect(),
      pixel=projectPoint(g.camera,point);
    return {x:r.left+pixel.x/c.width*r.width,y:r.top+pixel.y/c.height*r.height};
   },point);
   await historyPage.mouse.click(x,y);
  };
  const state=()=>historyPage.evaluate(()=>{
   const g=window.__splotNext;
   return {physics:g.physics,
    crates:g.world.bodies.filter(b=>b.kind==='crate').map(b=>({id:b.id,x:b.x,y:b.y,z:b.z,h:b.h})),
    parts:g.world.scene.elements.map(p=>p.id),
    canUndo:!document.querySelector('#undo').disabled,
    canRedo:!document.querySelector('#redo').disabled,
    grip:g.world.grip
   };
  });
  await historyPage.locator('[data-mode="box"]').click();
  await click([9.3,9.0,0]);
  assert.equal((await state()).parts.includes('block-10'),true,'user creates authored part');
  await historyPage.locator('[data-mode="crate"]').click();
  await click([7.2,7.0,0]);
  assert.equal((await state()).crates.some(b=>b.id==='crate-2'),true,'user creates crate after authored part');
  await historyPage.locator('#undo').click();
  assert.equal((await state()).crates.some(b=>b.id==='crate-2'),false,
   'first Undo removes most recent crate without removing authored part');
  assert.equal((await state()).parts.includes('block-10'),true);
  await historyPage.locator('#undo').click();
  assert.equal((await state()).parts.includes('block-10'),false,
   'second Undo removes chronologically earlier authored part');
  assert.equal((await state()).canRedo,true);
  await historyPage.locator('#redo').click();
  assert.equal((await state()).parts.includes('block-10'),true,
   'first Redo restores authored part in same world');
  await historyPage.locator('#redo').click();
  assert.equal((await state()).crates.some(b=>b.id==='crate-2'),true,
   'second Redo restores crate-2 without resetting solver');
  const low=(await state()).crates.find(b=>b.id==='crate-2');
  await click([low.x,low.y,low.z+low.h]);
  await historyPage.evaluate(()=>window.__splotNext.step(120));
  const top=(await state()).crates.find(b=>b.id==='crate-3');
  assert.ok(top?.z>.5,'solver must support a second crate after history redo');
  await historyPage.locator('[data-mode="erase"]').click();
  await click([top.x,top.y,top.z+top.h]);
  const erased=await state();
  assert.equal(erased.crates.some(b=>b.id==='crate-3'),false,'eraser deletes physical upper crate');
  assert.equal(erased.crates.some(b=>b.id==='crate-2'),true,'lower crate remains');
  await historyPage.locator('#undo').click();
  const restored=await state();
  assert.equal(restored.crates.some(b=>b.id==='crate-3'),true,
   'Undo of Delete recreates upper body in the real solver');
  assert.ok(Math.abs(restored.crates.find(b=>b.id==='crate-3').z-top.z)<.1,
   'restored body must use deletion-time pose, not original spawn or reset');
  await historyPage.evaluate(()=>window.__splotNext.step(100));
  const live=await state();
  assert.ok(live.crates.find(b=>b.id==='crate-3').z>.45,
   'restored crate should physically settle on still-live lower crate');
  await historyPage.locator('#redo').click();
  const final=await state();
  assert.equal(final.crates.some(b=>b.id==='crate-3'),false,
   'Redo of Delete must remove currently moving crate by ID');
  assert.equal(final.crates.some(b=>b.id==='crate-2'),true);
  assert.equal(final.parts.includes('block-10'),true);
  assert.equal(final.crates.length,2,'original and lower crate are the only survivors');
  console.log('PASS REAL CHROME one chronological Undo/Redo across authored part and live crates',
   JSON.stringify({top,restored:restored.crates.find(b=>b.id==='crate-3'),final}));
 }catch(e){
  failures++;console.error('FAIL mixed creator history:',String(e));
  await historyPage.screenshot({path:'/tmp/splot-mixed-history-FAIL.png'}).catch(()=>{});
 }
 await historyPage.close();
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
assert.equal(failures,0,`${failures} actual browser Box3D scenarios failed`);
