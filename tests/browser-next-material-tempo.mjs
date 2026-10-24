// Bounded living-construction experiment. Contrast simultaneous placement
// of 105 anchored solids with one solid per fixed physics tick, both with
// explicit local wake of geometrically overlapping crates. Never changes
// Splot Next defaults or forbids physically problematic constructions.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18889;
const server=createServer(async(req,res)=>{
 try{
  const f=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!f.startsWith(root+sep))throw Error('outside root');
  const bytes=await readFile(f);
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript',
   '.mjs':'text/javascript'}[extname(f)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const uri='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?physics=box3d';
try{
 const seedPage=await browser.newPage();
 let initialSave;
 try{
  await seedPage.goto(uri,{waitUntil:'domcontentloaded'});
  await seedPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  initialSave=await seedPage.evaluate(()=>{
   const w=window.__splotNext.world;
   return {format:'splot-next-live-research-1',scene:structuredClone(w.scene),
    bodies:structuredClone(w.bodies),time:0};
  });
 }finally{await seedPage.close();}
 const reports=[];
 for(const substeps of [4,8]){
  for(const insertion of ['bulk','paced']){
   const page=await browser.newPage({viewport:{width:1120,height:730}});
   try{
    await page.goto(uri+'&substeps='+substeps,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
    page.once('dialog',d=>d.accept());
    await page.locator('#load-file').setInputFiles({name:'Splot_Nowy_Rozdzial.json',
     mimeType:'application/json',buffer:Buffer.from(JSON.stringify(initialSave))});
    await page.waitForFunction(()=>document.querySelector('#pause')?.textContent==='Uruchom',
     null,{timeout:30000});
    const result=await page.evaluate(({substeps,insertion})=>{
     const g=window.__splotNext,w=g.world;
     if(g.challenger.solverSubsteps!==substeps)throw Error('wrong substep count');
     w.paused=false;
     for(let i=0;i<80;i++){
      let x,y;
      if(i===0){x=9.18;y=9.70;}
      else{
       x=5.5+(i%10)*.97;y=5.5+Math.floor(i/10)*.97;
       if(Math.hypot(x-9.18,y-9.70)<1.1){x=30+(i%5)*1.05;y=20+Math.floor(i/5)*1.05;}
      }
      w.bodies.push({id:'crate-'+(200+i),kind:'crate',x,y,z:0,r:.43,h:.86,
       mass:36,support:null,vz:0,yaw:0});
     }
     g.challenger.syncBodies();
     for(let k=0;k<180;k++)g.challenger.advance(1/60,[0,0]);
     const crates=w.bodies.filter(b=>b.kind==='crate');
     const initial=crates.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}));
     const sleepCount=crates.filter(b=>!g.challenger.researchCrateState(b.id).awake).length;
     const authored=[];
     for(let i=0;i<80;i++){
      const x=6.1+(i%12)*.72,y=7.0+Math.floor(i/12)*1.12,z=(i%7)*.17;
      authored.push({id:'research-box-'+i,kind:'box',
       min:[x,y,z],max:[x+.82,y+1.04,z+.9],material:'stone'});
     }
     for(let i=0;i<25;i++){
      const x=8+(i%5)*1.25,y=15+Math.floor(i/5)*.73;
      authored.push({id:'research-panel-'+i,kind:'panel',
       a:[x,y,(i%3)*.4],b:[x+1.4,y+.28,.4+(i%3)*.4],
       width:.67,thickness:.15,material:'wood'});
     }
     const approximateBounds=e=>{
      if(e.kind==='box')return {lo:e.min,hi:e.max};
      // Conservative AABB: intentionally may wake more crates than the panel
      // really touches; not an authoritative panel collision algorithm.
      const m=e.width/2;
      return {lo:[Math.min(e.a[0],e.b[0])-m,
       Math.min(e.a[1],e.b[1])-m,Math.min(e.a[2],e.b[2])-e.thickness],
       hi:[Math.max(e.a[0],e.b[0])+m,Math.max(e.a[1],e.b[1])+m,
       Math.max(e.a[2],e.b[2])]};
     };
     const overlaps=(b,e)=>{
      const {lo,hi}=approximateBounds(e);
      return lo[0]<b.x+b.r&&hi[0]>b.x-b.r&&
       lo[1]<b.y+b.r&&hi[1]>b.y-b.r&&
       lo[2]<b.z+b.h&&hi[2]>b.z;
     };
     const awakenedIds=new Set();
     const wakeTargets=items=>{
      for(const b of crates)if(items.some(e=>overlaps(b,e))){
       awakenedIds.add(b.id);
       if(!g.challenger.researchCrateState(b.id).awake)
        g.challenger.researchWakeCrate(b.id);
      }
     };
     let firstOutside=null,firstUnder=null,maxMotion=0;
     const trace=[];
     let previousWatch=null,maxCorrectionGap=0;
     const record=tick=>{
      // Body linear velocity and per-step positional displacement are
      // independent solver observables; large divergence indicates direct
      // positional correction, not ordinary ballistic velocity.
      if(tick<=125){
       const q=g.challenger.researchCrateState('crate-270');
       const xyz=[q.xyz[0],q.xyz[1],q.xyz[2]];
       const poseDelta=previousWatch?Math.hypot(...xyz.map((v,i)=>v-previousWatch[i])):0;
       const speed=Math.hypot(...q.velocity);
       const gap=Math.abs(poseDelta-speed/60);
       maxCorrectionGap=Math.max(maxCorrectionGap,gap);
       trace.push({tick,xyz:xyz.map(v=>Number(v.toFixed(4))),
        awake:q.awake,velocity:q.velocity.map(v=>Number(v.toFixed(4))),
        positionDelta:poseDelta,velocityStep:speed/60,gap});
       previousWatch=xyz;
      }

      for(let i=0;i<crates.length;i++){
       const b=crates[i],ref=initial[i];
       maxMotion=Math.max(maxMotion,Math.hypot(b.x-ref.x,b.y-ref.y,b.z-ref.z));
       if(!firstOutside&&(b.x<-.1||b.y<-.1||b.x>w.scene.width+.1||
        b.y>w.scene.height+.1||b.z<-2||b.z>30))
        firstOutside={tick,id:b.id,x:b.x,y:b.y,z:b.z};
       if(!firstUnder&&b.z<-2)firstUnder={tick,id:b.id,x:b.x,y:b.y,z:b.z};
      }
     };
     const start=performance.now();
     let tick=0;
     if(insertion==='bulk'){
      for(const e of authored){
       const r=g.build(e);if(!r.ok)throw Error('bulk build '+e.id+':'+r.reason);
      }
      g.challenger.syncStatics();
      wakeTargets(authored);
     }else{
      for(const e of authored){
       const r=g.build(e);if(!r.ok)throw Error('paced build '+e.id+':'+r.reason);
       g.challenger.syncStatics();
       wakeTargets([e]);
       g.challenger.advance(1/60,[0,0]);
       record(++tick);
      }
     }
     const wakeCount=awakenedIds.size;
     const samples=[];
     while(tick<660){
      g.challenger.advance(1/60,[0,0]);
      record(++tick);
      if([120,300,660].includes(tick))samples.push({tick,firstOutside,
       minZ:Math.min(...crates.map(b=>b.z)),
       awake:crates.filter(b=>g.challenger.researchCrateState(b.id).awake).length});
     }
     const cpuMs=performance.now()-start;
     const unresolved=crates.filter(b=>authored.some(e=>overlaps(b,e))).length;
     const final=crates.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}));
     return {substeps,insertion,initial,final,sleepCount,
      parts:w.scene.elements.length,wakeCount,firstOutside,firstUnder,
      unresolved,cpuMs,samples,maxMotion,finalTime:w.time,
      watchTrace:trace.filter(x=>firstOutside&&
       x.tick>=firstOutside.tick-7&&x.tick<=firstOutside.tick+5),
      maxCorrectionGap,
      finite:final.every(b=>[b.x,b.y,b.z].every(Number.isFinite))};
    },{substeps,insertion});
    assert.equal(result.parts,112);
    assert.equal(result.initial.length,81);
    assert.ok(result.sleepCount>=50,'fixture must create genuinely resting crates');
    assert.ok(result.wakeCount>0,'material must intersect some crates');
    assert.equal(result.finite,true);
    reports.push(result);
    console.log('LIVE MATERIALIZATION TEMPO TRIAL',JSON.stringify({
     substeps,insertion,awakened:result.wakeCount,asleepInitially:result.sleepCount,
     firstOutside:result.firstOutside,firstUnder:result.firstUnder,
     stillOverlapping:result.unresolved,cpuMs:result.cpuMs,
     maxMotion:result.maxMotion,finalTime:result.finalTime,samples:result.samples,
     maxCorrectionGap:result.maxCorrectionGap,watchTrace:result.watchTrace
    }));
   }finally{await page.close();}
  }
 }
 assert.equal(reports.length,4);
 for(const count of [4,8]){
  const both=reports.filter(r=>r.substeps===count);
  assert.deepEqual(both[0].initial,both[1].initial,
   'pacing A/B must start from same Box3D world positions and identities');
  assert.ok(Math.abs(both[0].finalTime-both[1].finalTime)<1e-7,
   'pacing A/B must have identical simulated duration');
 }
 console.log('PASS LIVE MATERIALIZATION TEMPO A/B: identical initial state and simulated time',
  JSON.stringify(reports.map(r=>({substeps:r.substeps,insertion:r.insertion,
   escaped:!!r.firstOutside,unresolved:r.unresolved,
   woken:r.wakeCount,cpuMs:r.cpuMs}))));
}finally{await browser.close();await new Promise(r=>server.close(r));}
