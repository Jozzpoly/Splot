// A finite delta-debug of the FAILED real Box3D material creation,
// preserving original 105 edit/tick SCHEDULE even when omitting geometry.
// No result from a subset is a universal physical safety guarantee.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18891;
const server=createServer(async(req,res)=>{
 try{
  const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+sep))throw Error('outside root');
  const bytes=await readFile(file);
  res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript',
   '.js':'text/javascript'}[extname(file)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const uri='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?physics=box3d&substeps=8';
try{
 const seedPage=await browser.newPage();let seed;
 try{
  await seedPage.goto(uri,{waitUntil:'domcontentloaded'});
  await seedPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  seed=await seedPage.evaluate(()=>{
   const w=window.__splotNext.world;
   return {format:'splot-next-live-research-1',scene:structuredClone(w.scene),
    bodies:structuredClone(w.bodies),time:0};
  });
 }finally{await seedPage.close();}
 const trials=[];
 const runCandidate=async (variant,indices)=>{
  const page=await browser.newPage({viewport:{width:1120,height:730}});
  try{
   await page.goto(uri,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
   page.once('dialog',d=>d.accept());
   await page.locator('#load-file').setInputFiles({name:'Splot_Nowy_Rozdzial.json',
    mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
   await page.waitForFunction(()=>document.querySelector('#pause')?.textContent==='Uruchom',
    null,{timeout:30000});
   const result=await page.evaluate(({variant,indices})=>{
    const g=window.__splotNext,w=g.world;
    if(g.challenger.solverSubsteps!==8)throw Error('not 8-substep Box3D');
    w.paused=false;
    for(let i=0;i<80;i++){
     if(!indices.includes(i))continue;
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
    for(let i=0;i<180;i++)g.challenger.advance(1/60,[0,0]);
    const crates=w.bodies.filter(b=>b.kind==='crate');
    const before=crates.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}));
    const selected=i=>[14,36,37,38].includes(i);
    const parts=[];
    for(let i=0;i<80;i++){
     const x=6.1+(i%12)*.72,y=7+Math.floor(i/12)*1.12,z=(i%7)*.17;
     parts.push({id:'research-box-'+i,kind:'box',min:[x,y,z],
      max:[x+.82,y+1.04,z+.9],material:'stone'});
    }
    for(let i=0;i<25;i++){
     const x=8+(i%5)*1.25,y=15+Math.floor(i/5)*.73;
     parts.push({id:'research-panel-'+i,kind:'panel',
      a:[x,y,(i%3)*.4],b:[x+1.4,y+.28,.4+(i%3)*.4],
      width:.67,thickness:.15,material:'wood'});
    }
    const bounds=e=>{
     if(e.kind==='box')return [e.min,e.max];
     const m=e.width/2;
     return [[Math.min(e.a[0],e.b[0])-m,Math.min(e.a[1],e.b[1])-m,
       Math.min(e.a[2],e.b[2])-e.thickness],
      [Math.max(e.a[0],e.b[0])+m,Math.max(e.a[1],e.b[1])+m,
       Math.max(e.a[2],e.b[2])]];
    };
    const overlaps=(b,e)=>{
     const [lo,hi]=bounds(e);
     return lo[0]<b.x+b.r&&hi[0]>b.x-b.r&&
      lo[1]<b.y+b.r&&hi[1]>b.y-b.r&&
      lo[2]<b.z+b.h&&hi[2]>b.z;
    };
    const inserted=[],awakened=new Set();
    let firstOutside=null,firstUnder=null,firstFast=null;
    for(let tick=1;tick<=660;tick++){
     const index=tick-1;
     if(index<parts.length&&selected(index)){
      const part=parts[index],r=g.build(part);
      if(!r.ok)throw Error('bad insertion:'+part.id+':'+r.reason);
      inserted.push(part.id);
      g.challenger.syncStatics();
      for(const b of crates)if(overlaps(b,part)){
       awakened.add(b.id);
       if(!g.challenger.researchCrateState(b.id).awake)
        g.challenger.researchWakeCrate(b.id);
      }
     }
     g.challenger.advance(1/60,[0,0]);
     for(const b of crates){
      if(!firstOutside&&(b.x<-.1||b.y<-.1||
       b.x>w.scene.width+.1||b.y>w.scene.height+.1||b.z<-2||b.z>30))
       firstOutside={tick,id:b.id,x:b.x,y:b.y,z:b.z};
      if(!firstUnder&&b.z<-2)
       firstUnder={tick,id:b.id,x:b.x,y:b.y,z:b.z};
     }
     if(tick<=120&&!firstFast){
      for(const id of ['crate-270','crate-260']){
       const q=g.challenger.researchCrateState(id);
       if(!q)continue;
       const speed=Math.hypot(...q.velocity);
       if(speed>10){
        firstFast={tick,id,speed,velocity:q.velocity,partAtTick:parts[index]?.id,
         insertedAtTick:!!selected(index)};
        break;
       }
      }
     }
    }
    const final=crates.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}));
    return {variant,before,firstOutside,firstUnder,firstFast,
     inserted:inserted.length,awakened:awakened.size,
     finalParts:w.scene.elements.length,finalTime:w.time,
     finite:final.every(b=>[b.x,b.y,b.z].every(Number.isFinite))};
   },{variant,indices});
   assert.equal(result.finite,true);
   assert.ok(Math.abs(result.finalTime-14)<.00001);
   assert.equal(result.finalParts,7+result.inserted);
   assert.ok(result.before.some(b=>b.id==='crate-270'),'witness body must never be removed');
   trials.push({...result,indices});
   console.log('CONTACT MATERIAL SUBSET TRIAL',JSON.stringify({
    variant:result.variant,inserted:result.inserted,awakened:result.awakened,
    firstFast:result.firstFast,firstOutside:result.firstOutside,firstUnder:result.firstUnder
   }));
   return result;
  }finally{await page.close();}
 };

 // Keep the exact historical ejection, not an unrelated escape from another
 // crate. Source world, 105 edit slots and local-wake policy stay unchanged.
 const seedIndices=[42,52,60,61,62,63,69,70,71];
 const base=await runCandidate('baseline-resume-nine-crates',seedIndices);
 const signature=r=>r.firstFast?.id==='crate-270'&&
  r.firstFast?.tick===44&&r.firstFast.speed>20&&
  r.firstOutside?.id==='crate-270'&&r.firstOutside.tick===60&&
  r.firstUnder?.id==='crate-270'&&r.firstUnder.tick===93;
 assert.ok(signature(base),'four-part witness must reproduce from the previous nine-crate checkpoint');
 const targetOnly=await runCandidate('negative-control-target-only',[70]);
 console.log('CRATE DDMIN TARGET-ONLY CONTROL',JSON.stringify({
  reproducesExactSignature:!!signature(targetOnly),fast:targetOnly.firstFast,
  exit:targetOnly.firstOutside}));
 const accepted=[{phase:'resume-from-proven-checkpoint',indices:seedIndices,from:9,to:9,
  reference:'crate-270/tick44→60→93; anchored boxes 14/36/37/38'}];
 let active=seedIndices.slice();
 let granularity=2,attempts=0;
 const budget=48;
 // Bounded ddmin. All candidates run in independent fresh Box3D engines,
 // and every removal MUST satisfy the same physical witness predicate.
 while(active.length>1&&attempts<budget){
  const removable=active.filter(i=>i!==70);
  const chunks=[];
  for(let i=0;i<granularity;i++){
   const a=Math.floor(i*removable.length/granularity),
    b=Math.floor((i+1)*removable.length/granularity);
   if(b>a)chunks.push(removable.slice(a,b));
  }
  let improved=false;
  for(const chunk of chunks){
   if(attempts>=budget)break;
   const remaining=active.filter(i=>!chunk.includes(i));
   if(remaining.length===0)continue;
   const label='ddmin-'+(++attempts)+'-drop-'+chunk.join('.');
   const out=await runCandidate(label,remaining);
   if(signature(out)){
    accepted.push({phase:'ddmin',attempt:attempts,
     from:active.length,to:remaining.length,removed:chunk,indices:remaining,
     firstFast:out.firstFast,firstOutside:out.firstOutside});
    console.log('CRATE DDMIN ACCEPTED',JSON.stringify(accepted.at(-1)));
    active=remaining;granularity=Math.max(2,granularity-1);
    await writeFile('/tmp/splot-crate-ddmin.json',JSON.stringify({
     schema:'splot-crate-ddmin-v1',status:'partial',attempts,budget,
     retainedCrateIndices:active,checkpoints:accepted,reference:'crate-270/tick44→60→93'
    },null,2));
    improved=true;break;
   }
  }
  if(!improved){
   if(granularity>=removable.length)break;
   granularity=Math.min(removable.length,granularity*2);
  }
 }
 const minimalityChecks=[];
 for(const index of active.filter(i=>i!==70)){
  const without=active.filter(i=>i!==index);
  const trial=await runCandidate('independent-single-deletion-'+index,without);
  minimalityChecks.push({removed:index,preservesExactSignature:!!signature(trial)});
 }
 const oneDeletionMinimal=minimalityChecks.every(x=>!x.preservesExactSignature);
 const final=await runCandidate('final-replay',active);
 assert.ok(signature(final),'minimized witness must survive fresh solver replay');
 const json={schema:'splot-crate-ddmin-v1',reference:'crate-270 velocity tick44; XY tick60; floor tick93',
  initial:seedIndices,remaining:active,attempts,budget,budgetExhausted:attempts>=budget,
  oneMinimalUnderTestedChunks:oneDeletionMinimal,singleDeleteChecks:minimalityChecks,
  checkpoints:accepted,
  finalWitness:{fast:final.firstFast,exit:final.firstOutside,under:final.firstUnder},
  provenance:{engine:'real Chrome + box3d.js@0.1.1',substeps:8,
   fixedAnchoredPartIndices:[14,36,37,38],targetCrateIndex:70,
   sameRootScene:true,samePreSteps:180,sameCandidateSlots:105,sameTotalSteps:660,
   preInsertionContactsChangeWhenCratesAreRemoved:true,
   independentFreshEngines:true,localWake:true}};
 await writeFile('/tmp/splot-crate-ddmin.json',JSON.stringify(json,null,2));
 console.log('CRATE DDMIN FINAL',JSON.stringify({
  original:9,remaining:active.length,ids:active,attempts,
  oneDeletionMinimal,minimalityChecks,budgetExhausted:json.budgetExhausted,
  granularity,accepted:accepted.length,witness:json.finalWitness
 }));
 console.log('PASS CRATE DDMIN RESUME: accepted deletions replayed; independent single-body necessity checked');

}finally{await browser.close();await new Promise(r=>server.close(r));}
