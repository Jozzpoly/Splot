// On-demand REAL Chrome + Box3D. A separate balanced cost experiment.
// Unlike the failing overlap specimen, both variants start from the exact
// same imported, non-penetrating body IDs and authored scene. Measures
// synchronous bridge CPU AND actual browser rAF; not Owner hardware FPS.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18886;
const server=createServer(async(req,res)=>{
 try{
  const filename=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(root+sep))throw Error('outside root');
  const bytes=await readFile(filename);
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'}[extname(filename)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const rootUrl='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?physics=box3d';
const stats=xs=>{
 const sorted=[...xs].sort((a,b)=>a-b);
 return {mean:xs.reduce((a,b)=>a+b,0)/xs.length,
  median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.floor(sorted.length*.95)],
  total:xs.reduce((a,b)=>a+b,0)};
};
try{
 const seed=await browser.newPage({viewport:{width:1280,height:820}});
 let payloads;
 try{
  await seed.goto(rootUrl,{waitUntil:'domcontentloaded'});
  await seed.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await seed.locator('#pause').click();
  payloads=await seed.evaluate(()=>{
   const g=window.__splotNext,w=g.world;
   // Canonical reset: do not inherit actor movement during WASM startup.
   const body=w.bodies.map(b=>({...b}));
   for(const b of body){
    if(b.kind==='human'){b.x=12.2;b.y=14;b.z=0;b.yaw=0;}
    if(b.kind==='boar'){b.x=29;b.y=21;b.z=0;b.yaw=1;}
    b.vz=0;b.support=null;
   }
   const initialScene=structuredClone(w.scene);
   const payload=(scene,bodies)=>({format:'splot-next-live-research-1',
    scene:structuredClone(scene),bodies:structuredClone(bodies),time:0});
   const sparse=payload(initialScene,body);
   for(let i=0;i<176;i++){
    const x=2.5+(i%18)*1.04,y=3+Math.floor(i/18)*1.06;
    body.push({id:'crate-'+(i+2),kind:'crate',x,y,
     z:i%13===0?2.4:0,r:.43,h:.86,mass:36,yaw:0,vz:0,support:null});
   }
   for(let i=0;i<95;i++){
    const x=23+(i%12)*.9,y=3+Math.floor(i/12)*1.0,z=(i%5)*.16;
    const q=g.build({id:'profile-part-'+i,kind:'box',
     min:[x,y,z],max:[x+.7,y+.8,z+.62],material:['wood','stone','steel'][i%3]});
    if(!q.ok)throw Error('bench box '+i+':'+q.reason);
   }
   for(let i=0;i<25;i++){
    const x=23+(i%5)*1.7,y=16+Math.floor(i/5)*.9;
    const q=g.build({id:'profile-panel-'+i,kind:'panel',
     a:[x,y,(i%3)*.2],b:[x+1.2,y+.2,.5+(i%3)*.2],
     width:.6,thickness:.12,material:'wood'});
    if(!q.ok)throw Error('bench panel '+i+':'+q.reason);
   }
   const dense=payload(w.scene,body);
   return {sparse,dense};
  });
  assert.equal(payloads.sparse.scene.elements.length,7);
  assert.equal(payloads.sparse.bodies.length,3);
  assert.equal(payloads.dense.scene.elements.length,127);
  assert.equal(payloads.dense.bodies.length,179);
  assert.equal(payloads.dense.bodies.filter(x=>x.kind==='crate').length,177);
 }finally{await seed.close();}
 const outcomes=[];
 for(const density of ['sparse','dense']){
  for(const substeps of [4,8,4]){
   const page=await browser.newPage({viewport:{width:1280,height:820}});
   try{
    const messages=[];page.on('pageerror',e=>messages.push(String(e)));
    await page.goto(rootUrl+'&substeps='+substeps,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
    assert.equal(await page.evaluate(()=>window.__splotNext.challenger.solverSubsteps),substeps);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#load-file').setInputFiles({name:'Splot_Nowy_Rozdzial.json',
     mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payloads[density]))});
    await page.waitForFunction(()=>document.querySelector('#pause')?.textContent==='Uruchom',
     null,{timeout:30000});
    const cpu=await page.evaluate(()=>{
     const g=window.__splotNext,w=g.world;
     const initial={time:w.time,parts:w.scene.elements.length,
      bodies:w.bodies.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}))};
     const samples=[];w.paused=false;
     for(let i=0;i<600;i++){
      const t=performance.now();
      g.challenger.advance(1/60,[0,0]);
      samples.push(performance.now()-t);
     }
     w.paused=true;
     const escaped=w.bodies.filter(b=>b.kind==='crate'&&(
      b.x<-.1||b.y<-.1||b.x>w.scene.width+.1||b.y>w.scene.height+.1||
      b.z<-2||b.z>30)).map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}));
     return {initial,steps:samples.length,samples,afterTime:w.time,
      finite:w.bodies.every(b=>[b.x,b.y,b.z].every(Number.isFinite)),
      escaped,crates:w.bodies.filter(b=>b.kind==='crate').length};
    });
    assert.equal(cpu.initial.time,0);
    assert.equal(cpu.initial.parts,payloads[density].scene.elements.length);
    assert.equal(cpu.initial.bodies.length,payloads[density].bodies.length);
    const expectedInitial=payloads[density].bodies.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}));
    assert.deepEqual(cpu.initial.bodies,expectedInitial,'CPU profile must start from exact same serialized pose');
    assert.ok(Math.abs(cpu.afterTime-10)<.00001);
    assert.equal(cpu.steps,600);assert.equal(cpu.finite,true);
    assert.equal(cpu.escaped.length,0,'nonpenetrating CPU fixture must remain physically bounded');
    await page.locator('#pause').click();
    await page.evaluate(()=>window.__splotNext.clearProfile());
    await page.waitForTimeout(2400);
    const frames=await page.evaluate(()=>window.__splotNext.profile());
    assert.ok(frames.frames>20&&frames.triangles.median>0,
     'CPU benchmark needs an actually rendered Chrome scene');
    assert.equal(frames.physics.steps>0,true,'rAF benchmark must advance live Box3D');
    assert.deepEqual(messages,[]);
    const report={density,substeps,crates:cpu.crates,parts:cpu.initial.parts,
     initial:cpu.initial,firstSecond:stats(cpu.samples.slice(0,60)),
     wholeTenSeconds:stats(cpu.samples),lastSecond:stats(cpu.samples.slice(-60)),
     browser:{raf:frames.rafMs,geometry:frames.geometryCpuMs,submit:frames.drawSubmissionCpuMs,
      physics:frames.physics,triangles:frames.triangles.median},escapes:cpu.escaped.length};
    outcomes.push(report);
    console.log('BALANCED SUBSTEP COST',JSON.stringify({
     density,substeps,crates:report.crates,parts:report.parts,
     firstSecond:report.firstSecond,wholeTenSeconds:report.wholeTenSeconds,
     lastSecond:report.lastSecond,browser:report.browser,escapes:report.escapes
    }));
   }finally{await page.close();}
  }
 }
 for(const density of ['sparse','dense']){
  const three=outcomes.filter(x=>x.density===density);
  assert.equal(three.length,3);
  assert.deepEqual(three[0].initial,three[1].initial);
  assert.deepEqual(three[0].initial,three[2].initial);
 }
 console.log('PASS BALANCED SUBSTEP COST: 4→8→4 exact fresh scene parity',JSON.stringify(
  outcomes.map(x=>({density:x.density,substeps:x.substeps,
   totalMs:x.wholeTenSeconds.total,firstSecondMs:x.firstSecond.total,
   lastSecondMs:x.lastSecond.total,rafMedian:x.browser.raf.median,
   physRate:x.browser.physics.fixedStepRatePerWallSecond}))));
}finally{await browser.close();await new Promise(r=>server.close(r));}
