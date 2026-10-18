import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,getBody,proposeHorizontal,commitHorizontal,walk,removeBridge,tickWorld,gravityStep,raycast,canReach,surfaces,bodyConflicts,snapshot,restore,DT} from '../src/world.mjs';
const near=(x,y,eps=.002)=>assert(Math.abs(x-y)<eps,`${x} != ${y}`);
test('same XY, separate XYZ heights are legitimate',()=>{let w=createWorld(),p=getBody(w,'player'),q=getBody(w,'scout');near(p.x,q.x);near(p.y,q.y);assert.equal(bodyConflicts(w,p).length,0);assert.equal(bodyConflicts(w,q).length,0);});
test('push transaction does not mutate the state when actor is blocked',()=>{
 const w=createWorld(),p=getBody(w,'player'),o=getBody(w,'crate');p.x=42.15;p.y=27;o.x=43;o.y=27;
 const boar=getBody(w,'boar');boar.x=42.52;boar.y=27.66;
 let before=snapshot(w);let trial=proposeHorizontal(w,'player',.35,0);assert.equal(trial.ok,false);assert.equal(snapshot(w),before);let result=commitHorizontal(w,'player',.35,0);assert.equal(result.ok,false);assert.equal(getBody(w,'crate').x,43);assert.equal(getBody(w,'player').x,42.15);assert.equal(w.events.length,1);assert.equal(w.events[0].type,'blocked');});
test('accepted push moves player and crate in same atomic substep',()=>{
 const w=createWorld();const p=getBody(w,'player'),o=getBody(w,'crate');p.x=42.15;p.y=27;o.x=43;o.y=27;const before=o.x;
 const res=walk(w,'player',.30,0,{strength:120});assert(res.delta.dx>.25);near(o.x-before,.20);assert(w.history.some(x=>x.type==='push'));
});
test('mass rejects entire multi-object chain',()=>{
 const w=createWorld(),p=getBody(w,'player'),o=getBody(w,'crate'),z=getBody(w,'deck-crate');p.x=42.15;p.y=27;o.x=43;o.y=27;z.x=43.83;z.y=27;z.z=0;z.support='ground'; const before=[p.x,o.x,z.x];const r=commitHorizontal(w,'player',.30,0,{strength:40});assert.equal(r.ok,false);assert.deepEqual([p.x,o.x,z.x],before);
});
test('statically blocked mover does not push a crate through wall',()=>{
 const w=createWorld(),p=getBody(w,'player'),o=getBody(w,'crate');p.x=46.12;p.y=28.2;o.x=46.9;o.y=28.2;let x=o.x;const r=commitHorizontal(w,'player',.3,0);assert.equal(r.ok,false);near(o.x,x);
});
test('same XY in two layers: interaction is height-bounded',()=>{
 const w=createWorld(),p=getBody(w,'player'),q=getBody(w,'scout'),o=getBody(w,'crate'),dc=getBody(w,'deck-crate');p.x=o.x-.7;p.y=o.y; q.x=dc.x-.7;q.y=dc.y;assert.equal(canReach(w,p.id,dc.id).ok,false);assert.equal(canReach(w,q.id,o.id).ok,false);
});
test('volume raycast distinguishes deck obstruction from underpass',()=>{
 const w=createWorld();assert.equal(raycast(w,{x:40,y:26.7,z:1},{x:40,y:26.7,z:3.7})?.id,'slab-middle');assert.equal(raycast(w,{x:38.5,y:26.65,z:1},{x:43,y:26.65,z:1},{ignore:['player','scout','boar','crate','deck-crate']}),null);
});
test('removing deck enters gravity; no instant teleport to ground',()=>{
 const w=createWorld(),q=getBody(w,'scout');removeBridge(w);assert.equal(q.support,null);near(q.z,2.6);gravityStep(w,DT);assert(q.z<2.6&&q.z>2.3);assert(w.history.some(e=>e.type==='support-lost'));
});
test('fall catches body underneath without interpenetrating it, documenting temporary stacking',()=>{
 const w=createWorld();removeBridge(w);for(let i=0;i<170;i++)gravityStep(w,DT);const p=getBody(w,'player'),q=getBody(w,'scout');assert.equal(q.support,'body:player');near(q.z,p.z+p.h);assert.equal(bodyConflicts(w,q).length,0);
});
test('save restore preserves valid canonical states and refuses impossible overlap',()=>{
 const w=createWorld();const copy=restore(snapshot(w));assert.equal(snapshot(copy),snapshot(w));const broken=JSON.parse(snapshot(w));const p=broken.bodies.find(b=>b.id==='player'),o=broken.bodies.find(b=>b.id==='crate');Object.assign(o,{x:p.x,y:p.y,z:p.z});assert.throws(()=>restore(broken),/overlaps/);
});
test('full replay of identical input yields identical canonical snapshot',()=>{
 const run=()=>{const w=createWorld(17);for(let i=0;i<250;i++){tickWorld(w,{selected:'player',move:[Math.cos(i/17),Math.sin(i/17)],ai:false});if(i===130)removeBridge(w);}return snapshot(w);};assert.equal(run(),run());
});
test('terrain seed changes world, without changing collider truth',async()=>{
 const {terrain}=await import('../src/world.mjs');let delta=0;for(let x=0;x<84;x++)for(let y=0;y<54;y++)if(terrain(x,y,11)!==terrain(x,y,12))delta++;assert(delta>300);
});
test('KNOWN LIMITATION: fall may settle on another actor head, not physically valid long-term gameplay',()=>{const w=createWorld();removeBridge(w);for(let i=0;i<150;i++)gravityStep(w);assert.equal(getBody(w,'scout').support,'body:player');});

