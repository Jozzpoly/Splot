import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,getBody,toggleGrip,walk,commitHorizontal,canReach,bodyConflicts,snapshot,restore,placeObject,eraseObject,removeBridge,tickWorld} from '../src/world.mjs';
const clone=s=>JSON.parse(JSON.stringify(s));
function initial(){const w=createWorld();walk(w,'player',.75,0,{emit:false});return w;}
function reposition(w,x,y,crateX=x+1,crateY=y){const a=getBody(w,'player'),b=getBody(w,'crate');Object.assign(a,{x,y,z:0,support:'ground'});Object.assign(b,{x:crateX,y:crateY,z:0,support:'ground'});return w;}
test('grab cannot occur at a distance or implicitly pull object',()=>{
 const w=createWorld(),before=snapshot(w),r=toggleGrip(w);assert.equal(r.ok,false);assert.deepEqual(JSON.parse(snapshot(w)).bodies,JSON.parse(before).bodies);assert.equal(w.grips.player,undefined);
});
test('nearby grounded crate can be gripped and released, without teleporting it',()=>{
 const w=initial(),crate=getBody(w,'crate'),before={x:crate.x,y:crate.y};let r=toggleGrip(w);assert.equal(r.ok,true);assert.deepEqual({x:crate.x,y:crate.y},before);assert.equal(w.grips.player,'crate');r=toggleGrip(w);assert.equal(r.ok,true);assert.equal(w.grips.player,undefined);
});
test('dragging moves grounded bodies together with constant separation',()=>{
 const w=initial();assert.equal(toggleGrip(w).ok,true);const a=getBody(w,'player'),b=getBody(w,'crate'),gap=b.x-a.x;let r=walk(w,'player',-.55,.2,{emit:true});assert.ok(Math.hypot(r.delta.dx,r.delta.dy)>.48,r);assert.ok(Math.abs((b.x-a.x)-gap)<1e-6);assert.ok(Math.abs(b.y-a.y)<1e-6);assert.ok(w.stats.drags>0);assert.ok(w.history.some(e=>e.type==='drag'));
});
test('static obstacle blocking the crate rejects movement of both bodies atomically',()=>{
 const w=reposition(createWorld(),12,12,13,12);assert.equal(toggleGrip(w).ok,true);let r=placeObject(w,'wall',14,12);assert.equal(r.ok,true);
 const a=getBody(w,'player'),b=getBody(w,'crate'),p=[a.x,b.x];r=commitHorizontal(w,'player',.26,0);
 assert.equal(r.ok,false);assert.deepEqual([a.x,b.x],p);assert.ok(w.history.some(e=>e.type==='blocked'));
});
test('other actor blocking the crate also blocks whole pair',()=>{
 const w=reposition(createWorld(),12,12,13,12);Object.assign(getBody(w,'boar'),{x:14,y:12,z:0,support:'ground'});
 assert.equal(toggleGrip(w).ok,true);const a=getBody(w,'player'),b=getBody(w,'crate');const r=commitHorizontal(w,'player',.3,0);assert.equal(r.ok,false);assert.equal(a.x,12);assert.equal(b.x,13);
});
test('new player-built crate is grabbable; authored deletion refuses held crate',()=>{
 const w=reposition(createWorld(),12,12,24,12),r=placeObject(w,'crate',13,12);assert.equal(r.ok,true);assert.equal(toggleGrip(w,'player',r.id).ok,true);
 const before=clone(w.bodies);assert.deepEqual(eraseObject(w,r.id),{ok:false,reason:'held-by-actor'});assert.deepEqual(w.bodies,before);
 assert.equal(toggleGrip(w).ok,true);assert.equal(eraseObject(w,r.id).ok,true);
});
test('snapshot roundtrip preserves grip and validates tampered state',()=>{
 const w=initial();assert.equal(toggleGrip(w).ok,true);const restored=restore(snapshot(w));assert.equal(restored.grips.player,'crate');
 walk(restored,'player',-.15,0);assert.ok(Math.abs(getBody(restored,'crate').x-42.85)<.01);
 for(const tampered of [{grips:{player:'missing'}},{grips:{boar:'crate'}},{grips:{player:'deck-crate'}}]){
  const data=JSON.parse(snapshot(w));Object.assign(data,tampered);assert.throws(()=>restore(data),/Invalid grip/);
 }
});
test('bridge removal releases the grip without erasing the crate',()=>{
 const w=createWorld();const a=getBody(w,'scout'),b=getBody(w,'deck-crate');a.x=42.7;a.y=27;
 assert.equal(toggleGrip(w,'scout','deck-crate').ok,true);removeBridge(w);
 assert.equal(w.grips.scout,undefined);assert.ok(getBody(w,'deck-crate'));assert.equal(getBody(w,'scout').support,null);
});
test('no ground-to-upper-level magnetic drag even in close XY',()=>{
 const w=createWorld(),a=getBody(w,'player');a.x=43.0;a.y=27;assert.equal(toggleGrip(w,'player','deck-crate').ok,false);
});
test('unheld original pushing still works',()=>{
 const w=initial();const b=getBody(w,'crate'),x=b.x;walk(w,'player',.65,0);assert.ok(b.x>x+.15);
});
test('one crate cannot be owned by two actors at once',()=>{
 const w=reposition(createWorld(),12,12,13,12);const scout=getBody(w,'scout');Object.assign(scout,{x:13,y:13,z:0,support:'ground'});
 assert.equal(toggleGrip(w,'player','crate').ok,true);assert.equal(toggleGrip(w,'scout','crate').ok,false);
});
test('drag tests from different world regions without a special central arena rule',()=>{
 for(const [x,y] of [[7,7],[20,45],[73,11],[74,42]]){
  const w=reposition(createWorld(),x,y,x+1,y);assert.equal(toggleGrip(w).ok,true,`${x},${y}`);
  const a=getBody(w,'player'),b=getBody(w,'crate');let p=[a.x,b.x];walk(w,'player',0,.25);assert.ok(a.y>y+.2,`${x},${y}`);assert.ok(Math.abs((b.x-a.x)-(p[1]-p[0]))<1e-7);
 }
});
test('moved crate invalidates navigation at bounded physical displacement, not each substep',()=>{
 const w=reposition(createWorld(),9,9,10,9);assert.equal(toggleGrip(w).ok,true);const start=w.revision;
 walk(w,'player',-.30,0);assert.equal(w.revision,start);
 walk(w,'player',-.30,0);assert.equal(w.revision,start+1);
 walk(w,'player',-.05,0);assert.equal(w.revision,start+1);
 const anchors=w.nav.motionAnchors;assert.ok(anchors.crate);
 const w2=restore(snapshot(w));assert.deepEqual(w2.nav.motionAnchors,anchors);
});
test('boar planner reads a crate moved by player grip without a special-case action',()=>{
 const w=createWorld();Object.assign(getBody(w,'boar'),{x:10,y:10,z:0,support:'ground'});
 w.goal={id:'food',x:17,y:10,z:0,eaten:false};
 Object.assign(getBody(w,'player'),{x:13,y:11,z:0,support:'ground'});
 Object.assign(getBody(w,'crate'),{x:14,y:11,z:0,support:'ground'});
 tickWorld(w,{ai:true});const before=w.nav.path.length,oldRevision=w.revision;
 assert.equal(toggleGrip(w).ok,true);walk(w,'player',0,-.95);assert.ok(w.revision>oldRevision);
 tickWorld(w,{ai:true});assert.equal(w.stats.routes,2);assert.ok(w.nav.path.length>before,{before,after:w.nav.path.length});
});
test('deterministic drag and release sequence does not generate overlapping bodies',()=>{
 const w=reposition(createWorld(),11,13,12,13),seq=[];
 assert.equal(toggleGrip(w).ok,true);
 let state=0xabcddf11;const rand=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
 for(let i=0;i<1000;i++){
  let a=(rand()-.5)*.16,b=(rand()-.5)*.16;walk(w,'player',a,b,{emit:false});
  for(const v of w.bodies)assert.deepEqual(bodyConflicts(w,v),[],`step ${i} ${v.id}`);
  seq.push([getBody(w,'player').x,getBody(w,'crate').x]);
 }
 const w2=reposition(createWorld(),11,13,12,13);toggleGrip(w2);state=0xabcddf11;
 for(let i=0;i<1000;i++)walk(w2,'player',(rand()-.5)*.16,(rand()-.5)*.16,{emit:false});
 assert.ok(Math.abs(getBody(w,'crate').x-getBody(w2,'crate').x)<1e-8);
 assert.ok(Math.abs(getBody(w,'player').y-getBody(w2,'player').y)<1e-8);
});
test('continuous ramp-to-bridge crossing does not require identical support labels',()=>{
 const w=createWorld(),a=getBody(w,'player'),b=getBody(w,'crate');
 for(const [body,x] of [[a,35],[b,36]])Object.assign(body,{x,y:27,z:(x-34)/3*2.6,support:'ramp'});
 assert.equal(toggleGrip(w,'player','crate').ok,true);
 const moved=walk(w,'player',1.5,0);
 assert.ok(moved.delta.dx>1.35,moved);
 assert.equal(b.support,'bridge');assert.ok(['ramp','bridge'].includes(a.support));
 for(const q of w.bodies)assert.deepEqual(bodyConflicts(w,q),[]);
});
test('different levels cannot create a grip across a vertical gap of 2.6 m',()=>{
 const w=createWorld(),a=getBody(w,'player'),b=getBody(w,'deck-crate');
 Object.assign(a,{x:b.x-1,y:b.y,z:0,support:'ground'});
 assert.equal(toggleGrip(w,'player','deck-crate').ok,false);
});
test('an authored passage opens a shorter boar route after actor physically drags crate away',()=>{
 const w=createWorld();
 Object.assign(getBody(w,'player'),{x:46.7,y:27.93,z:0,support:'ground'});
 Object.assign(getBody(w,'crate'),{x:47.75,y:27.93,z:0,support:'ground'});
 Object.assign(getBody(w,'boar'),{x:43.8,y:27.93,z:0,support:'ground'});
 w.goal={id:'food',x:50.2,y:27.93,z:0,eaten:false};
 tickWorld(w,{ai:true});const blockedLength=w.nav.path.length;
 assert.equal(toggleGrip(w).ok,true);
 const first=walk(w,'player',-1.5,0);const second=walk(w,'player',0,1.8);
 assert.ok(first.delta.dx< -1.3);assert.ok(second.delta.dy>1.0);
 tickWorld(w,{ai:true});const openLength=w.nav.path.length;
 assert.ok(openLength<blockedLength-10,{blockedLength,openLength});
 for(let i=0;i<900&&!w.goal.eaten;i++)tickWorld(w,{ai:true});
 assert.equal(w.goal.eaten,true);
});
