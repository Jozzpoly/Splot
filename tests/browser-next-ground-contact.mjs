// Isolated REAL Chrome + Box3D causality research, without modifying playable engine.
// Same deterministic fixture per page; compare thin base ground with a genuine
// second fixed underlay. Include a pinned in-contact grid so the watched
// box is NOT scattered away from the critical fixture before static insertion. No magical teleport, clamp, reject, or "PASS" by hiding escapes.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(process.cwd()),port=18884;
const server=createServer(async(req,res)=>{
 try{
  const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+sep))throw Error('outside root');
  const bytes=await readFile(file);
  res.setHeader('content-type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.wasm':'application/wasm'}[extname(file)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e.message||e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const rootUrl='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?physics=box3d';
const outcomes=[];
try{
 for(const density of ['single','cluster','pinned-grid','active-single','active-pinned-grid']){
  for(const underlay of [false,true]){
   const page=await browser.newPage({viewport:{width:1280,height:820}});
   try{
    await page.goto(rootUrl,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
    const state=await page.evaluate(({density,underlay})=>{
     const g=window.__splotNext,w=g.world;
     const summarize=tag=>{
      const crates=w.bodies.filter(b=>b.kind==='crate');
      const lost=crates.filter(b=>b.z<-2||b.z>30||b.x<-.1||b.y<-.1||
       b.x>w.scene.width+.1||b.y>w.scene.height+.1);
      const watched=crates.find(b=>b.id==='contact-watch');
      return {tag,time:w.time,crates:crates.length,parts:w.scene.elements.length,
       minZ:Math.min(...crates.map(b=>b.z)),lost:lost.slice(0,8).map(b=>({
        id:b.id,x:b.x,y:b.y,z:b.z,support:b.support})),
       watch:watched&&{x:watched.x,y:watched.y,z:watched.z,support:watched.support}};
     };
     if(underlay){
      const floor=g.build({id:'research-physical-underlay',kind:'box',
       min:[0,0,-1.95],max:[w.scene.width,w.scene.height,-.65],material:'stone'});
      if(!floor.ok)throw Error('underlay insertion '+floor.reason);
      g.challenger.syncStatics();
     }
     const startCount=density.includes('single')?1:80;
     for(let i=0;i<startCount;i++){
      let x,y;
      if(density.includes('single')||density.includes('pinned-grid')&&i===0){
       x=9.18;y=9.70;
      }else if(density==='cluster'){
       x=7.35+(i%10)*.35;y=8.1+Math.floor(i/10)*.35;
      }else{
       x=5.5+(i%10)*.97;y=5.5+Math.floor(i/10)*.97;
       // Keep the targeted crate from scattering BEFORE static insertion.
       if(Math.hypot(x-9.18,y-9.70)<1.1){x=30+(i%5)*1.05;y=20+Math.floor(i/5)*1.05;}
      }
      w.bodies.push({id:i===0?'contact-watch':'contact-'+i,
       kind:'crate',x,y,z:0,r:.43,h:.86,mass:36,support:null,vz:0,yaw:0});
     }
     g.challenger.syncBodies();
     g.step(density.startsWith('active-')?1:180);
     const settled=summarize('settled-initial');
     if(density.includes('single')){
      const r=g.build({id:'research-deep-overlap',kind:'box',min:[8.88,9.4,-.05],
       max:[9.48,10,1.25],material:'stone'});
      if(!r.ok)throw Error('box '+r.reason);
     }else{
      for(let i=0;i<80;i++){
       const x=6.1+(i%12)*.72,y=7.0+Math.floor(i/12)*1.12,z=(i%7)*.17;
       const r=g.build({id:'research-box-'+i,kind:'box',min:[x,y,z],
        max:[x+.82,y+1.04,z+.9],material:'stone'});
       if(!r.ok)throw Error('box '+i+': '+r.reason);
      }
      for(let i=0;i<25;i++){
       const x=8+(i%5)*1.25,y=15+Math.floor(i/5)*.73;
       const r=g.build({id:'research-panel-'+i,kind:'panel',
        a:[x,y,(i%3)*.4],b:[x+1.4,y+.28,.4+(i%3)*.4],
        width:.67,thickness:.15,material:'wood'});
       if(!r.ok)throw Error('panel '+i+': '+r.reason);
      }
     }
     g.challenger.syncStatics();
     const inserted=summarize('immediately-after-insertion');
      const watched=w.bodies.find(b=>b.id==='contact-watch');
      const authoredOverlaps=w.scene.elements.filter(e=>e.kind==='box'&&
       e.min[0]<watched.x+watched.r&&e.max[0]>watched.x-watched.r&&
       e.min[1]<watched.y+watched.r&&e.max[1]>watched.y-watched.r&&
       e.min[2]<watched.z+watched.h&&e.max[2]>watched.z);
      const overlapIds=authoredOverlaps.map(e=>e.id).slice(0,12);
     let firstLost=null;
     for(let i=0;i<660;i++){
      g.step(1);
      const b=w.bodies.find(b=>b.id==='contact-watch');
      if(!firstLost&&b.z<-2)firstLost={step:i+1,time:w.time,z:b.z};
     }
     const final=summarize('after-660-steps');
     const allFinite=w.bodies.every(b=>[b.x,b.y,b.z].every(Number.isFinite));
     return {density,underlay,initial:settled,inserted,final,firstLost,
       overlaps:overlapIds,
      finite:allFinite,engine:g.physics};
    },{density,underlay});
    assert.equal(state.engine,'box3d');
    assert.equal(state.finite,true,'Box3D must keep body coordinates finite');
    assert.equal(state.initial.crates,density.includes('single')?2:81);
    assert.equal(state.final.crates,state.initial.crates);
    if(density.includes('pinned-grid'))
     assert.ok(Math.hypot(state.initial.watch.x-9.18,state.initial.watch.y-9.70)<.2,
      'targeted stress fixture must keep watched crate in the actual overlapping region');
    outcomes.push(state);
    console.log('GROUND CONTACT ISOLATION',JSON.stringify(state));
   }finally{await page.close();}
  }
 }
 console.log('GROUND CONTACT A/B SYNTHESIS',JSON.stringify(outcomes.map(x=>({
  density:x.density,underlay:x.underlay,
  initialMinZ:x.initial.minZ,finalMinZ:x.final.minZ,
   watchStart:x.initial.watch,watchEnd:x.final.watch,overlaps:x.overlaps,
  escaped:x.final.lost.length,firstLost:x.firstLost
 }))));
 assert.equal(outcomes.length,10);
}finally{await browser.close();await new Promise(r=>server.close(r));}
