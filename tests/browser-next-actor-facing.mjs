// Visual R&D must never alter physical or persisted actor state.
// Actual standalone game + real Box3D 0.1.1 + actual Save JSON button.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18931;
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+sep))throw Error('outside-root');
 const b=await readFile(path);
 res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript'}[extname(path)]||'application/octet-stream'));res.end(b);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const base='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html';
const report={schema:'splot-actor-heading-no-saved-state-v2',cases:[]};
try{
 const ctx=await browser.newContext({viewport:{width:1100,height:740},acceptDownloads:true});
 const source=await ctx.newPage();
 await source.goto(base,{waitUntil:'domcontentloaded'});
 await source.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 const fixture=await source.evaluate(()=>{
  const w=window.__splotNext.world,bodies=structuredClone(w.bodies);
  bodies.find(b=>b.id==='boar').yaw=0;
  return JSON.stringify({format:'splot-next-live-research-1',scene:w.scene,bodies,time:0});
 });
 await source.close();
 for(const [name,param] of [['default',''],['facing','?actorvisual=facing']]){
  const page=await ctx.newPage();
  await page.goto(base+param,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const chosen=page.waitForEvent('filechooser');
  await page.locator('#load').click();const fc=await chosen;
  page.once('dialog',d=>d.accept());
  await fc.setFiles({name:'matched-synthetic.json',mimeType:'application/json',buffer:Buffer.from(fixture)});
  await page.waitForFunction(()=>window.__splotNext.world.paused===true,null,{timeout:8000});
  const stepHeading=async(dx,dy)=>page.evaluate(([dx,dy])=>{
   const g=window.__splotNext,w=g.world,b=w.bodies.find(x=>x.id==='boar');
   w.food.x=b.x+dx;w.food.y=b.y+dy;
   w.paused=false;g.step(1,[0,0]);w.paused=true;
   const round=n=>Math.round(n*1e7)/1e7;
   const relative=p=>p.map((v,i)=>round(v-(i===0?b.x:i===1?b.y:b.z)));
   const mesh=g.actorMesh.filter(t=>t.material==='boar').map(t=>({
    a:relative(t.a),b:relative(t.b),c:relative(t.c),normal:t.normal.map(round)
   }));
   return {yaw:b.yaw,visualYaw:g.challenger.visualBoarYaw,position:[b.x,b.y,b.z],mesh};
  },[dx,dy]);
  const east=await stepHeading(9,0);
  await page.screenshot({path:'/tmp/splot-R10-'+name+'-east.png'});
  const north=await stepHeading(0,9);
  await page.screenshot({path:'/tmp/splot-R10-'+name+'-north.png'});
  const promised=page.waitForEvent('download');await page.locator('#save').click();
  const dl=await promised,saved=JSON.parse(await readFile(await dl.path(),'utf8'));
  report.cases.push({name,east,north,saved});
  console.log('R10 SAVE AND FACING',JSON.stringify({name,yaw:[east.yaw,north.yaw],
   visualYaw:[east.visualYaw,north.visualYaw],
   meshDifferent:JSON.stringify(east.mesh)!==JSON.stringify(north.mesh),
   boarEnd:north.position,savedBodies:saved.bodies.length}));
  await page.close();
 }
 const [a,b]=report.cases;
 assert.equal(a.east.mesh.length,36);assert.equal(b.east.mesh.length,36);
 assert.deepEqual(a.east.mesh,a.north.mesh,'default appearance never rotates');
 assert.notDeepEqual(b.east.mesh,b.north.mesh,'opt-in appearance visibly changes');
 assert.equal(a.east.yaw,0);assert.equal(a.north.yaw,0);
 assert.equal(b.east.yaw,0);assert.equal(b.north.yaw,0,'visual option cannot mutate saved body yaw');
 assert.ok(Math.abs(b.east.visualYaw-b.north.visualYaw)>1,
   'actual direction of intended boar movement changes render heading');
 assert.deepEqual(a.north.position,b.north.position,'same solver position');
 assert.deepEqual(a.saved,b.saved,'actual Save JSON data must be bit-equivalent across visual modes');
 await writeFile('/tmp/splot-R10-facing.json',JSON.stringify(report,null,2));
 console.log('PASS R10 optional heading changes geometry but not Box3D or real JSON saves');
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
