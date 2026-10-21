// On-demand diagnostic only: REAL Chrome + Box3D WASM.
// Synthetic fixtures measure CPU stage cost and rAF spacing, NOT GPU time,
// not Owner's hardware, and not a causal replay of an attached private save.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd());
const server=createServer(async(req,res)=>{
 try{
  const filename=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://x').pathname));
  if(!filename.startsWith(root+sep))throw Error('path');
  const bytes=await readFile(filename);
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'}[extname(filename)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(done=>server.listen(18880,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:820}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:18880/src/next/Splot_Next_GRAJ.html?physics=box3d');
 await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const measure=async(name)=>{
  await page.waitForTimeout(900); // settle scene after transition
  await page.evaluate(()=>window.__splotNext.clearProfile());
  await page.waitForTimeout(2700);
  const r=await page.evaluate(()=>{
   const g=window.__splotNext,w=g.world;
   return {profile:g.profile(),sceneParts:w.scene.elements.length,
    crates:w.bodies.filter(b=>b.kind==='crate').length,dynamicParts:w.scene.elements.filter(e=>e.motionType==='dynamic').length,
    engine:g.physics};
  });
  console.log('PROFILE',name,JSON.stringify(r));
  return r;
 };
 const baseline=await measure('baseline');
 const crateCost=await page.evaluate(()=>{
  const g=window.__splotNext,w=g.world,t=performance.now();
  for(let i=0;i<300;i++){
   const x=1.15+(i%20)*1.96,y=1.15+Math.floor(i/20)*1.91;
   w.bodies.push({id:'bench-crate-'+i,kind:'crate',x,y,z:.2,r:.43,h:.86,mass:36,support:null,vz:0,yaw:0});
  }
  g.challenger.syncBodies();
  return performance.now()-t;
 });
 console.log('BATCH_CREATE_CRATES_MS',crateCost.toFixed(3));
 const crates=await measure('300_crates');
 const perInsert=await page.evaluate(()=>{
  const g=window.__splotNext,elapsed=[],ids=[];
  for(let i=0;i<24;i++){
   const id='bench-box-'+i,t=performance.now();
   const r=g.build({id,kind:'box',min:[4,4,i*1.1],max:[5.2,5.2,(i+1)*1.1],material:'stone'});
   if(!r.ok)throw Error('cannot create '+id+': '+r.reason);
   g.challenger.syncStatics();elapsed.push(performance.now()-t);ids.push(id);
  }
  return {ids,elapsed};
 });
 const anchored=await measure('300_crates_24_anchored_stack');
 // Controlled GPU-submission ablation, scoped to this disposable Chrome page.
 // Same simulation, same scene and same CPU triangle preparation, but no
 // WebGL draw call. Next disable the per-frame vertex buffer upload as well.
 // rAF is not GPU time: this only identifies which stage deserves research.
 const ablation=await page.evaluate(()=>{
  const gl=document.querySelector('#world').getContext('webgl2');
  if(!gl)throw Error('no WebGL2 context for ablation');
  const record={draw:gl.drawArrays,buffer:gl.bufferData,drawCalls:0,uploadCalls:0};
  window.__splotPerfGL=record;
  gl.drawArrays=(...args)=>{record.drawCalls++;};
  if(gl.drawArrays===record.draw)throw Error('cannot intercept drawArrays');
  return {intercepted:true};
 });
 console.log('ABLATION',JSON.stringify(ablation));
 const withoutDraw=await measure('300_crates_24_anchored_SKIP_DRAW');
 await page.evaluate(()=>{
  const gl=document.querySelector('#world').getContext('webgl2');
  const record=window.__splotPerfGL;
  gl.bufferData=(...args)=>{record.uploadCalls++;};
  if(gl.bufferData===record.buffer)throw Error('cannot intercept bufferData');
 });
 const withoutDrawUpload=await measure('300_crates_24_anchored_SKIP_DRAW_AND_UPLOAD');
 const counts=await page.evaluate(()=>{
  const gl=document.querySelector('#world').getContext('webgl2'),r=window.__splotPerfGL;
  gl.drawArrays=r.draw;gl.bufferData=r.buffer;
  return {drawCalls:r.drawCalls,uploadCalls:r.uploadCalls,
   restoredDraw:gl.drawArrays===r.draw,restoredBuffer:gl.bufferData===r.buffer};
 });
 console.log('GL ABLATION COUNTS',JSON.stringify(counts));
 if(!counts.restoredDraw||!counts.restoredBuffer||!counts.drawCalls||!counts.uploadCalls)
  throw Error('GPU ablation was not actually performed and reverted');
 const regained=await measure('300_crates_24_anchored_RENDER_RESTORED');
 console.log('GL ABLATION A/B',JSON.stringify({
  full:anchored.profile.rafMs,
  noDraw:withoutDraw.profile.rafMs,
  noDrawUpload:withoutDrawUpload.profile.rafMs,
  restored:regained.profile.rafMs,
  uploadStageMs:anchored.profile.drawSubmissionCpuMs
 }));
 console.log('EDIT_TIMES_MS',JSON.stringify(perInsert.elapsed.map(x=>+x.toFixed(3))));
 const release=await page.evaluate(ids=>{
  const g=window.__splotNext,t=performance.now();
  for(const id of ids){const r=g.partMotion(id,'dynamic');if(!r.ok)throw Error('partMotion:'+r.reason);}
  return performance.now()-t;
 },perInsert.ids);
 console.log('RELEASE_24_MS',release.toFixed(3));
 const dynamic=await measure('300_crates_24_released_stack');
 await page.evaluate(ids=>{
  const g=window.__splotNext,w=g.world;
  w.scene.elements=w.scene.elements.filter(e=>!ids.includes(e.id));
  w.scene.revision++;g.challenger.syncStatics();
 },perInsert.ids);
 const removed=await measure('300_crates_after_remove_stack');
 console.log('SUMMARY',JSON.stringify({baseline:baseline.profile,crates:crates.profile,anchored:anchored.profile,dynamic:dynamic.profile,removed:removed.profile,errors}));
 if(errors.length)throw Error('browser JS errors: '+errors.join(';'));
 if(!removed.profile.frames)throw Error('no frame profiling');
 await page.close();
}finally{
 await browser.close();
 await new Promise(r=>server.close(r));
}
