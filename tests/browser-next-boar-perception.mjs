// Actual Box3D 0.1.1: same boar+player positions, same authored wall.
// Compare distance-only behavior and optional material-aware vision.
// A deterministic synthetic JSON fixture, not any private Owner world.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18923;
const server=createServer(async(req,res)=>{
 try{const f=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(root+sep))throw Error('outside-root');
 const bytes=await readFile(f);
 res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript'}[extname(f)]||'application/octet-stream'));
 res.end(bytes);
 }catch(err){res.statusCode=404;res.end(String(err));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={schema:'boar-material-perception-v1',scope:'same fixture real Box3D, not NPC cognition or Owner feel',cases:[]};
try{
 const ctx=await browser.newContext({viewport:{width:1100,height:740}});
 let walkFixture=null;
 for(const mode of ['responsive','responsive-los']){
  for(const blocked of [true,false]){
   const page=await ctx.newPage();
   const url='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?boar='+mode;
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
   await page.locator('#pause').click();
   const payload=await page.evaluate(blocked=>{
    const world=window.__splotNext.world;
    const o=structuredClone({format:'splot-next-live-research-1',scene:world.scene,bodies:world.bodies,time:0});
    const boar=o.bodies.find(b=>b.id==='boar'),human=o.bodies.find(b=>b.id==='human');
    Object.assign(boar,{x:32,y:24,z:0,support:'ground'});
    Object.assign(human,{x:30.4,y:24,z:0,support:'ground'});
    if(blocked){
     o.scene.elements.push({id:'test-perception-wall',kind:'box',
      min:[31.1,22,0],max:[31.35,26,2.4],material:'stone'});
     o.scene.revision++;
    }
    return JSON.stringify(o);
   },blocked);
   if(mode==='responsive-los'&&blocked)walkFixture=payload;
   const chooser=page.waitForEvent('filechooser');
   await page.locator('#load').click();
   const fc=await chooser;
   page.once('dialog',d=>d.accept());
   await fc.setFiles({name:'synthetic-boar-perception.json',mimeType:'application/json',buffer:Buffer.from(payload)});
   await page.waitForFunction(()=>window.__splotNext.world.bodies.find(b=>b.id==='boar').x===32,null,{timeout:9000});
   const result=await page.evaluate(()=>{
    const g=window.__splotNext,w=g.world;
    w.paused=false;
    for(let i=0;i<7;i++)g.step(1,[0,0]);
    w.paused=true;
    const b=w.bodies.find(x=>x.id==='boar'),h=w.bodies.find(x=>x.id==='human');
    return {mode:g.challenger.status.boarMode,phase:w.boarIntent.phase,
     playerVisible:w.boarIntent.playerVisible,lastSeen:w.boarIntent.lastSeen,
     boar:[b.x,b.y,b.z],human:[h.x,h.y,h.z],
     parts:w.scene.elements.length,physics:g.physics,
     events:w.events.filter(e=>e.type==='boar-intent').map(e=>({phase:e.phase,time:e.time}))};
   });
   console.log('BOAR MATERIAL SIGHT',JSON.stringify({mode,blocked,...result}));
   report.cases.push({mode,blocked,...result});
   await page.screenshot({path:'/tmp/splot-boar-'+mode+'-'+(blocked?'wall':'open')+'.png'});
   if(mode==='responsive-los'&&blocked){
    // True world mutation while the SAME boar continues living: removing
    // material must change perceptual truth without resetting cognition.
    const opened=await page.evaluate(()=>{
     const g=window.__splotNext,w=g.world;
     const old={...w.boarIntent};
     const out=removeElement(w.scene,'test-perception-wall');
     if(!out.ok)throw Error('remove-wall:'+out.reason);
     g.challenger.syncStatics();
     w.paused=false;for(let i=0;i<7;i++)g.step(1,[0,0]);w.paused=true;
     return {old,new:{...w.boarIntent},
      removed:!w.scene.elements.some(x=>x.id==='test-perception-wall')};
    });
    report.opened=opened;
    console.log('BOAR REACQUIRES AFTER WALL REMOVAL',JSON.stringify(opened));
    await page.screenshot({path:'/tmp/splot-boar-reacquire-after-remove.png'});
   }
   if(mode==='responsive-los'&&!blocked){
    const memory=await page.evaluate(()=>{
     const g=window.__splotNext,w=g.world,old={...w.boarIntent};
     const r=g.build({id:'test-perception-wall',kind:'box',min:[31.1,22,0],
      max:[31.35,26,2.4],material:'stone'});
     if(!r.ok)throw Error('wall-insertion:'+r.reason);
     g.challenger.syncStatics();
     w.paused=false;for(let i=0;i<7;i++)g.step(1,[0,0]);w.paused=true;
     return {old,new:{...w.boarIntent}};
    });
    report.memory=memory;
    console.log('BOAR MEMORY AFTER WALL',JSON.stringify(memory));
    await page.screenshot({path:'/tmp/splot-boar-after-visible-wall.png'});
   }
   await page.close();
  }
 }
 // Real player traversal: walk AROUND the obstacle through actual WASD,
 // with the boar stationary at the food until the player comes into sight.
 const game=await ctx.newPage();
 await game.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?boar=responsive-los',{waitUntil:'domcontentloaded'});
 await game.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const chooser=game.waitForEvent('filechooser');await game.locator('#load').click();
 const file=await chooser;game.once('dialog',dialog=>dialog.accept());
 await file.setFiles({name:'synthetic-boar-WASD.json',mimeType:'application/json',buffer:Buffer.from(walkFixture)});
 await game.waitForFunction(()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x===30.4,null,{timeout:9000});
 await game.evaluate(()=>{const w=window.__splotNext.world;w.food.x=32;w.food.y=24;});
 await game.locator('#pause').click();
 await game.waitForFunction(()=>window.__splotNext.world.boarIntent?.phase==='feeding',null,{timeout:5000});
 report.walk={hidden:await game.evaluate(()=>({...window.__splotNext.world.boarIntent}))};
 assert.equal(report.walk.hidden.playerVisible,false);
 const walk=async(key,predicate)=>{
  await game.keyboard.down(key);
  try{await game.waitForFunction(predicate,null,{timeout:9000,polling:75});}
  finally{await game.keyboard.up(key);}
 };
 await walk('w',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y>26.7);
 await walk('d',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x>31.8);
 await walk('s',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y<25.6);
 await game.waitForFunction(()=>window.__splotNext.world.events.some(
  e=>e.type==='boar-intent'&&e.phase==='wary'),null,{timeout:6000});
 report.walk.revealed=await game.evaluate(()=>{
  const g=window.__splotNext,w=g.world,b=w.bodies.find(b=>b.id==='boar'),
   h=w.bodies.find(b=>b.id==='human');
  return {phase:w.boarIntent.phase,playerVisible:w.boarIntent.playerVisible,
   player:[h.x,h.y,h.z],boar:[b.x,b.y,b.z],lastSeen:w.boarIntent.lastSeen,
   aware:w.events.some(e=>e.type==='boar-intent'&&e.phase==='wary'),
   physics:g.physics,wallStillPresent:w.scene.elements.some(e=>e.id==='test-perception-wall')};
 });
 console.log('BOAR REAL WASD AROUND WALL',JSON.stringify(report.walk));
 assert.equal(report.walk.revealed.aware,true,'actual WASD should trigger a new observed encounter');
 assert.equal(report.walk.revealed.wallStillPresent,true,'wall never removed during player traversal');
 assert.equal(report.walk.revealed.physics,'box3d');
 await game.screenshot({path:'/tmp/splot-boar-real-WASD-encounter.png'});
 await game.close();
 const get=(mode,blocked)=>report.cases.find(x=>x.mode===mode&&x.blocked===blocked);
 assert.equal(get('responsive',true).phase,'wary','old distance-only mode wrongly senses behind wall (control)');
 assert.equal(get('responsive-los',true).phase,'travel','never-seen player hidden by wall must not cause wary');
 assert.equal(get('responsive-los',true).playerVisible,false);
 assert.equal(get('responsive-los',false).phase,'wary','new mode still reacts to visible human');
 assert.equal(get('responsive-los',false).playerVisible,true);
 assert.equal(report.memory.old.phase,'wary');
 assert.equal(report.memory.new.phase,'wary','brief memory survives when sight blocked');
 assert.equal(report.memory.new.playerVisible,false);
 assert.deepEqual(report.memory.new.lastSeen,report.memory.old.lastSeen);
 assert.equal(report.opened.removed,true);
 assert.equal(report.opened.old.playerVisible,false);
 assert.equal(report.opened.new.playerVisible,true,
  'world edit removing the solid must restore actual sight of the player');
 assert.equal(report.opened.new.phase,'wary',
  'without scene reset the boar must respond after seeing player again');
 assert.ok(report.cases.every(x=>x.physics==='box3d'));
 await writeFile('/tmp/splot-boar-perception.json',JSON.stringify(report,null,2));
 console.log('PASS: physical authored wall occludes boar, wall edits restore sight, real WASD around wall triggers new encounter');
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
