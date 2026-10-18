import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,getBody,placeObject,eraseObject,eraseNear,bodyConflicts,walk,raycast,snapshot,restore,tickWorld} from '../src/world.mjs';
const eq=(a,b,eps=.001)=>assert(Math.abs(a-b)<=eps,`${a} != ${b}`);

test('an accepted free-authored crate is a physical body, not visual scenery',()=>{
 const w=createWorld(),p=getBody(w,'player');Object.assign(p,{x:22,y:18,z:0,support:'ground'});
 const add=placeObject(w,'crate',22.89,18);assert.equal(add.ok,true);const c=getBody(w,add.id);assert.equal(c.kind,'crate');
 assert.equal(bodyConflicts(w,c).length,0);
 const oldX=c.x,oldP=p.x;const movement=walk(w,'player',.50,0,{emit:true});
 assert(movement.delta.dx>.45);assert(c.x>oldX+.15);assert(p.x>oldP+.45);
 assert(w.history.some(x=>x.type==='push'&&x.targets.includes(c.id)));
});

test('authored wall blocks actor and a ray in the same geometry',()=>{
 const w=createWorld(),p=getBody(w,'player');Object.assign(p,{x:20,y:19,z:0,support:'ground'});
 const add=placeObject(w,'wall',21,19);assert.equal(add.ok,true);
 const old=p.x;walk(w,'player',2.5,0,{emit:false});
 assert(p.x<20.5,`barrier must stop actor, actual ${p.x}`);assert(p.x>old);
 const hit=raycast(w,{x:20,y:19,z:.8},{x:22,y:19,z:.8},{ignore:w.bodies.map(x=>x.id)});
 assert.equal(hit.id,add.id);
});

test('rejected edit and attempted erasure of baseline do not mutate world',()=>{
 const w=createWorld();const before=snapshot(w);
 assert.equal(placeObject(w,'crate',41.1,27).ok,false);assert.equal(snapshot(w),before);
 assert.equal(eraseObject(w,'crate').ok,false);assert.equal(snapshot(w),before);
 assert.equal(eraseObject(w,'north-wall').ok,false);assert.equal(snapshot(w),before);
});

test('removing a user-created obstacle opens path and invalidates the planner',()=>{
 const w=createWorld();const add=placeObject(w,'wall',40,20);assert.equal(add.ok,true);
 tickWorld(w,{ai:true});assert(w.nav.path.length>0);
 const prior=w.revision;const res=eraseNear(w,40.05,20.05);assert(res.ok);assert.equal(w.revision,prior+1);
 assert.equal(w.nav.path.length,0);assert.equal(w.authored.length,0);
 assert.equal(raycast(w,{x:39,y:20,z:.7},{x:41,y:20,z:.7},{ignore:w.bodies.map(x=>x.id)}),null);
});

test('save restores authored walls/crates and canonical editing id sequence',()=>{
 const w=createWorld();const a=placeObject(w,'wall',20,10),b=placeObject(w,'crate',22,10);
 assert(a.ok&&b.ok);const copy=restore(snapshot(w));assert.equal(snapshot(copy),snapshot(w));
 assert.equal(copy.authored.length,1);assert(getBody(copy,b.id));
 const c=placeObject(copy,'crate',23,10);assert.equal(c.ok,true);assert.notEqual(b.id,c.id);
});

test('invalid authored volume, duplicate id, unsupported body, or overlap cannot enter the world on restore',()=>{
 const w=createWorld();placeObject(w,'crate',22,10);placeObject(w,'wall',20,10);
 const variants=[
  x=>{x.authored[0].maxX=999;},
  x=>{x.authored[0].id='crate';},
  x=>{x.authored.push({...x.authored[0]});},
  x=>{x.bodies.find(b=>b.id.startsWith('made-crate-')).x=41.1;x.bodies.find(b=>b.id.startsWith('made-crate-')).y=27;},
 ];
 for(const mutate of variants){const bad=JSON.parse(snapshot(w));mutate(bad);assert.throws(()=>restore(bad));}
});

test('authoring is independent of the central demo coordinates',()=>{
 for(const [x,y] of [[5,5],[20,42],[70,45]]){
  const w=createWorld();const a=placeObject(w,'crate',x,y);const b=placeObject(w,'wall',x+1.8,y);
  assert(a.ok&&b.ok,`${x},${y}: ${JSON.stringify({a,b})}`);const round=restore(snapshot(w));eq(getBody(round,a.id).x,x);assert.equal(round.authored[0].id,b.id);
 }
});

