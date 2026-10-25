// Genuine owner-facing keyboard/physics A/B: does a held crate keep up?
// Preserve the default; record real contacts and release reasons, not fake success.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(process.cwd()),port=18913;
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+sep))throw Error('path-outside');
 const data=await readFile(path);
 res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript'}[extname(path)]||'application/octet-stream'));
 res.end(data);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:1200,height:800}});
 for(const law of ['baseline','intent-force']){
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html?griplaw='+law,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
  const position=()=>page.evaluate(()=>{const w=window.__splotNext.world,
    a=w.bodies.find(b=>b.id==='human'),c=w.bodies.find(b=>b.id==='crate-1');
    return {t:w.time,player:[a.x,a.y,a.z],crate:[c.x,c.y,c.z],
     distance:Math.hypot(a.x-c.x,a.y-c.y),grip:w.grip,
     events:w.events.filter(e=>e.type==='grip'||e.type==='release').slice(-8),
     message:document.querySelector('#notice')?.textContent};});
  const go=async(key,predicate)=>{
   await page.keyboard.down(key);try{await page.waitForFunction(predicate,null,{timeout:8000,polling:80})}
   finally{await page.keyboard.up(key)}
  };
  await go('d',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').x>13.05);
  await go('w',()=>window.__splotNext.world.bodies.find(b=>b.id==='human').y>14.55);
  const start=await position();
  assert.ok(start.distance<1.45,'same reachable start for '+law);
  await page.keyboard.press('e');
  const gripped=await position();
  assert.equal(gripped.grip,'crate-1');
  const samples=[gripped];
  await page.keyboard.down('a');
  for(let i=0;i<15;i++){await page.waitForTimeout(100);samples.push(await position());}
  await page.keyboard.up('a');
  const end=samples.at(-1);
  const moved=end.crate[0]-gripped.crate[0];
  const playerMoved=end.player[0]-gripped.player[0];
  const firstRelease=samples.find(x=>x.grip===null);
  // Same physical body + same owned input: turn at 90 degrees and reverse,
  // not just one straight-line impulse response.
  const turns=[];
  for(const [key,duration] of [['w',800],['d',800]]){
   const previous=await position();
   await page.keyboard.down(key);
   await page.waitForTimeout(duration);
   await page.keyboard.up(key);
   const current=await position();
   turns.push({key,previous,current});
  }
  console.log('GRIP TURN OBSERVATION',law,JSON.stringify(turns));
  if(law==='intent-force'){
   assert.equal(turns[0].current.grip,'crate-1',
    'candidate must hold physical crate through a 90-degree turn');
   assert.equal(turns[1].current.grip,'crate-1',
    'candidate must preserve grip on reversal');
   assert.ok(turns[0].current.crate[1]-turns[0].previous.crate[1]>1,
    'actual crate must travel with the player during northward turn');
   // The second leg goes TOWARD the held crate before crossing it.
   // Demanding an immediate eastward crate displacement there would be
   // contrary to physical intent; what matters is no lost grip or runaway.
   assert.ok(turns[1].current.distance<1.55,
    'held crate must stay within a controllable separation during reversal');
   await page.keyboard.press('e');
   const released=await position();
   assert.equal(released.grip,null,'intentional E must release physical body');
   await page.keyboard.press('e');
   const resumed=await position();
   assert.equal(resumed.grip,'crate-1','player should be able to regrab at normal reach');
   turns.push({key:'release-regrab',previous:released,current:resumed});
  }
  results.push({law,initial:start,gripped,final:end,playerDisplacement:playerMoved,
   crateDisplacement:moved,firstRelease,trace:samples,turns});
  console.log('GRIP FIELD',law,JSON.stringify({start,gripped,
   playerDisplacement:playerMoved,crateDisplacement:moved,
   last:end,firstRelease,turns}));
  await page.screenshot({path:'/tmp/splot-grip-'+law+'.png'});
  await writeFile('/tmp/splot-grip-field-ab.json',JSON.stringify({schema:'splot-grip-field-AB-v1',results},null,2));
  await page.close();
 }
 assert.equal(results.length,2);
 assert.ok(results.every(x=>x.final.player.every(Number.isFinite)&&x.final.crate.every(Number.isFinite)));
 console.log('PASS documented real-keyboard grip A/B, no gameplay defaults modified');
 await context.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
