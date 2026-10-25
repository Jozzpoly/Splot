// R10: boar's visual heading must be a view of actual chosen movement,
// without changing Box3D collisions or default art. Synthetic scene only.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18931;
const server=createServer(async(req,res)=>{
 try{const f=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(root+sep))throw Error('outside-root');
 const data=await readFile(f);res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript'}[extname(f)]||'application/octet-stream'));res.end(data);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={schema:'splot-R10-actor-facing-v1',claim:'opt-in visible heading matches movement; no actor dynamics modification',cases:[]};
try{
 const ctx=await browser.newContext({viewport:{width:1100,height:740}});
 for(const [mode,param] of [['default',''],['facing','?actorvisual=facing']]){
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html'+param,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  await page.locator('#pause').click();
  const put=async(yaw)=>page.evaluate(n=>{
   const g=window.__splotNext,w=g.world,b=w.bodies.find(x=>x.id==='boar');
   b.x=16;b.y=18;b.z=0;b.yaw=n;
   return {boar:[b.x,b.y,b.z],yaw:b.yaw,physics:g.physics};
  },yaw);
  // Prevent the camera's frame-smoothing from masquerading as actor pixels.
  await put(0);await page.waitForTimeout(2600);
  const before=await page.locator('#world').screenshot({path:'/tmp/splot-R10-'+mode+'-east.png'});
  await put(Math.PI/2);await page.waitForTimeout(600);
  const after=await page.locator('#world').screenshot({path:'/tmp/splot-R10-'+mode+'-north.png'});
  report.cases.push({mode,changed:!before.equals(after),bytes:[before.length,after.length]});
  console.log('R10 FACING FRAMES',JSON.stringify(report.cases.at(-1)));
  await page.close();
 }
 assert.equal(report.cases[0].changed,false,
  'default unrotated boar skin must be pixel-identical despite yaw value');
 assert.equal(report.cases[1].changed,true,
  'optional heading must change actual rendered pixels when yaw changes');
 // Independent genuine Box3D controls: same world, same foraging velocity,
 // but ONLY the opt-in presenter synchronizes the intended yaw.
 for(const [mode,param] of [['default',''],['facing','?actorvisual=facing']]){
  const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html'+param,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const state=await page.evaluate(()=>{
   const g=window.__splotNext,w=g.world,b=w.bodies.find(x=>x.id==='boar'),before=b.yaw;
   w.paused=false;for(let i=0;i<18;i++)g.step(1,[0,0]);w.paused=true;
   return {mode:g.challenger.status.boarMode,physics:g.physics,was:before,now:b.yaw,
    position:[b.x,b.y,b.z],phase:w.boarIntent.phase};
  });
  report.cases.find(x=>x.mode===mode).physics=state;
  console.log('R10 ACTUAL MOVEMENT HEADING',JSON.stringify({mode,...state}));
  await page.close();
 }
 const [a,b]=report.cases;
 assert.equal(a.physics.physics,'box3d');assert.equal(b.physics.physics,'box3d');
 assert.equal(a.physics.was,a.physics.now,'default game stores historical yaw unchanged');
 assert.ok(Math.abs(b.physics.was-b.physics.now)>.4,'opt-in boar yaw changes with actual forage movement');
 assert.ok(Math.hypot(...a.physics.position.map((v,i)=>v-b.physics.position[i]))<.01,
  'visual facing must not perturb actual Box3D movement/position');
 await writeFile('/tmp/splot-R10-facing.json',JSON.stringify(report,null,2));
 console.log('PASS R10 same physical world, optional visual heading rotates boar while default pixels remain unchanged');
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