test('authored volume changes the boar route, not just the painting',()=>{
 const base=createWorld();tickWorld(base,{ai:true});const old=base.nav.path.map(p=>[p.x,p.y]);
 const w=createWorld();const wp=old[Math.max(5,Math.floor(old.length*.45))];
 const add=placeObject(w,'wall',wp[0],wp[1]);assert.equal(add.ok,true,JSON.stringify({wp,add}));
 tickWorld(w,{ai:true});const after=w.nav.path.map(p=>[p.x,p.y]);
 assert.notDeepEqual(after,old);
 assert(after.every(([x,y])=>!(Math.abs(x-wp[0])<.3&&Math.abs(y-wp[1])<.3)));
});

test('authored deck wall cannot float after support is removed',async()=>{
 const {removeBridge}=await import('../src/world.mjs');const w=createWorld();
 const place=placeObject(w,'wall',44,29,{level:'bridge'});assert(place.ok,JSON.stringify(place));
 const bottom=placeObject(w,'crate',44,29,{level:'ground'});assert(bottom.ok);
 removeBridge(w);assert.equal(w.authored.length,0);
 assert.equal(getBody(w,bottom.id).support,'ground');
 assert(w.history.some(e=>e.type==='editor-part-lost'&&e.id===place.id));
 const bad=JSON.parse(snapshot(w));bad.authored.push({id:'made-wall-999',minX:44,minY:29,maxX:44.8,maxY:29.8,minZ:2.6,maxZ:4.1});bad.nextId=1000;
 assert.throws(()=>restore(bad),/Unsupported authored/);
});

test('repeated authored changes are deterministic and valid after save/restore',async()=>{
 const {tickWorld}=await import('../src/world.mjs');
 const run=()=>{const w=createWorld(322);let count=0;
  for(let i=0;i<100;i++){
   const x=4+(i*17%72),y=4+(i*19%46),kind=i%3===0?'wall':'crate';
   const a=placeObject(w,kind,x,y);if(a.ok)count++;
   if(i%7===0){const selected=w.authored[0]||w.bodies.find(b=>b.id.startsWith('made-crate-'));if(selected)eraseObject(w,selected.id);}
   tickWorld(w,{ai:false,move:[Math.sin(i),Math.cos(i)]});
  }
  for(let i=0;i<360;i++)tickWorld(w,{ai:false,move:[Math.sin(i*.03),Math.cos(i*.02)]});
  const saved=snapshot(w);assert.equal(snapshot(restore(saved)),saved);
  for(const b of w.bodies)assert.deepEqual(bodyConflicts(w,b),[]);
  return {count,saved};
 };
 const a=run(),b=run();assert(a.count>25);assert.equal(a.saved,b.saved);
});

test('removing a supporting authored wall must start a fall, not leave an invisible platform',async()=>{
 const {gravityStep}=await import('../src/world.mjs');
 const w=createWorld(),p=getBody(w,'player');const wall=placeObject(w,'wall',20,20);assert(wall.ok);
 Object.assign(p,{x:20,y:20,z:1.5,support:'solid:'+wall.id,vz:0});
 assert.equal(bodyConflicts(w,p).length,0);
 const removed=eraseObject(w,wall.id);assert(removed.ok);
 gravityStep(w);assert.equal(p.support,null);assert(p.z<1.5);
});

test('an unreachable target does not cause A* to thrash, while opening a passage causes replanning and escape',()=>{
 const w=createWorld(),boar=getBody(w,'boar');Object.assign(boar,{x:40,y:35,z:0,support:'ground'});
 Object.assign(getBody(w,'player'),{x:43.4,y:37.2,z:0,support:'ground'});
 w.goal={id:'food',x:45,y:35,z:0,eaten:false};
 let count=0;for(let i=0;i<=4;i++)for(let j=0;j<=4;j++)if(i===0||i===4||j===0||j===4){
  const a=placeObject(w,'wall',38.4+i*.8,33.4+j*.8);assert(a.ok,JSON.stringify(a));count++;
 }
 assert.equal(count,16);
 for(let i=0;i<900;i++)tickWorld(w,{ai:true});
 assert.equal(w.goal.eaten,false);assert(w.stats.routes<=6,`unreachable route replanned ${w.stats.routes} times`);
 const before=w.stats.routes;
 for(let j=1;j<=3;j++)assert(eraseNear(w,41.6,33.4+j*.8).ok);
 let escaped=false;for(let i=0;i<1800;i++){tickWorld(w,{ai:true});if(w.goal.eaten){escaped=true;break;}}
 assert(escaped,'animal should reach the goal once the created passage is open');
 assert(w.stats.routes>before);
});
