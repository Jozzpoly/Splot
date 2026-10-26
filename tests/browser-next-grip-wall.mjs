// Bounded R4 lived-contact probe: physical crate held by human and pushed
// into a simple anchored wall. All movement/chwyt through real DOM WASD+E.
// Only the wall is synthetic test setup, never a game rule or Owner-world asset.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18915;
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+sep))throw Error('outside-root');
  const bytes=await readFile(path);
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'}[extname(path)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={schema:'splot-r4-grip-wall-v1',meaning:'bounded player/physical-matter contact on existing default grip; not Owner feel',worlds:[]};
try{
 const context=await browser.newContext({viewport:{width:1200,height:800},deviceScaleFactor:1});
 const base='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html';
 const variant=async(name,wall)=>{
  const page=await context.newPage();
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const result={name,wall,route:[],samples:[]};
  const sample=async stage=>{
   const s=await page.evaluate(()=>{
    const g=window.__splotNext,w=g.world,h=w.bodies.find(b=>b.id==='human'),
     c=w.bodies.find(b=>b.id==='crate-1');
    return {seconds:w.time,actor:[h.x,h.y,h.z],crate:[c.x,c.y,c.z],
     gap:Math.hypot(h.x-c.x,h.y-c.y),grip:w.grip,solver:g.physics,
     gripLaw:g.challenger.status.gripLaw,
     releases:w.events.filter(e=>e.type==='release').map(e=>({reason:e.reason,time:e.time})).slice(-5),
     display:document.querySelector('#notice')?.textContent};
   });
   result.route.push({stage,...s});return s;
  };
  const move=async(key,expr)=>{
   await page.keyboard.down(key);
   try{await page.waitForFunction(expr,null,{timeout:9000,polling:100});}
   finally{await page.keyboard.up(key);}
  };
  if(wall){
   result.fixture=await page.evaluate(()=>{
    const g=window.__splotNext,solid={id:'test-grip-solid-wall',kind:'box',
      min:[12.5,13.25,0],max:[12.9,17.6,2.4],material:'stone'};
    const r=g.build(solid);if(r.ok)g.challenger.syncStatics();
    return {r,solid};
   });
   assert.equal(result.fixture.r.ok,true,'single material wall must be constructed before moving');
  }
  await sample('start');
  // Real keyboard navigation around the front of the crate. No actor
  // teleports, no own-collider modifications, no world reset.
  await move('s',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y<12.4);
  await move('d',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x>15.55);
  await move('w',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y>15.0);
  await move('a',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x<15.35);
  const ready=await sample('approach');
  assert.ok(ready.gap<1.45,'player genuinely approaches crate from EAST within E range');
  await page.keyboard.press('e');
  const grabbed=await sample('grabbed');
  assert.equal(grabbed.grip,'crate-1','E must activate physical grip');
  await page.keyboard.down('a');
  for(let k=0;k<18;k++){
   await page.waitForTimeout(110);
   const s=await sample('press-'+k);
   result.samples.push(s);
  }
  await page.keyboard.up('a');
  const after=await sample('after-contact');
  result.maxActorTravel=grabbed.actor[0]-after.actor[0];
  result.crateAdvance=grabbed.crate[0]-after.crate[0];
  result.minCrateX=Math.min(...result.samples.map(s=>s.crate[0]));
  result.finalCrateX=after.crate[0];
  result.finalGripped=after.grip==='crate-1';
  result.wallRightFace=wall?12.9:null;
  result.horizontalGapToWall=wall?after.crate[0]-.43-12.9:null;
  await page.screenshot({path:'/tmp/splot-grip-wall-'+name+'.png'});
  // Real release with E if still gripped.
  if(after.grip){await page.keyboard.press('e');assert.equal((await sample('voluntary-drop')).grip,null);}
  await page.close();
  console.log('GRIP-WALL',JSON.stringify({name,fixture:result.fixture,
   approach:ready,grab:grabbed,playerTravel:result.maxActorTravel,
   crateTravel:result.crateAdvance,minCrateX:result.minCrateX,
   final:after,wallGap:result.horizontalGapToWall,finalGripped:result.finalGripped}));
  report.worlds.push(result);
  await writeFile('/tmp/splot-grip-wall.json',JSON.stringify(report,null,2));
  return result;
 };
 const open=await variant('open-ground',false);
 const barrier=await variant('blocking-wall',true);
 assert.ok(open.crateAdvance>1.0,'open-world control must be able to move a real crate');
 assert.ok(barrier.crateAdvance>=.05,'contact variant must register a physical push attempt');
 // Physical wall: Box3D square crate has side length .86 -> half-extent .43.
 // Separation criterion permits only bounded local contact tolerance.
 assert.ok(barrier.minCrateX>=12.9+.43-.11,
  'physical crate must not ghost deeply through authored wall');
 assert.ok(barrier.minCrateX>=open.minCrateX+.3,
  'material barrier should causally change how far the player can push held crate');
 console.log('PASS GRIP-WALL real-keyboard contact: held body respects authored obstruction in comparison to open ground');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
