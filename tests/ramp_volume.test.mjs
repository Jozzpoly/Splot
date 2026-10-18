import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,getBody,raycast,bodyConflicts,walk,removeBridge} from '../src/world.mjs';

test('same sloped plank exists for vertical rays and body contacts at insufficient clearance',()=>{
 const w=createWorld();
 const hit=raycast(w,{x:36,y:27,z:2.05},{x:36,y:27,z:1.0});
 assert.ok(hit,'ramp should not be invisible to rays');
 assert.equal(hit.id,'ramp-slab');
 assert.ok(Math.abs(hit.at.z-2.6*2/3)<.01,hit);
 const a=getBody(w,'player');Object.assign(a,{x:36,y:27,z:0,support:'ground'});
 assert.ok(bodyConflicts(w,a).includes('ramp-slab'));
});

test('opening below high end has enough clearance for a 1.64 m actor',()=>{
 const w=createWorld(),a=getBody(w,'player');
 Object.assign(a,{x:36.9,y:27,z:0,support:'ground'});
 assert.equal(bodyConflicts(w,a).includes('ramp-slab'),false);
});

test('side ascent onto high part of a plank is stopped by geometry, not direction flag',()=>{
 const w=createWorld(),a=getBody(w,'player');
 Object.assign(a,{x:35.7,y:25.6,z:0,support:'ground'});
 const p=walk(w,'player',0,.9);
 assert.ok(a.y<26.15,{y:a.y,p});
 assert.equal(a.support,'ground');
});

test('removing bridge removes sloped collision body as well as support',()=>{
 const w=createWorld();removeBridge(w);
 assert.equal(raycast(w,{x:36,y:27,z:2.05},{x:36,y:27,z:1.0}),null);
 const a=getBody(w,'player');Object.assign(a,{x:36,y:27,z:0,support:'ground'});
 assert.ok(!bodyConflicts(w,a).includes('ramp-slab'));
});

test('30 sampled heights on plank have consistent support surface and vertical ray intersection',async()=>{
 const {surfaces,rampHeight}=await import('../src/world.mjs');
 const w=createWorld();
 for(let i=0;i<30;i++){
  const x=34.05+i*.099,y=27,z=rampHeight(x);
  const support=surfaces(w,x,y).find(s=>s.id==='ramp');
  assert.ok(support,`missing support x=${x}`);assert.ok(Math.abs(support.z-z)<1e-8);
  const hit=raycast(w,{x,y,z:z+.37},{x,y,z:z-.35},{ignore:['player','scout','boar','crate','deck-crate']});
  assert.ok(hit?.id==='ramp-slab',`ray disagree with authored ramp at x=${x}: ${JSON.stringify(hit)}`);
  assert.ok(Math.abs(hit.at.z-support.z)<1e-6);
 }
});

test('human walks under physically open high end while side at lower end remains blocked',()=>{
 const w=createWorld(),a=getBody(w,'player');Object.assign(a,{x:36.88,y:25.6,z:0,support:'ground'});
 const moved=walk(w,'player',0,1.3);
 assert.ok(moved.delta.dy>1.2,{moved,x:a.x,y:a.y});
 assert.equal(a.support,'ground');assert.equal(bodyConflicts(w,a).length,0);
});
