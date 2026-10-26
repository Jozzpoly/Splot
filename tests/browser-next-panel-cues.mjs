// Opt-in R5 comparative evidence. Identical authored world & real Box3D.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18917;
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+sep))throw Error('outside-root');
 const data=await readFile(path);
 res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript'}[extname(path)]||'application/octet-stream'));
 res.end(data);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const outcomes=[];
try{
 const ctx=await browser.newContext({viewport:{width:1100,height:760},deviceScaleFactor:1});
 for(const [tag,search] of [['default',''],['plank-cues','?surfaces=planks']]){
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html'+search,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await page.locator('#pause').click();
  await page.waitForTimeout(300);
  const state=await page.evaluate(()=>{
   const g=window.__splotNext;
   return {engine:g.physics,gripLaw:g.challenger.status.gripLaw,renderer:g.renderer,
    visual:g.visualStats,parts:JSON.stringify(g.world.scene.elements)};
  });
  outcomes.push({variant:tag,...state});
  await page.screenshot({path:'/tmp/splot-R5-'+tag+'.png'});
  console.log('R5 WORLD',JSON.stringify({variant:tag,engine:state.engine,
   visual:state.visual,gripLaw:state.gripLaw}));
  await page.close();
 }
 // Stronger than triangle counts: the exact running WebGL depth renderer
 // must produce measurably different visible pixels from a SAME-state scene.
 // Both candidates use identical camera and physics, in the same page.
 const same=await ctx.newPage();
 await same.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html',{waitUntil:'domcontentloaded'});
 await same.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const pixelEvidence=await same.evaluate(()=>{
  const g=window.__splotNext,scene=g.world.scene,cam=g.camera;
  const draw=flag=>{
   const canvas=document.createElement('canvas');
   canvas.width=1000;canvas.height=700;
   const renderer=new WebGLDepthRenderer(canvas);
   renderer.render(createSceneVisualCache({plankSeams:flag}).triangles(scene),cam);
   renderer.gl.finish();
   const pixels=new Uint8Array(canvas.width*canvas.height*4);
   renderer.gl.readPixels(0,0,canvas.width,canvas.height,
    renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,pixels);
   return pixels;
  };
  const a=draw(false),b=draw(true);
  let changed=0,bright=0,maxRgbDelta=0;
  for(let i=0;i<a.length;i+=4){
   const delta=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));
   maxRgbDelta=Math.max(maxRgbDelta,delta);
   if(delta>=12)changed++;
   if(delta>=30)bright++;
  }
  return {changedPixels:changed,highContrastPixels:bright,maxRgbDelta,
   totalPixels:a.length/4};
 });
 console.log('R5 SAME-CAMERA DEPTH FRAMEBUFFER DELTA',JSON.stringify(pixelEvidence));
 assert.ok(pixelEvidence.changedPixels>100,
  'render-only cues must be genuinely visible, not just geometry in RAM');
 await same.close();
 const [a,b]=outcomes;
 assert.equal(a.engine,'box3d');assert.equal(b.engine,'box3d');
 assert.equal(a.renderer,b.renderer);
 assert.equal(a.gripLaw,b.gripLaw);
 assert.equal(a.parts,b.parts,'render-only option may not change scene');
 assert.equal(a.visual.plankSeams,false);assert.equal(b.visual.plankSeams,true);
 assert.ok(b.visual.staticTriangles>=a.visual.staticTriangles+16,
  'two original wood surfaces must gain true depth-rendered guides');
 await writeFile('/tmp/splot-R5-panel-cues.json',JSON.stringify({schema:'splot-r5-plank-AB-v1',
  note:'Only visual evidence. NOT Owner art approval.',outcomes,pixelEvidence},null,2));
 console.log('PASS R5 real WebGL/Box3D default vs opt-in material guides');
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
