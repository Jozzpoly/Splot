// Research: compare actual solver sleep/awake states and collisions created
// by inserting immovable matter into an occupied location. No game defaults
// changed. Outcomes measured from Box3D, NOT inferred from Splot HUD.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve(process.cwd()),port=18887;
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
const address='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?physics=box3d';
const scenarios=[
 {name:'fresh-active-4',substeps:4,preSteps:1,wake:false},
 {name:'settled-no-wake-4',substeps:4,preSteps:180,wake:false},
 {name:'settled-explicit-wake-4',substeps:4,preSteps:180,wake:true},
 {name:'fresh-active-8',substeps:8,preSteps:1,wake:false},
 {name:'settled-no-wake-8',substeps:8,preSteps:180,wake:false},
 {name:'settled-explicit-wake-8',substeps:8,preSteps:180,wake:true}
];
const out=[];
try{
 for(const sc of scenarios){
  const page=await browser.newPage({viewport:{width:980,height:680}});
  try{
   await page.goto(address+'&substeps='+sc.substeps,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
   const result=await page.evaluate(sc=>{
    const g=window.__splotNext,w=g.world;
    if(g.challenger.solverSubsteps!==sc.substeps)throw Error('wrong solver');
    const body=w.bodies.find(b=>b.id==='crate-1');
    // Original crate is at 14.2,15.2, far from any authored baseline bridge.
    // Use exact same material and initial pose in all six fresh worlds.
    g.step(sc.preSteps);
    const start=g.challenger.researchCrateState('crate-1');
    const b=g.build({id:'research-material-in-crate',kind:'box',
     min:[13.9,14.9,-.05],max:[14.5,15.5,1.25],material:'stone'});
    if(!b.ok)throw Error('insertion refused: '+b.reason);
    g.challenger.syncStatics();
    const afterInsert=g.challenger.researchCrateState('crate-1');
    const afterWake=sc.wake?g.challenger.researchWakeCrate('crate-1'):null;
    const observations=[];
    for(let i=0;i<120;i++){
     g.step(1);
     if([0,1,4,19,59,119].includes(i)){
      const q=g.challenger.researchCrateState('crate-1');
      observations.push({step:i+1,awake:q.awake,xyz:q.xyz,
       speed:Math.hypot(...q.velocity)});
     }
    }
    const end=g.challenger.researchCrateState('crate-1');
    return {name:sc.name,substeps:sc.substeps,preSteps:sc.preSteps,
     wakeRequested:sc.wake,initial:start,afterInsert,afterWake,observations,end,
     worldTime:w.time,mirror:{x:body.x,y:body.y,z:body.z,support:body.support},
     parts:w.scene.elements.length,
     displacement:Math.hypot(end.xyz[0]-start.xyz[0],end.xyz[1]-start.xyz[1],end.xyz[2]-start.xyz[2])};
   },sc);
   assert.equal(result.parts,8);
   assert.ok(result.observations.length===6);
   assert.ok(Number.isFinite(result.displacement));
   assert.ok(result.end.xyz.every(Number.isFinite));
   assert.ok(result.initial.xyz.every(Number.isFinite));
   assert.equal(result.afterInsert.awake,result.initial.awake,
    'merely syncing a new static body must not silently mutate WASM sleeping state');
   if(sc.wake)assert.equal(result.afterWake.awake,true,'explicit API wake must make body awake');
   out.push(result);
   console.log('SLEEP MATERIAL INSERTION',JSON.stringify(result));
  }finally{await page.close();}
 }
 for(const substeps of [4,8]){
  const fresh=out.find(x=>x.substeps===substeps&&x.preSteps===1);
  const rest=out.find(x=>x.substeps===substeps&&x.preSteps===180&&!x.wakeRequested);
  const wake=out.find(x=>x.substeps===substeps&&x.wakeRequested);
  assert.ok(fresh&&rest&&wake);
  assert.equal(rest.initial.awake,false,'180 settled steps must establish TRUE Box3D sleep');
  assert.equal(fresh.initial.awake,true,'one step must preserve TRUE Box3D awake');
  // The test is about semantics, not prescribing a fix. Do not impose a
  // "sleeping bodies should always move" policy before Owner judgement.
  console.log('SLEEP CAUSAL A/B',JSON.stringify({substeps,
   initial:{fresh:fresh.initial.awake,rest:rest.initial.awake},
   insertion:{fresh:fresh.afterInsert.awake,rest:rest.afterInsert.awake},
   explicitWake:wake.afterWake.awake,
   displacement:{fresh:fresh.displacement,rest:rest.displacement,wake:wake.displacement},
   end:{fresh:fresh.end.awake,rest:rest.end.awake,wake:wake.end.awake}
  }));
 }
 console.log('PASS Box3D physical sleep-state causality instrumented across 4 / 8 substeps');
}finally{await browser.close();await new Promise(r=>server.close(r));}
