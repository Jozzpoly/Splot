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
  console.log('PASS real pointer/editor Box3D:',JSON.stringify({screen:hit,part:final.part,engine:final.engine}));
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
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
assert.equal(failures,0,`${failures} actual browser Box3D scenarios failed`);