test('ray uses the same body cylinder geometry, not false bounding-box corners',()=>{
 const w=createWorld(),b=getBody(w,'crate');const start={x:b.x+b.r*.92,y:b.y+b.r*.92,z:.42};
 const end={x:start.x+.02,y:start.y+.02,z:.42};
 assert.equal(raycast(w,start,end,{ignore:['player','scout','boar','deck-crate']}),null);
});
test('ramp ascent uses continuous z, no vertical teleport',()=>{
 const w=createWorld(),p=getBody(w,'player');Object.assign(p,{x:33.75,y:27,z:0,support:'ground'});let prior=0;
 for(let i=0;i<115;i++){const m=walk(w,'player',.04,0,{emit:false});assert(m.delta.dx>.039);assert(p.z>=prior-.001);assert(p.z-prior<=.05);prior=p.z;}
 near(p.z,2.6);assert.equal(p.support,'bridge');
});
test('forager chooses route around wall and reaches food exactly once',()=>{
 const w=createWorld();for(let i=0;i<1200;i++)tickWorld(w,{ai:true});
 assert.equal(w.goal.eaten,true);assert.equal(w.history.filter(e=>e.type==='food-reached').length,1);assert(w.stats.routes>0);
});

test('material remembers accepted player / boar / crate contacts but rejects failed pushes',()=>{
 const w=createWorld(),p=getBody(w,'player'),o=getBody(w,'crate');
 p.x=42.15;p.y=27;o.x=43;o.y=27;
 const m=walk(w,'player',.3,0,{emit:true});
 assert(Object.keys(w.imprints).length>0);assert([...Object.values(w.imprints)].every(v=>v>0));
 const old={...w.imprints};const boar=getBody(w,'boar');boar.x=p.x+.1;boar.y=p.y+.67;
 commitHorizontal(w,'player',.25,0);
 // A rejected attempt must not produce NEW field changes.
 if(w.history.at(-1)?.type==='blocked') assert.deepEqual(w.imprints,old);
});

test('walking over a deck edge falls onto actual obstruction below, not through it',()=>{
 const w=createWorld(),s=getBody(w,'scout');Object.assign(s,{x:46.7,y:27,z:2.6,support:'bridge'});
 for(let i=0;i<25;i++)walk(w,'scout',.04,0,{emit:true});
 assert.equal(s.support,null);assert(s.z>2.5);assert(w.history.some(e=>e.type==='support-lost'&&e.id==='scout'));
 // Former fixture expected ground because an airborne actor froze before the wall.
 // Real airborne steering now carries it over north-wall (2.2 m high).
 for(let i=0;i<70;i++)gravityStep(w);assert.equal(s.support,'solid:north-wall');assert.equal(s.z,2.2);
});

test('restore refuses unsupported bodies floating with forged ground support',()=>{
 const w=createWorld();const raw=JSON.parse(snapshot(w));raw.bodies[0].z=8;raw.bodies[0].support='ground';assert.throws(()=>restore(raw),/support/);
});
test('high portion of an open wooden ramp allows a ray below its underside',()=>{
 const w=createWorld();const hit=raycast(w,{x:35.5,y:27,z:.45},{x:35.6,y:27,z:.45},{ignore:['player','scout','boar','crate','deck-crate']});
 assert.equal(hit,null); // A raised thin plank is open below its underside; not a filled earth wedge.
});

test('material blockade changes an autonomous route without a special AI rule for crates',()=>{
 const simple=createWorld();tickWorld(simple,{ai:true});const n=simple.nav.path.length;
 const blocked=createWorld(),c=getBody(blocked,'crate');c.x=47.76;c.y=27.93;assert.equal(bodyConflicts(blocked,c).length,0);
 tickWorld(blocked,{ai:true});assert(blocked.nav.path.length>n);let reached=null;
 for(let i=0;i<1800;i++){const ev=tickWorld(blocked,{ai:true});if(ev.some(e=>e.type==='food-reached')){reached=blocked.time;break;}}
 assert(reached>12&&reached<20);
});
