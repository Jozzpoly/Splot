// Research gate ONLY. Deliberately outside tests/*.test.mjs to prevent
// 3 known failures from being misreported as a broken historical K2 release.
// Run: node --test tests/research/causal-pressure.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveWorld,getBody,moveBody,stepLive} from '../../src/next/spatial-sim.mjs';
import {insertElement,removeElement,clearanceAt,supportCandidates,
 makeCamera,projectPoint,rayFromPixel,exportWorld,importWorld} from '../../src/next/spatial-core.mjs';
const tick=(w,n,input=[0,0])=>{for(let i=0;i<n;i++)stepLive(w,1/60,input)};

test('RED: ordinary player locomotion reaches height along the built-in ramp',()=>{
 const w=createLiveWorld(),b=getBody(w,'human');
 Object.assign(b,{x:12,y:13,z:0,support:'ground',vz:0});
 tick(w,180,[1,0]);
 assert.ok(b.x>16,'player blocked at x='+b.x.toFixed(3));
 assert.ok(b.z>1,'player has not ascended');
 assert.equal(b.support,'footbridge-ramp');
});

test('RED: permissive editing through a body must not create silent permanent overlap',()=>{
 const w=createLiveWorld(),b=getBody(w,'human');
 const result=insertElement(w.scene,{id:'owner-overlap',kind:'box',
  min:[b.x-.3,b.y-.3,0],max:[b.x+.3,b.y+.3,1.5],material:'stone'});
 assert.equal(result.ok,true,'do not substitute arbitrary prohibition for contact');
 tick(w,120);
 const q=clearanceAt(w.scene,{x:b.x,y:b.y,z:b.z,r:b.r,h:b.h,supportId:b.support});
 const explained=w.events.some(e=>['penetration-resolved','authoring-contact','collision-invalidated'].includes(e.type));
 assert.ok(q.free||explained,'unexplained persistent contact: '+q.contacts.join(','));
});

test('control: removing elevated support makes the actor fall and land',()=>{
 const w=createLiveWorld(),b=getBody(w,'human');
 Object.assign(b,{x:23,y:13,z:2.4,support:'footbridge-deck',vz:0});
 assert.equal(removeElement(w.scene,'footbridge-deck').ok,true);
 tick(w,100);
 assert.equal(b.support,'ground');assert.equal(b.z,0);
 assert.ok(w.events.some(e=>e.type==='land'&&e.id===b.id&&e.on==='ground'));
});

test('control: crate can move across deck lip, fall and land',()=>{
 const w=createLiveWorld(),c=getBody(w,'crate-1');
 Object.assign(c,{x:27,y:13,z:2.4,support:'footbridge-deck',vz:0});
 for(let i=0;i<110;i++){moveBody(w,c.id,[1,0],1/60);stepLive(w,1/60)};
 assert.ok(c.x>28);assert.equal(c.support,'ground');assert.equal(c.z,0);
 assert.ok(w.events.some(e=>e.type==='land'&&e.id===c.id&&e.on==='ground'));
});

test('control: independently added and removed parts affect support queries',()=>{
 const w=createLiveWorld(),part={id:'owner-panel',kind:'panel',
  a:[7,7,2.6],b:[12,7,2.6],width:2,thickness:.25,material:'wood'};
 assert.equal(insertElement(w.scene,part).ok,true);
 assert.ok(supportCandidates(w.scene,9,7).some(s=>s.id===part.id&&Math.abs(s.z-2.6)<1e-7));
 assert.equal(removeElement(w.scene,part.id).ok,true);
 assert.ok(!supportCandidates(w.scene,9,7).some(s=>s.id===part.id));
});

test('control: changing camera cannot mutate authoritative geometry',()=>{
 const w=createLiveWorld(),before=exportWorld(w.scene),point=[22,13,2.4];
 const a=makeCamera({target:[21,13,0],azimuth:0,elevation:1.1});
 const b=makeCamera({target:[21,13,0],azimuth:.75,elevation:1.1});
 const p=projectPoint(a,point),q=projectPoint(b,point);
 assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>1);
 for(const [camera,proj] of [[a,p],[b,q]]){
  const ray=rayFromPixel(camera,proj.x,proj.y);
  assert.ok(Math.abs(Math.hypot(...ray.direction)-1)<1e-8);
 }
 assert.equal(exportWorld(w.scene),before);
});

test('limited control: two overlapping XY bodies at different Z stay separated',()=>{
 const w=createLiveWorld(),a=getBody(w,'human'),b=getBody(w,'crate-1');
 Object.assign(a,{x:22,y:13,z:0,support:'ground'});
 Object.assign(b,{x:22,y:13,z:2.4,support:'footbridge-deck'});
 moveBody(w,'human',[.1,0],1/60);
 assert.equal(b.z,2.4);
 assert.ok(!w.events.some(e=>e.type==='blocked'&&e.by===b.id));
});

test('control: authored scene serialization preserves stable identities',()=>{
 const w=createLiveWorld(),saved=exportWorld(w.scene),loaded=importWorld(saved);
 assert.deepEqual(loaded.elements.map(e=>e.id),w.scene.elements.map(e=>e.id));
 assert.equal(exportWorld(loaded),saved);
});

test('RED: freely placed part must declare static/dynamic/kinematic lifecycle intent',()=>{
 const w=createLiveWorld();
 assert.equal(insertElement(w.scene,{id:'midair',kind:'panel',
  a:[6,6,5],b:[10,6,5],width:2,thickness:.2,material:'wood'}).ok,true);
 assert.ok(['anchored','kinematic','dynamic'].includes(w.scene.elements.at(-1).motionType),
  'implicit static is not a complete material construction contract');
});
