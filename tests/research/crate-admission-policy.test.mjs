// Research diagnostic only: existing permissive placement policy and exact
// Box3D square footprint disagree. These are CHARACTERISATIONS, NOT the
// accepted gameplay rules; do not tighten placement or delete overlaps.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveWorld,addCrate,getBody} from '../../src/next/spatial-sim.mjs';
import {insertElement,clearanceAt} from '../../src/next/spatial-core.mjs';

const fixture=()=>{
 const world=createLiveWorld();
 const result=insertElement(world.scene,{
  id:'box-wall-fixture',kind:'box',
  min:[8,8,0],max:[9,9,1],material:'stone'
 });
 assert.equal(result.ok,true);
 return world;
};
const intervalOverlap=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0);
const squareOverlap=(x,y,r=.43)=>({
 dx:intervalOverlap(x-r,x+r,8,9),
 dy:intervalOverlap(y-r,y+r,8,9)
});
test('OBSERVATION: legacy circular clearance rejects exact square-face tangency',()=>{
 const w=fixture(),x=7.57,y=8.5;
 const overlap=squareOverlap(x,y);
 assert.ok(Math.abs(overlap.dx)<1e-10&&overlap.dy>.8,'box and crate touch but have zero penetrating area');
 const old=clearanceAt(w.scene,{x,y,z:0,r:.43,h:.86});
 const allowed=addCrate(w,x,y);
 assert.equal(old.free,false);
 assert.deepEqual(old.contacts,['box-wall-fixture']);
 assert.equal(allowed.ok,false);
 assert.equal(allowed.reason,'occupied');
});
test('OBSERVATION: legacy circular clearance accepts square-corner interpenetration',()=>{
 const w=fixture(),x=7.66,y=7.66,overlap=squareOverlap(x,y);
 assert.ok(overlap.dx>.08&&overlap.dy>.08,'the real Box3D square overlaps box in both axes');
 const old=clearanceAt(w.scene,{x,y,z:0,r:.43,h:.86});
 const allowed=addCrate(w,x,y);
 assert.equal(old.free,true,'circle test misses a square-corner contact');
 assert.equal(allowed.ok,true,'existing placement lets physically penetrating crate into solver');
 const crate=getBody(w,allowed.id);
 assert.equal(crate.r,.43);
});
test('OBSERVATION: the same admission check ignores fully coincident live crates',()=>{
 const w=createLiveWorld(),original=getBody(w,'crate-1');
 const before=w.bodies.length;
 const result=addCrate(w,original.x,original.y,original.z);
 assert.equal(result.ok,true,'the present policy permits complete overlapping dynamic bodies');
 assert.equal(w.bodies.length,before+1);
 const next=getBody(w,result.id);
 assert.deepEqual([next.x,next.y,next.z],[original.x,original.y,original.z]);
});
// Before changing any behavior: measure solver response, distinguish
// actual stability from arbitrary prohibitions, preserve playful misuse.

test('EXPERIMENT: solver-owned admission permits intentional overlap but retains finite bounds',()=>{
 const w=fixture();
 assert.equal(addCrate(w,7.57,8.5,0,{admission:'solver'}).ok,true);
 assert.equal(addCrate(w,8.5,8.5,0,{admission:'solver'}).ok,true);
 const c=w.bodies.find(b=>b.id==='crate-1');
 assert.equal(addCrate(w,c.x,c.y,c.z,{admission:'solver'}).ok,true);
 assert.equal(addCrate(w,-3,8,0,{admission:'solver'}).reason,'bounds');
 assert.equal(addCrate(w,8,8,Infinity,{admission:'solver'}).reason,'bounds');
 assert.equal(addCrate(w,8,8,30,{admission:'solver'}).reason,'bounds');
 assert.throws(()=>addCrate(w,8,8,0,{admission:'unknown'}),/unknown-crate-admission/);
});
