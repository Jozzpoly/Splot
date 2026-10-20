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
  await page.mouse.down();
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
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
assert.equal(failures,0,`${failures} actual browser Box3D scenarios failed`);
