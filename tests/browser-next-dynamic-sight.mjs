// R9: one genuinely dynamic Box3D crate vs TWO stacked, same player/boar.
// This is a physical optical occlusion experiment, not an NPC system nor a map editor.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18929;
const server=createServer(async(req,res)=>{
 try{const f=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(root+sep))throw Error('outside-root');
 const b=await readFile(f);res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript'}[extname(f)]||'application/octet-stream'));res.end(b);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={schema:'splot-R9-dynamic-occlusion-v1',scope:'real Box3D moving crates, opt-in perception; synthetic world only',cases:[]};
try{
 const ctx=await browser.newContext({viewport:{width:1100,height:740}});
 for(const mode of ['responsive-los','responsive-los-crates']){
  for(const crateCount of [0,1,2]){
   const page=await ctx.newPage();
   await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?boar='+mode,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
   const payload=await page.evaluate(count=>{
    const w=window.__splotNext.world;
    const obj=structuredClone({format:'splot-next-live-research-1',scene:w.scene,bodies:w.bodies,time:0});
    const b=obj.bodies.find(x=>x.id==='boar'),h=obj.bodies.find(x=>x.id==='human'),
     c=obj.bodies.find(x=>x.id==='crate-1');
    Object.assign(b,{x:32.6,y:24,z:0,support:'ground'});
    Object.assign(h,{x:30.4,y:24,z:0,support:'ground'});
    if(count>=1){Object.assign(c,{x:31.5,y:24,z:0,support:'ground'});}
    else obj.bodies=obj.bodies.filter(x=>x.id!=='crate-1');
    if(count===2)obj.bodies.push({...c,id:'crate-2',z:.86,support:null});
    return JSON.stringify(obj);
   },crateCount);
   const picker=page.waitForEvent('filechooser');
   await page.locator('#load').click();
   const fc=await picker;page.once('dialog',d=>d.accept());
   await fc.setFiles({name:'R9-synthetic-stacked-crates.json',mimeType:'application/json',buffer:Buffer.from(payload)});
   await page.waitForFunction(()=>window.__splotNext.world.bodies.find(b=>b.id==='boar').x===32.6,null,{timeout:9000});
   const sample=await page.evaluate(()=>{
    const g=window.__splotNext,w=g.world,boar=w.bodies.find(b=>b.id==='boar');
    w.food.x=boar.x;w.food.y=boar.y;
    w.paused=false;for(let i=0;i<8;i++)g.step(1,[0,0]);w.paused=true;
    return {engine:g.physics,mode:g.challenger.status.boarMode,
     phase:w.boarIntent.phase,visible:w.boarIntent.playerVisible,
     lastSeen:w.boarIntent.lastSeen,crates:w.bodies.filter(b=>b.kind==='crate').map(b=>({
      id:b.id,x:b.x,y:b.y,z:b.z,h:b.h,solver:g.challenger.researchCrateState(b.id)})),
     boar:[boar.x,boar.y,boar.z],player:w.bodies.filter(b=>b.kind==='human').map(b=>[b.x,b.y,b.z]),
     authorParts:w.scene.elements.length};
   });
   report.cases.push({mode,crateCount,...sample});
   console.log('R9 DYNAMIC SIGHT',JSON.stringify({mode,crateCount,...sample}).slice(0,7500));
   await page.screenshot({path:'/tmp/splot-R9-'+mode+'-'+crateCount+'.png'});
   if(mode==='responsive-los-crates'&&crateCount===1){
    // The player, not a test-side body teleport, pulls the sight-blocking
    // crate sideways and returns behind its old location. Success or failure
    // is a genuinely causal observation of current gameplay physics.
    await page.locator('#pause').click();
    await page.keyboard.press('e');
    const start=await page.evaluate(()=>{
     const w=window.__splotNext.world;
     return {grip:w.grip,player:[w.bodies.find(b=>b.id==='human').x,w.bodies.find(b=>b.id==='human').y],
      crate:[w.bodies.find(b=>b.id==='crate-1').x,w.bodies.find(b=>b.id==='crate-1').y],
      boar:{...w.boarIntent}};
    });
    let reached=false;
    await page.keyboard.down('s');
    try{
     await page.waitForFunction(()=>window.__splotNext.world.bodies.find(b=>b.id==='crate-1').y<23.48,
       null,{timeout:6500,polling:90});
     reached=true;
    }catch(e){console.log('R9 PULL NOT REACHED 0.52M',String(e));}
    finally{await page.keyboard.up('s');}
    await page.keyboard.press('e');
    const afterPull=await page.evaluate(()=>{
     const w=window.__splotNext.world;
     return {grip:w.grip,player:[w.bodies.find(b=>b.id==='human').x,w.bodies.find(b=>b.id==='human').y],
      crate:[w.bodies.find(b=>b.id==='crate-1').x,w.bodies.find(b=>b.id==='crate-1').y],
      boar:{...w.boarIntent}};
    });
    await page.keyboard.down('w');
    try{await page.waitForFunction(()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y>23.86,
      null,{timeout:7000,polling:80});}
    catch(e){console.log('R9 PLAYER RETURN NOT REACHED',String(e));}
    finally{await page.keyboard.up('w');}
    await page.waitForTimeout(420);
    const end=await page.evaluate(()=>{
     const w=window.__splotNext.world;
     return {grip:w.grip,boar:{...w.boarIntent},
      player:w.bodies.find(b=>b.id==='human'),
      crates:w.bodies.filter(b=>b.kind==='crate').map(b=>({id:b.id,x:b.x,y:b.y,z:b.z})),
      events:w.events.filter(e=>e.type==='grip'||e.type==='release'||e.type==='boar-intent').slice(-10)};
    });
    report.pull={start,afterPull,end,reached};
    console.log('R9 REAL E + WASD SINGLE CRATE CLEARANCE',JSON.stringify(report.pull).slice(0,8000));
    await page.screenshot({path:'/tmp/splot-R9-after-physical-player-grab.png'});
   }
   await page.close();
  }
 }
 const find=(mode,n)=>report.cases.find(x=>x.mode===mode&&x.crateCount===n);
 assert.ok(report.cases.every(x=>x.engine==='box3d'));
 assert.equal(find('responsive-los',2).visible,true,'authored-only baseline must not treat crates as walls');
 assert.equal(find('responsive-los-crates',0).visible,true,'no crates no obstruction');
 assert.equal(find('responsive-los-crates',1).visible,false,'single real crate can hide both sight rays along the full segment');
 assert.equal(find('responsive-los-crates',2).visible,false,'stack of two real crates must block BOTH sight rays');
 assert.equal(find('responsive-los-crates',2).phase,'feeding',
  'hidden-by-stacked-crates player must not trigger purely optical wary state');
 assert.ok(report.pull.start.grip==='crate-1','E must grip actual physical crate');
 assert.equal(report.pull.reached,true,'WASD must move the actual Box3D crate beyond the optical ray, not just player');
 assert.ok(report.pull.start.crate[1]-report.pull.afterPull.crate[1]>.5,
  'real held crate must travel more than 0.5 metres sideways');
 assert.equal(report.pull.end.boar.playerVisible,true,
  'clearing sight with an actual moved crate must restore observation');
 assert.ok(report.pull.end.boar.lastSeen,'boar must remember a genuinely newly observed player');
 assert.ok(report.pull.end.events.some(e=>e.type==='boar-intent'&&e.phase==='wary'),
  'live boar behavior must become wary through revealed visual contact');
 assert.ok(report.pull.end.crates.every(b=>[b.x,b.y,b.z].every(Number.isFinite)));
 assert.equal(report.pull.end.grip,null,'real player releases physical crate intentionally');
 await writeFile('/tmp/splot-R9-crates.json',JSON.stringify(report,null,2));
 console.log('PASS R9 single and stacked dynamic crates block sight; real E/WASD clearance measured');
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
