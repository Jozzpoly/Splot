// R6: complete public UI world save / cancel import / confirmed recovery.
// Real Chrome + Box3D, real files, two viewport classes; synthetic scene only.
// No claim that simulated mobile equals an Owner physical phone.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd()),port=18919;
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+sep))throw Error('outside root');
  const bytes=await readFile(path);
  res.setHeader('content-type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript'}[extname(path)]||'application/octet-stream'));
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end(String(e));}
});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const url='http://127.0.0.1:'+port+'/src/next/Splot_Next_GRAJ.html';
const report={schema:'splot-R6-durable-creation-v1',note:'Synthetic Owner-like journey, real Chrome and download/upload. Not real-device approval.',desktop:{},portrait:{}};
const capture=async(page,label)=>{
 const s=await page.evaluate(()=>{
  const g=window.__splotNext,w=g.world;
  return {physics:g.physics,parts:structuredClone(w.scene.elements),
   bodies:w.bodies.filter(b=>b.id==='human'||b.kind==='crate').map(b=>({id:b.id,x:b.x,y:b.y,z:b.z})),
   paused:w.paused,grip:w.grip,worldTime:w.time,notice:document.querySelector('#notice')?.textContent};
 });
 console.log('R6 STATE',label,JSON.stringify({engine:s.physics,parts:s.parts.map(x=>x.id),bodies:s.bodies,paused:s.paused,grip:s.grip,notice:s.notice}).slice(0,4500));
 await page.screenshot({path:'/tmp/splot-R6-'+label+'.png'});
 return s;
};
try{
 const ctx=await browser.newContext({viewport:{width:1200,height:800},acceptDownloads:true});
 const page=await ctx.newPage();
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 await page.locator('#pause').click();
 const screen=async(point)=>page.evaluate(pos=>{
  const g=window.__splotNext,c=document.querySelector('#world'),r=c.getBoundingClientRect(),p=projectPoint(g.camera,pos);
  return {x:r.left+p.x/c.width*r.width,y:r.top+p.y/c.height*r.height};
 },point);
 const act=async(mode,point)=>{await page.locator('[data-mode="'+mode+'"]').click();const p=await screen(point);await page.mouse.click(p.x,p.y);};
 await act('box',[8,8,0]);
 const crate=await page.evaluate(()=>{const b=window.__splotNext.world.bodies.find(b=>b.id==='crate-1');return [b.x,b.y,b.z+b.h];});
 await act('crate',crate);
 const created=await capture(page,'01-built');
 assert.ok(created.parts.some(p=>p.id==='block-10'));
 assert.ok(created.bodies.some(b=>b.id==='crate-2'&&b.z>.7));
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#save').click();
 const dl=await downloadPromise;
 assert.equal(dl.suggestedFilename(),'Splot_Nowy_Rozdzial.json');
 // Playwright removes context-owned download artifacts on context.close().
 // Copy the REAL downloaded bytes to a stable local test file before opening
 // a fresh emulated portrait context. This is synthetic scene content only.
 const downloadPath=await dl.path();
 const savedPath='/tmp/splot-R6-synthetic-save.json';
 await writeFile(savedPath,await readFile(downloadPath));
 const saved=JSON.parse(await readFile(savedPath,'utf8'));
 assert.equal(saved.format,'splot-next-live-research-1');
 assert.deepEqual(saved.scene.elements,created.parts);
 assert.equal(saved.bodies.filter(b=>b.kind==='crate').length,2);
 report.desktop.save={file:dl.suggestedFilename(),bytes:(await readFile(savedPath)).length,
  parts:saved.scene.elements.length,bodies:saved.bodies.length,pausedBefore:created.paused};
 // After saving, make a genuine unsaved edit. Declining import must preserve it.
 await act('box',[6,6,0]);
 const modified=await capture(page,'02-unsaved-extra');
 assert.ok(modified.parts.some(p=>p.id==='block-11'),
  'sequence after authored block-10 must assign block-11; physical crate IDs use a separate counter');
 const fileChooser=async accept=>{
  const dialogHandler=async d=>{if(accept)await d.accept();else await d.dismiss();};
  page.once('dialog',dialogHandler);
  const chooserPromise=page.waitForEvent('filechooser');
  await page.locator('#load').click();
  const fc=await chooserPromise;
  await fc.setFiles(savedPath);
  await page.waitForTimeout(350);
 };
 await fileChooser(false);
 const declined=await capture(page,'03-declined');
 assert.deepEqual(declined.parts,modified.parts,'declined load must not erase unsaved world');
 assert.equal(declined.physics,'box3d');
 await fileChooser(true);
 const recovered=await capture(page,'04-recovered');
 assert.deepEqual(recovered.parts,saved.scene.elements,'accepted import restores exact authored geometry and identity');
 assert.equal(recovered.bodies.filter(b=>b.id.startsWith('crate-')).length,2);
 assert.equal(recovered.paused,true,'fresh imported physics is intentionally paused');
 assert.equal(recovered.grip,null,'reload never invents saved grip');
 assert.equal(recovered.physics,'box3d');
 report.desktop.cancelThenLoad={cancelPreserved:declined.parts.length,recoveredParts:recovered.parts.length,
  bodies:recovered.bodies.length,paused:recovered.paused};
 await act('box',[6,6,0]);
 const newAfter=await capture(page,'05-continued-authoring');
 const added=newAfter.parts.filter(p=>!saved.scene.elements.some(q=>q.id===p.id));
 assert.equal(added.length,1);
 assert.equal(added[0].id,'block-11','next authoring ID remains unique after import');
 await page.locator('#undo').click();
 assert.deepEqual((await capture(page,'06-after-undo')).parts,saved.scene.elements,
  'original imported construction survives subsequent edit/undo');
 report.desktop.canContinue=true;
 await page.close();await ctx.close();
 // Emulated portrait: open tools via real hamburger; upload SAME exported file;
 // resume the actual physics through the mobile tool rail and move joystick.
 const mobileContext=await browser.newContext({viewport:{width:393,height:852},
  deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
 const phone=await mobileContext.newPage();
 await phone.goto(url,{waitUntil:'domcontentloaded'});
 await phone.waitForFunction(()=>window.__splotNext?.physics==='box3d',null,{timeout:60000});
 await phone.locator('#mobile-menu').click();
 assert.equal(await phone.locator('body').evaluate(e=>e.classList.contains('menu-open')),true);
 phone.once('dialog',d=>d.accept());
 const chooserPromise=phone.waitForEvent('filechooser');
 await phone.locator('#load').click();
 const file=await chooserPromise;await file.setFiles(savedPath);
 await phone.waitForFunction(()=>window.__splotNext.world.scene.elements.some(e=>e.id==='block-10')&&
  window.__splotNext.world.bodies.some(b=>b.id==='crate-2'),null,{timeout:8000});
 const loaded=await capture(phone,'07-mobile-restored');
 assert.deepEqual(loaded.parts,saved.scene.elements,'portrait load must preserve exactly same world');
 assert.equal(loaded.paused,true);assert.equal(loaded.physics,'box3d');
 // Import intentionally calls setMode('move'), which closes the mobile
 // tool drawer. The player reopens tools before tapping Uruchom.
 assert.equal(await phone.locator('body').evaluate(e=>e.classList.contains('menu-open')),false,
  'import returns to game view, closing the tools drawer');
 await phone.locator('#mobile-menu').click();
 await phone.locator('#pause').click();
 assert.equal(await phone.evaluate(()=>window.__splotNext.world.paused),false);
 await phone.locator('#mobile-menu').click();
 const joystick=await phone.locator('#joystick').boundingBox();
 assert.ok(joystick&&joystick.width>90,'visible mobile joystick');
 const start=await phone.evaluate(()=>{const h=window.__splotNext.world.bodies.find(b=>b.id==='human');return [h.x,h.y];});
 const touch=await mobileContext.newCDPSession(phone),x=joystick.x+joystick.width*.5,y=joystick.y+joystick.height*.5;
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:51}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+28,y,id:51}]});
 await phone.waitForTimeout(430);
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 const moved=await phone.evaluate(()=>{const h=window.__splotNext.world.bodies.find(b=>b.id==='human');return [h.x,h.y];});
 const distance=Math.hypot(moved[0]-start[0],moved[1]-start[1]);
 assert.ok(distance>.25,'continued live physics after portrait restoration must accept real touch movement');
 report.portrait={restoredParts:loaded.parts.length,restoredCrates:loaded.bodies.filter(b=>b.id.startsWith('crate-')).length,
  resumedPhysics:true,touchMovementMeters:distance};
 await capture(phone,'08-mobile-live');
 await writeFile('/tmp/splot-R6-restore.json',JSON.stringify(report,null,2));
 console.log('PASS R6 one world: authored parts + crate → actual downloaded JSON → unsaved change → cancel → confirmed load → subsequent Undo → portrait import → mobile joystick');
 await phone.close();await mobileContext.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
