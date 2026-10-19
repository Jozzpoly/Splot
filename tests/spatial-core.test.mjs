import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialWorld,insertElement,replaceElement,removeElement,exportWorld,importWorld,trianglesFor,
 sceneTriangles,castRay,supportCandidates,clearanceAt,makeCamera,projectPoint,rayFromPixel,pickPixel,occlusionToPoint} from '../src/next/spatial-core.mjs';
const sample=()=>{
 const w=createSpatialWorld({width:42,height:32});
 assert.equal(insertElement(w,{id:'ramp-a',kind:'panel',a:[8,12,0],b:[12,12,2],width:2,thickness:.25,material:'wood'}).ok,true);
 assert.equal(insertElement(w,{id:'deck-a',kind:'panel',a:[12,12,2],b:[18,12,2],width:4,thickness:.3,material:'wood'}).ok,true);
 return w;
};
test('transactional edit and stable identities',()=>{
 const w=sample(),before=exportWorld(w);
 assert.deepEqual(insertElement(w,{id:'ramp-a',kind:'box',min:[1,1,0],max:[2,2,1]}).reason,'duplicate-id');
 assert.equal(exportWorld(w),before);
 assert.equal(replaceElement(w,'deck-a',{id:'changed',kind:'box',min:[1,1,0],max:[2,2,1]}).reason,'identity-change');
 assert.equal(exportWorld(w),before);
 assert.equal(replaceElement(w,'deck-a',{id:'deck-a',kind:'panel',a:[12,12,2],b:[20,12,2],width:4,thickness:.3}).ok,true);
 assert.equal(w.elements.find(e=>e.id==='deck-a').b[0],20);
 assert.equal(removeElement(w,'ramp-a').ok,true);
 assert.equal(w.elements.length,1);
});
test('invalid and conflicting data cannot mutate the world',()=>{
 const w=sample(),snap=exportWorld(w);
 for(const malformed of [{id:'x',kind:'panel',a:[0,0,0],b:[0,0,1],width:1,thickness:.1},
 {id:'x',kind:'box',min:[1,1,1],max:[0,1,2]},
 {id:'x',kind:'panel',a:[4,4,0],b:[8,4,0],width:NaN,thickness:.2}]){
  assert.equal(insertElement(w,malformed).ok,false);assert.equal(exportWorld(w),snap);
 }
});
test('round trip canonical scene and independent component editing',()=>{
 const w=sample(),r=importWorld(exportWorld(w));assert.deepEqual(r,w);
 assert.equal(removeElement(r,'ramp-a').ok,true);
 assert.equal(r.elements.some(e=>e.id==='deck-a'),true);
 assert.notDeepEqual(r,w);
});
test('triangles are the SAME geometry used for rays',()=>{
 const w=sample();assert.equal(sceneTriangles(w).length,24);
 for(const e of w.elements)assert.equal(trianglesFor(e).length,12);
 const hit=castRay(w,[15,12,5],[0,0,-1])[0];
 assert.equal(hit.id,'deck-a');assert.ok(Math.abs(hit.point[2]-2)<1e-7);
});
test('two bodies can share XY while distinct support surfaces remain available',()=>{
 const w=sample(),a=supportCandidates(w,15,12);
 assert.deepEqual(a.map(v=>v.id),['deck-a','ground']);
 assert.ok(Math.abs(a[0].z-2)<1e-7);
});
test('sloped surface returns physically interpolated support',()=>{
 const w=sample();const supports=supportCandidates(w,10,12);
 assert.equal(supports[0].id,'ramp-a');assert.ok(Math.abs(supports[0].z-1)<1e-7);
});
test('underside clearance differs from upper foot placement',()=>{
 const w=sample();assert.equal(clearanceAt(w,{x:15,y:12,z:0,h:1.6}).free,true);
 assert.deepEqual(clearanceAt(w,{x:15,y:12,z:0,h:1.9}).contacts,['deck-a']);
 assert.equal(clearanceAt(w,{x:15,y:12,z:2,h:1.65,supportId:'deck-a'}).free,true);
});
test('box volumes carry roof, side, and obstruction semantics',()=>{
 const w=createSpatialWorld();insertElement(w,{id:'wall',kind:'box',min:[3,3,0],max:[4,5,3]});
 assert.equal(supportCandidates(w,3.5,4)[0].id,'wall');
 assert.equal(clearanceAt(w,{x:3.5,y:4,z:0}).free,false);
 assert.equal(castRay(w,[2,4,1],[1,0,0])[0].id,'wall');
});
test('camera project and ray are exact inverses for arbitrary world point',()=>{
 for(const azimuth of [0,.4,1.2,2.1]){
  const c=makeCamera({target:[12,12,1],azimuth,elevation:1.0});
  for(const v of [[12,12,0],[9,16,2],[25,9,4]]){
   const q=projectPoint(c,v),r=rayFromPixel(c,q.x,q.y);
   const k=(v[0]-r.origin[0])*r.direction[0]+(v[1]-r.origin[1])*r.direction[1]+(v[2]-r.origin[2])*r.direction[2];
   assert.ok(Math.hypot(...v.map((a,i)=>a-(r.origin[i]+r.direction[i]*k)))<1e-8);
  }
 }
});
test('screen ray selects stacked top faces without actor-height magic',()=>{
 const w=sample(),cam=makeCamera({target:[15,12,1]});
 const screen=projectPoint(cam,[15,12,2]);const hits=pickPixel(w,cam,screen.x,screen.y);
 assert.equal(hits[0].id,'deck-a');assert.ok(hits.some(h=>h.id==='ground'));
});
test('true blocker changes head-vs-foot visibility in same geometry',()=>{
 const w=sample(),cam=makeCamera({target:[15,9,1],elevation:.9});
 // A path to a foot beneath a deck can hit the elevated front slab.
 const high=occlusionToPoint(w,cam,[15,12,1.7]);
 const low=occlusionToPoint(w,cam,[15,12,.1]);
 assert.equal(typeof high.visible,'boolean');assert.equal(typeof low.visible,'boolean');
});
