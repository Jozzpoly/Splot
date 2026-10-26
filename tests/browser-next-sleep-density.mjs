// Research-only materialization semantics under a genuinely settled Box3D
// crowd. No policy is enabled by default: each trial explicitly wakes
// none, only bodies overlapping newly authored BOXES, or the entire crowd.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18888;
const server=createServer(async(req,res)=>{
 try{
  const filename=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(root+sep))throw Error('outside root');
  const bytes=await readFile(filename);
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript',
   '.mjs':'text/javascript'}[extname(filename)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const uri='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?physics=box3d';
const trials=[];
try{
 // Produce one canonical initial save. Import initializes an identical new
 // Box3D for each case, with no prior contact/velocity history.
 const seedPage=await browser.newPage();
 let seed;
 try{
  await seedPage.goto(uri,{waitUntil:'domcontentloaded'});
  await seedPage.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  seed=await seedPage.evaluate(()=>{
   const w=window.__splotNext.world;
   return {format:'splot-next-live-research-1',scene:structuredClone(w.scene),
    bodies:structuredClone(w.bodies),time:0};
  });
  assert.equal(seed.scene.elements.length,7);
  assert.equal(seed.bodies.length,3);
 }finally{await seedPage.close();}
 for(const substeps of [4,8]){
  for(const policy of ['none','local','all']){
   const page=await browser.newPage({viewport:{width:1120,height:730}});
   try{
    await page.goto(uri+'&substeps='+substeps,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
    page.once('dialog',d=>d.accept());
    await page.locator('#load-file').setInputFiles({name:'Splot_Nowy_Rozdzial.json',
     mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
    await page.waitForFunction(()=>document.querySelector('#pause')?.textContent==='Uruchom',
     null,{timeout:30000});
    const result=await page.evaluate(({substeps,policy})=>{
     const g=window.__splotNext,w=g.world;
     if(g.challenger.solverSubsteps!==substeps)throw Error('unexpected stepper');
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
     for(let i=0;i<180;i++)g.challenger.advance(1/60,[0,0]);
     const crates=w.bodies.filter(b=>b.kind==='crate');
     const inspect=()=>crates.map(b=>{
      const q=g.challenger.researchCrateState(b.id);
      return {id:b.id,awake:q.awake,x:q.xyz[0],y:q.xyz[1],z:q.xyz[2]-b.h/2};
     });
     const before=inspect();
     const authored=[];
     for(let i=0;i<80;i++){
      const x=6.1+(i%12)*.72,y=7.0+Math.floor(i/12)*1.12,z=(i%7)*.17;
      const part={id:'research-box-'+i,kind:'box',
       min:[x,y,z],max:[x+.82,y+1.04,z+.9],material:'stone'};
      const r=g.build(part);if(!r.ok)throw Error('box:'+r.reason);
      authored.push(part);
     }
     for(let i=0;i<25;i++){
      const x=8+(i%5)*1.25,y=15+Math.floor(i/5)*.73;
      const r=g.build({id:'research-panel-'+i,kind:'panel',
       a:[x,y,(i%3)*.4],b:[x+1.4,y+.28,.4+(i%3)*.4],
       width:.67,thickness:.15,material:'wood'});
      if(!r.ok)throw Error('panel:'+r.reason);
     }
     g.challenger.syncStatics();
     const afterInsertion=inspect();
     const ids=new Set();
     for(const b of crates){
      for(const s of authored)if(
       s.min[0]<b.x+b.r&&s.max[0]>b.x-b.r&&
       s.min[1]<b.y+b.r&&s.max[1]>b.y-b.r&&
       s.min[2]<b.z+b.h&&s.max[2]>b.z){
       ids.add(b.id);break;
      }
     }
     const wakeIds=policy==='none'?[]:policy==='local'?[...ids]:crates.map(b=>b.id);
     for(const id of wakeIds)g.challenger.researchWakeCrate(id);
     const afterWake=inspect();
     let firstOutside=null,firstUnder=null,maxDisplacement=0;
     const t0=performance.now();
     const snapshots=[];
     for(let tick=1;tick<=660;tick++){
      g.challenger.advance(1/60,[0,0]);
      const current=inspect();
      let changed=0;
      for(let j=0;j<current.length;j++){
       const v=current[j],initial=before[j];
       const delta=Math.hypot(v.x-initial.x,v.y-initial.y,v.z-initial.z);
       if(delta>.10)changed++;
       maxDisplacement=Math.max(maxDisplacement,delta);
       if(!firstOutside&&(v.x<-.1||v.y<-.1||v.x>w.scene.width+.1||
        v.y>w.scene.height+.1||v.z<-2||v.z>30))
        firstOutside={tick,id:v.id,x:v.x,y:v.y,z:v.z};
       if(!firstUnder&&v.z<-2)firstUnder={tick,id:v.id,z:v.z};
      }
      if([1,10,60,660].includes(tick))
       snapshots.push({tick,awake:current.filter(x=>x.awake).length,
        moved:changed,minZ:Math.min(...current.map(x=>x.z)),
        maxDisplacement,firstOutside});
     }
     const final=inspect(),cpuMs=performance.now()-t0;
     const unresolved=crates.filter(b=>authored.some(s=>
      s.min[0]<b.x+b.r-.02&&s.max[0]>b.x-b.r+.02&&
      s.min[1]<b.y+b.r-.02&&s.max[1]>b.y-b.r+.02&&
      s.min[2]<b.z+b.h-.02&&s.max[2]>b.z+.02)).length;
     return {substeps,policy,before,afterInsertion,afterWake,final,
      asleepBefore:before.filter(x=>!x.awake).length,
      asleepAfterInsertion:afterInsertion.filter(x=>!x.awake).length,
      overlappingIds:[...ids].sort(),wakeIds:wakeIds.slice().sort(),
      asleepAfterWake:afterWake.filter(x=>!x.awake).length,
      firstOutside,firstUnder,unresolved,snapshots,cpuMs,
      finite:final.every(x=>[x.x,x.y,x.z].every(Number.isFinite)),
      parts:w.scene.elements.length,crates:crates.length};
    },{substeps,policy});
    assert.equal(result.crates,81);
    assert.equal(result.parts,112);
    assert.ok(result.overlappingIds.length>0,
     'local-wake trial must contain actual geometric intersections');
    assert.ok(result.asleepBefore>0,
     'world should have genuinely sleeping bodies before material insertion');
    assert.ok(result.finite);
    assert.deepEqual(result.afterInsertion,result.before,
     'static sync must not change body transforms/awake state in caller stack');
    if(policy==='none')assert.equal(result.wakeIds.length,0);
    if(policy==='local')assert.deepEqual(result.wakeIds,result.overlappingIds);
    if(policy==='all')assert.equal(result.wakeIds.length,81);
    trials.push(result);
    console.log('SETTLED DENSE MATERIALIZATION',JSON.stringify({
     substeps,policy,overlaps:result.overlappingIds.length,
     waking:result.wakeIds.length,asleepBefore:result.asleepBefore,
     asleepAfterWake:result.asleepAfterWake,
     initialUnresolved:result.unresolved,firstOutside:result.firstOutside,
     firstUnder:result.firstUnder,cpuMs:result.cpuMs,snapshots:result.snapshots
    }));
   }finally{await page.close();}
  }
 }
 assert.equal(trials.length,6);
 for(const substeps of [4,8]){
  const a=trials.filter(t=>t.substeps===substeps);
  assert.equal(a.length,3);
  assert.deepEqual(a[0].before,a[1].before);
  assert.deepEqual(a[1].before,a[2].before);
  assert.deepEqual(a[0].overlappingIds,a[1].overlappingIds);
 }
 console.log('PASS SETTLED DENSE CONTACT A/B: matched asleep state, local vs all wake, 4 vs 8 steps');
}finally{await browser.close();await new Promise(r=>server.close(r));}
