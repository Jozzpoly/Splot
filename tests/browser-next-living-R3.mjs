// One causal R3 rehearsal in actual Splot Next (real Box3D + DOM actions).
// No source-world injection and NO synthetic helpers / hidden teleport.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18912;
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+sep))throw Error('outside-root');
  const data=await readFile(path);
  res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript'}[extname(path)]||'application/octet-stream'));
  res.end(data);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const evidence={schema:'splot-living-R3-one-session-v1',note:'Scripted real UI rehearsal in OPT-IN intent-force, NOT Owner playtest, not current default and not physical safety proof',steps:[]};
const remember=async(stage,page,measure)=>{
 const state=await page.evaluate(()=>{const g=window.__splotNext,w=g.world;
  return {physics:g.physics,paused:w.paused,
   human:w.bodies.find(b=>b.id==='human'),
   crates:w.bodies.filter(b=>b.kind==='crate').map(b=>({id:b.id,x:b.x,y:b.y,z:b.z,h:b.h})),
   parts:w.scene.elements.filter(e=>e.id.startsWith('block-')).map(e=>({
    id:e.id,kind:e.kind,material:e.material,min:e.min,max:e.max,motionType:e.motionType})),
   grip:w.grip,notice:document.querySelector('#notice')?.textContent,
   target:document.querySelector('#target')?.textContent,engineLabel:document.querySelector('#engine-state')?.textContent};});
 evidence.steps.push({stage,...measure,state});
 console.log('LIVING R3',stage,JSON.stringify({measurement:measure,physics:state.physics,grip:state.grip,
  crates:state.crates,parts:state.parts,notice:state.notice}));
 await writeFile('/tmp/splot-living-R3.json',JSON.stringify(evidence,null,2));
 await page.screenshot({path:'/tmp/splot-living-R3-'+stage+'.png'});
 return state;
};
try{
 const context=await browser.newContext({viewport:{width:1200,height:800},deviceScaleFactor:1});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?griplaw=intent-force',
   {waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const screen=async p=>page.evaluate(v=>{
  const g=window.__splotNext,canvas=document.querySelector('#world'),r=canvas.getBoundingClientRect(),
   pixel=projectPoint(g.camera,v);
  return {x:r.left+pixel.x/canvas.width*r.width,y:r.top+pixel.y/canvas.height*r.height};
 },p);
 const click=async p=>{const {x,y}=await screen(p);await page.mouse.click(x,y);};
 const move=async(key,predicate)=>{
  await page.keyboard.down(key);
  try{await page.waitForFunction(predicate,null,{timeout:9000,polling:80});}
  finally{await page.keyboard.up(key);}
 };
 const pos=()=>window.__splotNext.world.bodies.find(b=>b.id==='human');
 const initial=await remember('00-start',page,{event:'open real standalone'});
 assert.equal(initial.physics,'box3d');
 // The actual user must APPROACH a crate before E will grab it.
 await page.keyboard.press('e');
 assert.equal(await page.evaluate(()=>window.__splotNext.world.grip),null,
  'out-of-range pickup should remain impossible');
 await move('d',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x>13.05);
 await move('w',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y>14.55);
 const approached=await remember('01-approach',page,{event:'actual WASD approach'});
 const b0=approached.crates.find(x=>x.id==='crate-1');
 assert.ok(Math.hypot(approached.human.x-b0.x,approached.human.y-b0.y)<1.45,'physical reach must be true before E');
 await page.keyboard.press('e');
 const held=await remember('02-grip',page,{event:'E pressed near visible crate'});
 assert.equal(held.grip,'crate-1');
 // Physically move WHILE keeping grip, no scripted body reassignment.
 await move('a',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x<11.8);
 await page.waitForTimeout(350);
 const transported=await remember('03-transport',page,{event:'WASD drag while holding crate'});
 const movedCrate=transported.crates.find(x=>x.id==='crate-1');
 assert.ok(b0.x-movedCrate.x>.35,'grip should visibly transport physical crate');
 await page.keyboard.press('e');
 assert.equal(await page.evaluate(()=>window.__splotNext.world.grip),null,'release must be genuine');
 // Pause using actual in-game UI before authored edits.
 await page.locator('#pause').click();
 await page.waitForTimeout(180);
 await page.locator('[data-mode="crate"]').click();
 const support=await page.evaluate(()=>{const g=window.__splotNext,b=g.world.bodies.find(x=>x.id==='crate-1');
  return [b.x,b.y,b.z+b.h];});
 await click(support);
 const second=await remember('04-stack',page,{event:'pause + click physical crate lid'});
 const topCrate=second.crates.find(x=>x.id==='crate-2');
 assert.ok(topCrate?.z>.7,'second physical crate must stand on moved original');
 // Keep original scene and build an adjacent authored support.
 await page.locator('[data-mode="box"]').click();
 await click([8,8,0]);
 const fixed=await remember('05-build-support',page,{event:'authored bottom box at ground'});
 const base=fixed.parts.find(x=>x.id==='block-10');
 assert.ok(base&&base.min[2]<.01&&base.max[2]>1,'base must be grounded authored box');
 await page.locator('#height').click();
 await page.locator('#height').click();
 await click([8,8,0]);
 const high=await remember('06-build-upper',page,{event:'second part at 2.4m height'});
 const upper=high.parts.find(x=>x.id==='block-11');
 assert.ok(upper?.min[2]>2.3&&upper?.motionType!=='dynamic','upper authored part is initially anchored');
 // Player deliberate edit -> undo -> redo in SAME scene.
 await page.locator('[data-mode="edit"]').click();
 const centre=[(upper.min[0]+upper.max[0])/2,(upper.min[1]+upper.max[1])/2,upper.max[2]];
 const from=await screen(centre),to=await screen([centre[0]+.32,centre[1],centre[2]]);
 await page.mouse.move(from.x,from.y);await page.mouse.down();
 await page.mouse.move(to.x,to.y,{steps:6});await page.mouse.up();
 const edited=await page.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='block-11')));
 assert.ok(edited?.min[0]>upper.min[0]+.2,'edit moves authored body');
 await page.locator('#undo').click();
 const reverted=await page.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='block-11')));
 assert.ok(Math.abs(reverted.min[0]-upper.min[0])<.01,'undo restores same authored element');
 await page.locator('#redo').click();
 const redone=await page.evaluate(()=>structuredClone(window.__splotNext.world.scene.elements.find(e=>e.id==='block-11')));
 assert.ok(Math.abs(redone.min[0]-edited.min[0])<.01,'redo restores same authored change');
 await remember('07-edit-undo-redo',page,{event:'real pointer edit + in-game Undo/Redo',xBefore:upper.min[0],xEdited:edited.min[0],xRedo:redone.min[0]});
 // Release upper with real Kotwica tool, then let actual Box3D settle on lower.
 await page.locator('[data-mode="material"]').click();
 await click([(redone.min[0]+redone.max[0])/2,(redone.min[1]+redone.max[1])/2,redone.max[2]]);
 const dynamic=await page.evaluate(()=>window.__splotNext.world.scene.elements.find(e=>e.id==='block-11')?.motionType);
 assert.equal(dynamic,'dynamic','real Kotwica button must release edited block');
 await page.locator('#pause').click(); // real sim resumes
 await page.waitForTimeout(2100);
 const supported=await remember('08-physical-settle',page,{event:'released upper part settles on authored base'});
 const settled=supported.parts.find(x=>x.id==='block-11');
 assert.ok(settled&&settled.min[2]>.85&&settled.min[2]<1.3,'the falling upper part should settle on its support');
 // Release disappears after erasing authored base, with no invisible floor.
 await page.locator('#pause').click();
 await page.locator('[data-mode="erase"]').click();
 const baseSide=[(base.min[0]+base.max[0])/2,base.min[1],.5];
 const basePixel=await screen(baseSide);
 await page.mouse.move(basePixel.x,basePixel.y);
 await page.waitForTimeout(100);
 const firstErasingTarget=await page.locator('#target').textContent();
 const layers=[firstErasingTarget];
 for(let i=0;i<5&&!layers.at(-1).includes('block-10');i++){
  await page.locator('#layer').click();
  layers.push(await page.locator('#target').textContent());
 }
 const intended=layers.at(-1);
 console.log('LIVING R3 SUPPORT TARGET',JSON.stringify({first:firstErasingTarget,layers,intended}));
 assert.match(intended,/block-10/,
  'Q must deliberately select authored lower support BEFORE destructive click');
 // When Q selected the hidden support, mouse click on SAME ray must preserve
 // chosen layer and must not silently revert to the first physical surface.
 await page.mouse.click(basePixel.x,basePixel.y);
 const afterDelete=await remember('09-remove-support',page,
  {event:'deliberate Q-layer erase real base',layers});
 assert.ok(!afterDelete.parts.some(x=>x.id==='block-10'),'support removed through UI');
 await page.locator('#pause').click();
 await page.waitForTimeout(1500);
 const fallen=await remember('10-observe-fall',page,{event:'same Box3D responds to missing support'});
 const endBlock=fallen.parts.find(x=>x.id==='block-11');
 assert.ok(endBlock?.min[2]<.25,'unsupported dynamic authored matter falls to real floor');
 assert.equal(fallen.physics,'box3d');
 assert.ok(fallen.crates.some(x=>x.id==='crate-2')&&fallen.crates.some(x=>x.id==='crate-1'),
   'other world matter must persist through whole player session');
 console.log('PASS LIVING R3 one world: WASD → E → transport → stack → 2 parts → drag → undo/redo → release → remove support → fall');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
