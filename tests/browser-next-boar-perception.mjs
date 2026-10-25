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
 assert.ok(report.cases.every(x=>x.physics==='box3d'));
 await writeFile('/tmp/splot-boar-perception.json',JSON.stringify(report,null,2));
 console.log('PASS: Boar reacts to actual authored occlusion, not psychic distance; remembered observation survives');
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
