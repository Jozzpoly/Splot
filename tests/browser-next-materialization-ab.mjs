// Opt-in creation-semantics experiment, NOT default gameplay or physics fix.
// Three matched worlds; measure escaping bodies AND unresolved material overlap.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18893;
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
    const inserted=[],awakened=new Set(),pending=[];
    const focusIds=[242,252,260,261,262,270,271].map(n=>'crate-'+n);
    const trace=[];
    let firstOutside=null,firstUnder=null,firstFast=null;
    for(let tick=1;tick<=660;tick++){
     const index=tick-1;
     const edits=variant==='staggered-creation'
       ?new Map([[15,14],[75,36],[135,37],[195,38]])
       :new Map([[15,14],[37,36],[38,37],[39,38]]);
     const insertedIndex=edits.get(tick);
     const currentPart=insertedIndex===undefined?null:parts[insertedIndex];
     if(currentPart){
      const element=structuredClone(currentPart);
      if(variant==='24-step-vertical-extrusion'){
       element.max[2]=element.min[2]+.02;
       pending.push({id:element.id,goalZ:currentPart.max[2],startZ:element.min[2],age:0});
      }
      const r=g.build(element);
      if(!r.ok)throw Error('bad insertion:'+element.id+':'+r.reason);
      inserted.push(element.id);g.challenger.syncStatics();
     }
     // Research-only mutation of transient authoring fixture:
     // an anchored piece grows vertically over 24 physics steps.
     // This is not a game implementation of material growth.
     if(variant==='24-step-vertical-extrusion'){
      for(const p of pending){
       if(p.age>=24)continue;
       p.age++;
       const e=w.scene.elements.find(e=>e.id===p.id);
       if(!e)throw Error('missing-growing-element:'+p.id);
       e.max[2]=p.startZ+.02+(p.goalZ-p.startZ-.02)*(p.age/24);
       w.scene.revision++;
      }
      g.challenger.syncStatics();
     }
     // Intent to resolve matter locally, rather than ignoring asleep objects.
     // Batch wakes only after all four solids are inserted, while the other
     // variants wake on each physically relevant insertion/growth step.
     if(variant!=='batch-wake-after-four'||tick>=39){
      if(variant!=='batch-wake-after-four'||tick===39){
       const edited=variant==='24-step-vertical-extrusion'
         ?w.scene.elements.filter(e=>e.id.startsWith('research-box-'))
         :variant==='batch-wake-after-four'
          ?w.scene.elements.filter(e=>e.id.startsWith('research-box-'))
          :currentPart?[currentPart]:[];
       for(const part of edited)for(const b of crates)if(overlaps(b,part)){
        if(!g.challenger.researchCrateState(b.id).awake){
         awakened.add(b.id);g.challenger.researchWakeCrate(b.id);
        }
       }
      }
     }
     const previous=tick<=110?new Map(focusIds.map(id=>[id,g.challenger.researchCrateState(id)])):null;
     g.challenger.advance(1/60,[0,0]);
     if(previous){
      trace.push({tick,added:currentPart?.id||null,
       bodies:focusIds.map(id=>{
        const p=previous.get(id),q=g.challenger.researchCrateState(id);
        const b=crates.find(c=>c.id===id);
        const nearCrates=crates.filter(c=>c.id!==id&&
         Math.abs(c.x-b.x)<c.r+b.r+.04&&Math.abs(c.y-b.y)<c.r+b.r+.04&&
         c.z<b.z+b.h+.04&&c.z+c.h>b.z-.04).map(c=>c.id);
        const staticOverlaps=w.scene.elements.filter(e=>e.id.startsWith('research-box-')&&
         overlaps(b,e)).map(e=>e.id);
        const dv=q.velocity.map((v,i)=>v-p.velocity[i]);
        return {id,awakeBefore:p.awake,awakeAfter:q.awake,
         xyz:q.xyz,velocity:q.velocity,dvHorizontal:Math.hypot(dv[0],dv[1]),
         nearCrates,staticOverlaps};
       })});
     }
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
        firstFast={tick,id,speed,velocity:q.velocity,partAtTick:currentPart?.id||null,
         insertedAtTick:!!currentPart};
        break;
       }
      }
     }
    }
    const final=crates.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z}));
    const unresolved=crates.flatMap(b=>w.scene.elements
      .filter(e=>e.id.startsWith('research-box-')&&overlaps(b,e))
      .map(e=>({crate:b.id,solid:e.id})));
    const state=crates.map(b=>({id:b.id,xyz:[b.x,b.y,b.z],
      awake:g.challenger.researchCrateState(b.id).awake}));
    return {variant,before,trace,unresolved,state,firstOutside,firstUnder,firstFast,
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



 const fixed=[42,52,60,61,62,70,71];
 const exact=r=>r.firstFast?.id==='crate-270'&&r.firstFast.tick===44&&
  r.firstFast.speed>20&&r.firstOutside?.id==='crate-270'&&
  r.firstOutside.tick===60&&r.firstUnder?.id==='crate-270'&&
  r.firstUnder.tick===93;
 const base=await runCandidate('instant-local-wake',fixed);
 assert.ok(exact(base),'known strict failure witness must reproduce');
 const batch=await runCandidate('batch-wake-after-four',fixed);
 const stagger=await runCandidate('staggered-creation',fixed);
 const extrusion=await runCandidate('24-step-vertical-extrusion',fixed);
 const results=trials.map(t=>({
  variant:t.variant,strictWitness:exact(t),inserted:t.inserted,
  awakenedCount:t.awakened,firstFast:t.firstFast,firstOutside:t.firstOutside,
  firstUnder:t.firstUnder,unresolvedCount:t.unresolved.length,
  unresolved:t.unresolved,finalCrateStates:t.state,
  topDeltas:t.trace.flatMap(s=>s.bodies.map(b=>({
   tick:s.tick,id:b.id,dv:b.dvHorizontal,velocity:b.velocity,
   approximateNeighbours:b.nearCrates,staticOverlaps:b.staticOverlaps
  }))).sort((a,b)=>b.dv-a.dv).slice(0,7)
 }));
 for(const r of results)assert.equal(r.inserted,4,'each variant must finish full material creation');
 const artifact={schema:'splot-materialization-comparison-v1',
  note:'Synthetic materialization fixtures. A no-escape result does not prove contact resolution or game safety.',
  provenance:{source:'matched 4 anchored solids + 7 added crates',seed:'same fresh standalone game',
   engine:'Box3D 0.1.1',dt:'1/60',substeps:8,
   preSteps:180,totalPostSteps:660,
   collisionPolicy:'local wake for new material only; batch waits for fourth part',
   extrusion:'full footprint, rising top from 0.02m to authored height over 24 fixed ticks',
   stagger:'creation at ticks 15,75,135,195 instead of 15,37,38,39',
   contactMetric:'AABB intersection, not exact Box3D contact manifold'},
  results};
 await writeFile('/tmp/splot-materialization-ab.json',JSON.stringify(artifact,null,2));
 for(const r of results)console.log('MATERIALIZATION RESULT',JSON.stringify({
  variant:r.variant,strictWitness:r.strictWitness,fast:r.firstFast,
  outside:r.firstOutside,under:r.firstUnder,woken:r.awakenedCount,
  remainingOverlaps:r.unresolvedCount,topDeltas:r.topDeltas.slice(0,3)}));
 console.log('PASS MATERIALIZATION A/B: baseline failure reproduced and three alternatives measured');
}finally{await browser.close();await new Promise(r=>server.close(r));}
