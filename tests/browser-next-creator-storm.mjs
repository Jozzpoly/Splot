// Real Chromium + remote ESM/WebAssembly integration test of the EXACT
// checked-in playable standalone, with no navigation in Owner's Opera.
// This is browser proof (not Owner feel, not real phone, not offline packaging).
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve(process.cwd()),port=18881;
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
 // Deliberately messy independent browser-play experiment. 127 rapid UI
 // attempts, inspired by the ORDER and intensity of one Owner session, NOT
 // a replay: the private log has no failed-click coordinates or reasons.
 // Keep the same Box3D world, interleave independent authored objects,
 // rotate viewpoint mid-build and verify that failures do not corrupt it.
 const stormOutcomes=[];
 for(const admission of ['legacy','solver']){
 const storm=await context.newPage();
 console.log('\nRUN 127 UI creator storm admission='+admission);
 await storm.goto(rootUrl+'?admission='+admission,{waitUntil:'domcontentloaded'});
 try{
  await storm.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  assert.equal(await storm.evaluate(()=>new URLSearchParams(location.search).get('admission')),admission,
   'research A/B policy MUST be explicitly selected, independent of changing game defaults');
  const before=await storm.evaluate(()=>({
   time:window.__splotNext.world.time,
   bodies:window.__splotNext.world.bodies.length,
   parts:window.__splotNext.world.scene.elements.length
  }));
  const sectors={};
  const rejections={},rejectionTargets={};
  let cratePass=0,crateFail=0,authoredPass=0,offscreen=0;
  const worldPixel=point=>storm.evaluate(point=>{
   const g=window.__splotNext,canvas=document.querySelector('#world'),r=canvas.getBoundingClientRect();
   const projected=projectPoint(g.camera,point);
   const x=r.left+projected.x/canvas.width*r.width,y=r.top+projected.y/canvas.height*r.height;
   const node=document.elementFromPoint(x,y);
   return {x,y,pixelInside:x>=r.left+10&&x<r.right-10&&y>=r.top+10&&y<r.bottom-10,
    onCanvas:node===canvas||node?.id==='overlay'};
  },point);
  for(let i=0;i<127;i++){
   // Four working areas: known body; ramp; dense new structure; free ground.
   const sector=Math.floor(i/32),ix=i%32;
   let x,y;
   if(sector===0){x=13.75+(ix%8)*.18;y=14.7+Math.floor(ix/8)*.19;}
   else if(sector===1){x=12+(ix%8)*.66;y=11.2+Math.floor(ix/8)*.62;}
   else if(sector===2){x=7.3+(ix%8)*.48;y=9.7+Math.floor(ix/8)*.55;}
   else{x=7.1+(ix%8)*1.27;y=17.0+Math.floor(ix/8)*1.05;}
   const sectorLabel=['near-live-crate','across-ramp','crowded-boxes','open-ground'][sector];
   const createBox=i%9===0;
   await storm.locator('[data-mode="'+(createBox?'box':'crate')+'"]').click();
   const pixel=await worldPixel([x,y,0]);
   if(!pixel.pixelInside||!pixel.onCanvas){offscreen++;continue;}
   await storm.mouse.move(pixel.x,pixel.y);
   const target=(await storm.locator('#target').textContent())?.split(' • ')[0]??'none';
   const prev=await storm.evaluate(()=>({
    crates:window.__splotNext.world.bodies.filter(b=>b.kind==='crate').length,
    parts:window.__splotNext.world.scene.elements.length
   }));
   await storm.mouse.click(pixel.x,pixel.y);
   const after=await storm.evaluate(()=>({
    crates:window.__splotNext.world.bodies.filter(b=>b.kind==='crate').length,
    parts:window.__splotNext.world.scene.elements.length,
    notice:document.querySelector('#notice').textContent.trim()
   }));
   if(createBox){if(after.parts>prev.parts)authoredPass++;continue;}
   if(after.crates>prev.crates)cratePass++;
   else {
    crateFail++;
    const why=after.notice||'no UI message';
    rejections[why]=(rejections[why]||0)+1;
    rejectionTargets[target]=(rejectionTargets[target]||0)+1;
   }
   // Exercise active contacts across bursts rather than a static frozen dump.
   if(i%32===31)await storm.evaluate(()=>window.__splotNext.step(90));
   if(i===63)await storm.locator('#turn-right').click();
  }
  await storm.evaluate(()=>window.__splotNext.step(240));
  const built=await storm.evaluate(()=>({
   engine:window.__splotNext.physics,
   time:window.__splotNext.world.time,
   crates:window.__splotNext.world.bodies.filter(b=>b.kind==='crate').length,
   parts:window.__splotNext.world.scene.elements.length,
   finite:window.__splotNext.world.bodies.every(b=>[b.x,b.y,b.z].every(Number.isFinite)),
   bodyIds:window.__splotNext.world.bodies.map(b=>b.id),
   partIds:window.__splotNext.world.scene.elements.map(e=>e.id),
   render:window.__splotNext.visualStats,
   escaped:window.__splotNext.world.bodies.filter(b=>b.kind==='crate'&&
    (b.x<-.05||b.x>window.__splotNext.world.scene.width+.05||
     b.y<-.05||b.y>window.__splotNext.world.scene.height+.05||b.z<-2||b.z>30)).length,
   minCrateZ:Math.min(...window.__splotNext.world.bodies.filter(b=>b.kind==='crate').map(b=>b.z)),
   maxCrateZ:Math.max(...window.__splotNext.world.bodies.filter(b=>b.kind==='crate').map(b=>b.z))
  }));
  Object.assign(sectors,{admission,cratePass,crateFail,authoredPass,offscreen,rejections,rejectionTargets,before,
   after:{engine:built.engine,time:built.time,crates:built.crates,parts:built.parts,finite:built.finite,escaped:built.escaped,minCrateZ:built.minCrateZ,maxCrateZ:built.maxCrateZ},
   renderer:built.render});
  stormOutcomes.push(sectors);
  console.log('CREATOR UI STORM REPORT',JSON.stringify(sectors));
  assert.equal(built.engine,'box3d');
  assert.ok(cratePass+crateFail>=75,'stress experiment must actually execute many crate clicks');
  assert.ok(cratePass>=12,'experiment must really place dynamic crates through UI');
  assert.ok(authoredPass>=5,'experiment must interleave independently authored elements');
  assert.equal(built.finite,true,'solver must keep every real body finite during creator storm');
  assert.equal(new Set(built.bodyIds).size,built.bodyIds.length);
  assert.equal(new Set(built.partIds).size,built.partIds.length);
  assert.ok(built.time>before.time,'same world must continue physically stepping');
  console.log('PASS REAL CHROME 127-input creator storm classification and live Box3D world');
  // Second frontier: build the approximate authored-content DENSITY of the
  // historical log, then retain and stress the very same solver world.
  // Synthetic shapes, never the Owner's private geometry or click coordinates.
  if(admission==='solver'){
   const baselineForDensity=await storm.evaluate(()=>{
    const g=window.__splotNext,w=g.world;
    let boxes=0,panels=0;
    for(let i=0;i<80;i++){
     const x=6.1+(i%12)*.72,y=7.0+Math.floor(i/12)*1.12,z=(i%7)*.17;
     const q=g.build({id:'synthetic-dense-box-'+i,kind:'box',
      min:[x,y,z],max:[x+.82,y+1.04,z+.9],material:['stone','wood','steel'][i%3]});
     if(!q.ok)throw Error('dense box '+i+': '+q.reason);
     boxes++;
    }
    for(let i=0;i<25;i++){
     const x=8+(i%5)*1.25,y=15+Math.floor(i/5)*.73;
     const q=g.build({id:'synthetic-dense-panel-'+i,kind:'panel',
      a:[x,y,(i%3)*.4],b:[x+1.4,y+.28,.4+(i%3)*.4],
      width:.67,thickness:.15,material:'wood'});
     if(!q.ok)throw Error('dense panel '+i+': '+q.reason);
     panels++;
    }
    g.challenger.syncStatics();
    return {boxes,panels,parts:w.scene.elements.length,crates:w.bodies.filter(b=>b.kind==='crate').length};
   });
   let extraAccepted=0,extraRefused=0,blockedPointers=0;
   for(let i=0;i<64;i++){
    const x=7.3+(i%8)*.55,y=9.0+Math.floor(i/8)*.64;
    await storm.locator('[data-mode="crate"]').click();
    const pix=await worldPixel([x,y,0]);
    if(!pix.onCanvas||!pix.pixelInside){blockedPointers++;continue;}
    const prev=await storm.evaluate(()=>window.__splotNext.world.bodies.length);
    await storm.mouse.click(pix.x,pix.y);
    const count=await storm.evaluate(()=>window.__splotNext.world.bodies.length);
    if(count>prev)extraAccepted++;else extraRefused++;
   }
   await storm.evaluate(()=>window.__splotNext.step(600));
   // Observational metrics only: CI render timing is NOT a frame-rate
   // guarantee for Owner hardware. Sample the real scene at full density.
   await storm.waitForTimeout(800);
   const densePerf=await storm.evaluate(()=>window.__splotNext.profile());
   console.log('DENSE LIVE RENDER PROFILE',JSON.stringify({
    renderer:densePerf.renderer,renderScale:densePerf.renderScale,
    frames:densePerf.frames,raf:densePerf.rafMs,
    draw:densePerf.drawSubmissionCpuMs,geometry:densePerf.geometryCpuMs,
    physics:densePerf.physics,triangles:densePerf.triangles
   }));
   assert.ok(densePerf.frames>0&&densePerf.triangles.median>0,
    'creator-density rehearsal must still produce measurable rendered frames');
   const afterDense=await storm.evaluate(()=>{
    const w=window.__splotNext.world;
    const crates=w.bodies.filter(b=>b.kind==='crate');
    const finite=w.bodies.every(b=>[b.x,b.y,b.z].every(Number.isFinite));
    return {
     time:w.time,engine:window.__splotNext.physics,
     authored:w.scene.elements.length,crates:crates.length,finite,
     escaped:crates.filter(b=>b.x<-.1||b.y<-.1||b.x>w.scene.width+.1||
      b.y>w.scene.height+.1||b.z < -2||b.z>30).length,
     maxHeight:Math.max(...crates.map(b=>b.z+b.h)),
     maxX:Math.max(...crates.map(b=>b.x)),
     maxY:Math.max(...crates.map(b=>b.y))
    };
   });
   console.log('DENSE AUTHORING SOLVER PRESSURE',JSON.stringify({
    baselineForDensity,extraAccepted,extraRefused,blockedPointers,afterDense
   }));
   await storm.screenshot({path:'/tmp/splot-creator-storm-dense-solver.png'});
   assert.equal(baselineForDensity.boxes,80);
   assert.equal(baselineForDensity.panels,25);
   assert.ok(baselineForDensity.parts>=120);
   assert.ok(extraAccepted>=40,'dense world must accept many more real UI crate intents');
   assert.equal(afterDense.engine,'box3d');
   assert.equal(afterDense.finite,true,'long-lived dense world cannot destabilize to nonfinite');
   assert.equal(afterDense.escaped,0,'physical explosion outside bounds would falsify permissive admission');
   console.log('PASS dense authored world + permissive 64 extra crate intents + 600 physical steps');
   // Bounded 64-entry chronological history under sustained Box3D movement.
   // This must remove ONLY the last 64 intentional crate additions and
   // restore them by ID; no rebuilding/reset of the other 113 bodies.
   assert.equal(extraAccepted,64,'full 64-entry history boundary must be populated');
   const sceneBefore=await storm.evaluate(()=>{
    const w=window.__splotNext.world;
    return {time:w.time,parts:w.scene.elements.map(e=>e.id),
     crateIds:w.bodies.filter(b=>b.kind==='crate').map(b=>b.id),
     actors:w.bodies.filter(b=>b.kind!=='crate').map(b=>b.id)};
   });
   for(let i=0;i<64;i++)await storm.locator('#undo').click();
   const afterUndo=await storm.evaluate(()=>{
    const w=window.__splotNext.world;
    return {crates:w.bodies.filter(b=>b.kind==='crate').map(b=>b.id),
     parts:w.scene.elements.map(e=>e.id),
     actors:w.bodies.filter(b=>b.kind!=='crate').map(b=>b.id),
     undoDisabled:document.querySelector('#undo').disabled,
     redoDisabled:document.querySelector('#redo').disabled};
   });
   assert.equal(afterUndo.crates.length,sceneBefore.crateIds.length-64);
   assert.equal(afterUndo.undoDisabled,false,'256-intent history retains earlier construction beyond 64 undos');
   assert.equal(afterUndo.redoDisabled,false);
   assert.deepEqual(afterUndo.parts,sceneBefore.parts);
   assert.deepEqual(afterUndo.actors,sceneBefore.actors);
   for(let i=0;i<64;i++)await storm.locator('#redo').click();
   await storm.evaluate(()=>window.__splotNext.step(180));
   const afterRedo=await storm.evaluate(()=>{
    const w=window.__splotNext.world,cs=w.bodies.filter(b=>b.kind==='crate');
    return {time:w.time,
     crateIds:cs.map(b=>b.id),partIds:w.scene.elements.map(e=>e.id),
     actors:w.bodies.filter(b=>b.kind!=='crate').map(b=>b.id),
     finite:w.bodies.every(b=>[b.x,b.y,b.z].every(Number.isFinite)),
     escaped:cs.filter(b=>b.x<-.1||b.y<-.1||b.x>w.scene.width+.1||
      b.y>w.scene.height+.1||b.z < -2||b.z>30).length,
     undoDisabled:document.querySelector('#undo').disabled,
     redoDisabled:document.querySelector('#redo').disabled};
   });
   console.log('DENSE CREATOR MIXED HISTORY',JSON.stringify({
    before:sceneBefore.crateIds.length,afterUndo:afterUndo.crates.length,
    afterRedo:afterRedo.crateIds.length,finite:afterRedo.finite,
    escaped:afterRedo.escaped,timeBefore:sceneBefore.time,timeAfter:afterRedo.time
   }));
   assert.deepEqual(afterRedo.crateIds,sceneBefore.crateIds,
    'all 64 live crates must restore their original identities/order');
   assert.deepEqual(afterRedo.partIds,sceneBefore.parts);
   assert.deepEqual(afterRedo.actors,sceneBefore.actors);
   assert.equal(afterRedo.finite,true);
   assert.equal(afterRedo.escaped,0);
   assert.equal(afterRedo.redoDisabled,true);
   assert.ok(afterRedo.time>sceneBefore.time,'world timeline must continue, not rewind');
   console.log('PASS dense 64 Undo + 64 Redo against 177 physical crates and 127 authored parts');
   // Owner preflight: exported REAL browser JSON with all dynamic bodies must
   // load into the very same playable app, retain identities and initialize
   // fresh paused Box3D. Do not pretend it is a byte-for-byte physics replay.
   const [savedDownload]=await Promise.all([
    storm.waitForEvent('download',{timeout:12000}),
    storm.locator('#save').click()
   ]);
   const savedBytes=await readFile(await savedDownload.path());
   const saved=JSON.parse(savedBytes.toString('utf8'));
   console.log('DENSE WORLD SAVE',JSON.stringify({
    bytes:savedBytes.length,parts:saved.scene.elements.length,
    crates:saved.bodies.filter(x=>x.kind==='crate').length,time:saved.time
   }));
   assert.equal(saved.scene.elements.length,127);
   assert.equal(saved.bodies.filter(x=>x.kind==='crate').length,177);
   // A valid file is still a DESTRUCTIVE import. Even at Owner density,
   // dismissing the browser confirmation must preserve the full live world,
   // solver and usable creator Undo stack.
   const beforeDecline=await storm.evaluate(()=>{
    const g=window.__splotNext,w=g.world;
    return {parts:w.scene.elements.map(e=>e.id),
     crates:w.bodies.filter(b=>b.kind==='crate').map(b=>b.id),
     actors:w.bodies.filter(b=>b.kind!=='crate').map(b=>b.id),
     canUndo:!document.querySelector('#undo').disabled,
     solver:g.physics,paused:w.paused};
   });
   let declinePrompt='';
   storm.once('dialog',async dialog=>{declinePrompt=dialog.message();await dialog.dismiss();});
   await storm.locator('#load-file').setInputFiles({
    name:'Splot_Nowy_Rozdzial.json',mimeType:'application/json',buffer:savedBytes
   });
   await storm.waitForFunction(()=>document.querySelector('#notice')?.textContent?.includes('Anulowano wczytywanie'),
    null,{timeout:15000});
   assert.match(declinePrompt,/zastąpi.*świat|historię cofania/,
    'even Owner-dense import requires explicit consent');
   const afterDecline=await storm.evaluate(()=>{
    const g=window.__splotNext,w=g.world;
    return {parts:w.scene.elements.map(e=>e.id),
     crates:w.bodies.filter(b=>b.kind==='crate').map(b=>b.id),
     actors:w.bodies.filter(b=>b.kind!=='crate').map(b=>b.id),
     canUndo:!document.querySelector('#undo').disabled,
     solver:g.physics,paused:w.paused};
   });
   assert.deepEqual(afterDecline,beforeDecline,
    'declined import must not replace a dense live world or clear history');
   let acceptPrompt='';
   storm.once('dialog',async dialog=>{acceptPrompt=dialog.message();await dialog.accept();});
   await storm.locator('#load-file').setInputFiles({
    name:'Splot_Nowy_Rozdzial.json',mimeType:'application/json',buffer:savedBytes
   });
   await storm.waitForFunction(()=>window.__splotNext?.world?.scene?.elements.length===127&&
    document.querySelector('#pause')?.textContent==='Uruchom',null,{timeout:30000});
   assert.match(acceptPrompt,/zastąpi.*świat|historię cofania/);
   console.log('PASS DENSE destructive import confirmation: dismiss preserves live scene/history, accept pauses restored world');
   const reopened=await storm.evaluate(()=>{
    const g=window.__splotNext,w=g.world;
    return {parts:w.scene.elements.map(e=>e.id),
     crates:w.bodies.filter(b=>b.kind==='crate').map(b=>b.id),
     actors:w.bodies.filter(b=>b.kind!=='crate').map(b=>b.id),
     paused:w.paused,physics:g.physics,grip:w.grip,
     historyUndoEnabled:!document.querySelector('#undo').disabled,
     historyRedoEnabled:!document.querySelector('#redo').disabled};
   });
   assert.deepEqual(reopened.parts,sceneBefore.parts);
   assert.deepEqual(reopened.crates,sceneBefore.crateIds);
   assert.deepEqual(reopened.actors,sceneBefore.actors);
   assert.equal(reopened.physics,'box3d');
   assert.equal(reopened.paused,true);
   assert.equal(reopened.grip,null);
   assert.equal(reopened.historyUndoEnabled,false,
    'fresh import must not retain commands from a DIFFERENT solver world');
   assert.equal(reopened.historyRedoEnabled,false);
   await storm.locator('#pause').click();
   await storm.evaluate(()=>window.__splotNext.step(120));
   const liveAfterImport=await storm.evaluate(()=>{
    const g=window.__splotNext,w=g.world;
    return {time:w.time,physics:g.physics,
     finite:w.bodies.every(b=>[b.x,b.y,b.z].every(Number.isFinite)),
     count:w.bodies.length};
   });
   assert.equal(liveAfterImport.physics,'box3d');
   assert.equal(liveAfterImport.finite,true);
   assert.equal(liveAfterImport.count,179,'177 crates and original two living actors');
   console.log('PASS DENSE OWNER PRETEST save/download/import/restart',JSON.stringify({
    bytes:savedBytes.length,parts:reopened.parts.length,
    crates:reopened.crates.length,actors:reopened.actors.length,
    after:liveAfterImport
   }));
  }
 }catch(e){failures++;console.error('FAIL 127-input creator storm:',String(e));
  await storm.screenshot({path:'/tmp/splot-creator-storm-FAIL.png'}).catch(()=>{});
 }
 await storm.close();
 }
 assert.equal(stormOutcomes.length,2,'each Box3D policy must run a separate full creator storm');
 assert.ok(stormOutcomes[0].crateFail>=5,
  'legacy-control must demonstrably reject some placements or this is NOT a valid A/B');
 assert.ok(stormOutcomes[1].crateFail<=stormOutcomes[0].crateFail,
  'opt-in solver admission cannot reject MORE than old circle gate for same scripted intents');
 console.log('CREATOR ADMISSION A/B SUMMARY',JSON.stringify(stormOutcomes.map(s=>({
  admission:s.admission,accepted:s.cratePass,refused:s.crateFail,
  authored:s.authoredPass,escaped:s.after.escaped,
  minCrateZ:s.after.minCrateZ,maxCrateZ:s.after.maxCrateZ
 }))));
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
assert.equal(failures,0,`${failures} actual browser Box3D scenarios failed`);
