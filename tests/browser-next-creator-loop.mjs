// Opt-in REAL Chrome experience audit. No changes to the default world.
// Comparisons are visual evidence, NOT proof of Owner's enjoyment or real-phone UX.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18903;
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(!path.startsWith(root+sep))throw Error('outside root');
  const data=await readFile(path);
  res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript',
   '.js':'text/javascript'}[extname(path)]||'application/octet-stream'));
  res.end(data);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,
 executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage']});
const report={schema:'splot-creator-loop-rehearsal-v1',provenance:{
 browser:'real headless Chrome',solver:'actual downloaded Box3D 0.1.1',
 preview:'synthetic; no Owner device or acceptance'}};
try{
 const context=await browser.newContext({viewport:{width:1200,height:800},deviceScaleFactor:1});
 const legacy=await context.newPage();
 await legacy.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded'});
 await legacy.waitForTimeout(650);
 await legacy.screenshot({path:'/tmp/splot-creator-k2.png'});
 report.K2={url:'main K2 executable from research branch (not a frozen git main revision)',
  title:await legacy.title(),
  canvasCount:await legacy.locator('canvas').count()};
 await legacy.close();
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html',
   {waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 await page.screenshot({path:'/tmp/splot-creator-next-baseline.png'});
 report.next={physics:await page.evaluate(()=>window.__splotNext.physics),
  parts:await page.evaluate(()=>window.__splotNext.world.scene.elements.length)};
 const xy=async p=>page.evaluate(point=>{
  const c=window.__splotNext.camera,el=document.querySelector('#world'),
   r=el.getBoundingClientRect(),v=projectPoint(c,point);
  return {x:r.left+v.x/el.width*r.width,y:r.top+v.y/el.height*r.height};
 },p);
 const alpha=()=>page.evaluate(()=>{
  const el=document.querySelector('#overlay'),pixels=el.getContext('2d')
   .getImageData(0,0,el.width,el.height).data;
  let opaque=0;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)opaque++;
  return opaque;
 });
 // Real, initially anchored elevated ramp/deck; target a single known face.
 await page.locator('[data-mode="edit"]').click();
 const deck=await page.evaluate(()=>structuredClone(
  window.__splotNext.world.scene.elements.find(e=>e.id==='footbridge-deck')));
 assert.ok(deck&&deck.kind==='panel','real elevated part available');
 const midpoint=[(deck.a[0]+deck.b[0])/2,(deck.a[1]+deck.b[1])/2,
  (deck.a[2]+deck.b[2])/2];
 const point=await xy(midpoint);
 await page.mouse.move(point.x,point.y);
 await page.waitForTimeout(170);
 const firstTarget=await page.locator('#target').textContent();
 const hoverAlpha=await alpha();
 await page.screenshot({path:'/tmp/splot-creator-next-hover-before.png'});
 report.hover={firstTarget,hoverAlpha};
 assert.match(firstTarget,/footbridge-deck/,'pointing at deck should identify deck');
 // The expected interaction is a full targeted-part cue BEFORE destructive
 // click, not just a tiny dot. Fixed geometry can be measured by alpha pixels.
 const noSelectionAfterHover=await page.evaluate(()=>({
  disabled:document.querySelector('#edit-up').disabled,
  worldRevision:window.__splotNext.world.scene.revision
 }));
 report.hover.noSelectionAfterHover=noSelectionAfterHover;
 // Continue the workflow even on RED, preserving both screenshots.
 await page.mouse.down();
 await page.waitForTimeout(100);
 const activeAlpha=await alpha();
 await page.screenshot({path:'/tmp/splot-creator-next-hover-after.png'});
 await page.mouse.up();
 report.hover.activeAlpha=activeAlpha;
 const faceOutlineVisible=hoverAlpha>=Math.max(150,activeAlpha*.45);
 report.hover.fullTargetCueBeforeClick=faceOutlineVisible;
 // First collect deep-mode pick semantics for a physical crate without
 // imposing an unapproved static-on-dynamic construction rule.
 await page.locator('[data-mode="box"]').click();
 const crate=await page.evaluate(()=>structuredClone(
  window.__splotNext.world.bodies.find(b=>b.kind==='crate')));
 const top=await xy([crate.x,crate.y,crate.z+crate.h]);
 await page.mouse.move(top.x,top.y);
 await page.waitForTimeout(150);
 report.crateUnderBuildTool={
  pointerTarget:await page.locator('#target').textContent(),
  crateId:crate.id,canvasPoint:top,
  note:'Diagnostic only; static part attachment to dynamic crate undecided.'};
 // Integrated authoring regression: move a real anchored part and undo/redo.
 await page.locator('[data-mode="edit"]').click();
 const from=await xy(midpoint),to=await xy([midpoint[0]+.7,midpoint[1],midpoint[2]]);
 await page.mouse.move(from.x,from.y);
 await page.mouse.down();
 await page.mouse.move(to.x,to.y,{steps:8});
 await page.mouse.up();
 const changed=await page.evaluate(()=>structuredClone(
  window.__splotNext.world.scene.elements.find(e=>e.id==='footbridge-deck')));
 report.edit={moved:Math.hypot(changed.a[0]-deck.a[0],changed.a[1]-deck.a[1]),
  idPreserved:changed.id===deck.id};
 assert.ok(report.edit.moved>.4,'physical pointer must translate same deck panel');
 assert.equal(report.edit.idPreserved,true);
 await page.locator('#undo').click();
 const undone=await page.evaluate(()=>structuredClone(
  window.__splotNext.world.scene.elements.find(e=>e.id==='footbridge-deck')));
 assert.deepEqual(undone,deck,'undo restores real panel');
 await page.locator('#redo').click();
 const redone=await page.evaluate(()=>structuredClone(
  window.__splotNext.world.scene.elements.find(e=>e.id==='footbridge-deck')));
 assert.deepEqual(redone,changed,'redo restores edited panel');
 report.edit.undoRedo=true;
 await page.screenshot({path:'/tmp/splot-creator-next-edited.png'});
 console.log('CREATOR LOOP OBSERVATIONS',JSON.stringify(report));
 await writeFile('/tmp/splot-creator-loop.json',JSON.stringify(report,null,2));
 assert.ok(faceOutlineVisible,'RED: hovered anchored part lacks full visible pre-selection outline');
 console.log('PASS creator loop: pre-hover material intent plus real drag Undo/Redo');
 await context.close();
}finally{
 await browser.close();
 await new Promise(r=>server.close(r));
}
