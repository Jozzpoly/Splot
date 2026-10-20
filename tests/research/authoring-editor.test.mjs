import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialWorld,insertElement} from '../../src/next/spatial-core.mjs';
import {createEditHistory,translatedElement,screenOnHeightPlane,uniquePartHits} from '../../src/next/authoring-editor.mjs';
import {makeCamera,projectPoint,castRay} from '../../src/next/spatial-core.mjs';
const box=(id='a')=>({id,kind:'box',min:[2,3,1],max:[4,5,3],material:'stone'});
const panel=()=>({id:'p',kind:'panel',a:[4,4,0],b:[8,4,2],width:2,thickness:.22,material:'wood'});
const world=()=>{const w=createSpatialWorld({width:42,height:32});insertElement(w,box());insertElement(w,panel());return w;};
test('move anchored box with stable dimensions and ID; undo/redo exactly one transaction',()=>{
 const w=world(),h=createEditHistory(),a=structuredClone(w.elements[0]);
 const next=translatedElement(a,[3,-1,1.25]);
 assert.equal(next.min[0],5);assert.equal(next.max[0],7);assert.equal(next.min[2],2.25);
 assert.equal(h.apply(w,a,next).ok,true);
 assert.equal(w.elements[0].id,'a');
 assert.equal(w.elements[0].max[2]-w.elements[0].min[2],2);
 assert.equal(h.undo(w).ok,true);assert.deepEqual(w.elements[0],a);
 assert.equal(h.redo(w).ok,true);assert.deepEqual(w.elements[0],next);
});
test('panels translate as a whole, preserving slope, width and source geometry',()=>{
 const p=panel(),q=translatedElement(p,[.25,-2,4]);
 assert.deepEqual(q.a,[4.25,2,4]);assert.deepEqual(q.b,[8.25,2,6]);
 assert.equal(q.width,p.width);assert.deepEqual(p.a,[4,4,0]);
});
test('dynamic Box3D part cannot be directly edited while solver owns its pose',()=>{
 const w=world(),h=createEditHistory(),a=structuredClone(w.elements[0]);
 a.motionType='dynamic';w.elements[0]=a;
 const r=h.apply(w,a,translatedElement(a,[1,0,0]));
 assert.equal(r.ok,false);assert.equal(r.reason,'dynamic-part');
});
test('undo refuses to erase external physics changes; failed edit does not corrupt history',()=>{
 const w=world(),h=createEditHistory(),a=structuredClone(w.elements[0]);
 assert.equal(h.apply(w,a,translatedElement(a,[1,0,0])).ok,true);
 w.elements[0].min[0]+=.2;
 const fail=h.undo(w);assert.equal(fail.ok,false);assert.equal(fail.reason,'stale-part');
 assert.equal(h.canUndo,true);assert.equal(h.canRedo,false);
});
test('insertion and removal are undoable without resetting unrelated bodies or scene',()=>{
 const w=world(),h=createEditHistory(),b=box('added');
 assert.equal(h.apply(w,null,b).ok,true);
 assert.equal(w.elements.length,3);
 assert.equal(h.undo(w).ok,true);assert.equal(w.elements.length,2);
 assert.equal(h.redo(w).ok,true);
 assert.equal(h.apply(w,b,null).ok,true);assert.equal(w.elements.length,2);
 assert.equal(h.undo(w).ok,true);assert.equal(w.elements.length,3);
});
test('screen-to-horizontal-height plane round-trip stays stable under orbiting camera',()=>{
 for(const azimuth of [0,.4,1.7]){
  const cam=makeCamera({target:[14,14,1],azimuth,elevation:1.0,width:950,height:650,pixelsPerMeter:25});
  for(const p of [[10,10,0],[15,18,3],[26,7,5]]){
   const pixel=projectPoint(cam,p);
   const hit=screenOnHeightPlane(cam,pixel.x,pixel.y,p[2]);
   assert.ok(hit&&hit.every((v,i)=>Math.abs(v-p[i])<1e-7));
  }
 }
});
test('history bounded, clear drops entries, invalid transforms preserve scene',()=>{
 const w=world(),h=createEditHistory(2);let last=structuredClone(w.elements[0]);
 for(let i=0;i<3;i++){let next=translatedElement(last,[.1,0,0]);assert.equal(h.apply(w,last,next).ok,true);last=next;}
 assert.equal(h.undo(w).ok,true);assert.equal(h.undo(w).ok,true);
 assert.equal(h.undo(w).reason,'empty');
 h.clear();assert.equal(h.redo(w).reason,'empty');
 const current=structuredClone(w.elements[0]);
 assert.throws(()=>translatedElement(current,[Infinity,0,0]),/invalid-translation/);
 assert.deepEqual(w.elements[0],current);
});

test('solver-owned lifecycle invalidates only dependent undo entries',()=>{
 const w=world(),h=createEditHistory();
 const originalA=structuredClone(w.elements.find(e=>e.id==='a'));
 const originalP=structuredClone(w.elements.find(e=>e.id==='p'));
 const movedA=translatedElement(originalA,[2,0,0]);
 const movedP=translatedElement(originalP,[0,1,0]);
 assert.equal(h.apply(w,originalA,movedA).ok,true);
 assert.equal(h.apply(w,originalP,movedP).ok,true);
 const a=w.elements.find(e=>e.id==='a');
 a.motionType='dynamic';
 assert.equal(h.invalidateId('a'),1);
 assert.equal(h.undo(w).ok,true,'unrelated panel move stays undoable');
 assert.deepEqual(w.elements.find(e=>e.id==='p'),originalP);
 assert.equal(h.undo(w).reason,'empty','stale dynamic edit no longer blocks older history');
 assert.equal(h.redo(w).ok,true);
 assert.deepEqual(w.elements.find(e=>e.id==='p'),movedP);
 assert.equal(w.elements.find(e=>e.id==='a').motionType,'dynamic');
});
test('history invalidation does not resurrect solver-controlled deletions',()=>{
 const w=world(),h=createEditHistory();
 const extra=box('extra');
 assert.equal(h.apply(w,null,extra).ok,true);
 assert.equal(h.apply(w,extra,translatedElement(extra,[1,0,0])).ok,true);
 w.elements.splice(w.elements.findIndex(e=>e.id==='extra'),1);
 assert.equal(h.invalidateId('extra'),2);
 assert.equal(h.undo(w).reason,'empty');
 assert.equal(w.elements.some(e=>e.id==='extra'),false);
});

test('part selection deduplicates front/back faces but keeps raw placement rays',()=>{
 const w=world(),hits=castRay(w,[3,4,12],[0,0,-1]);
 assert.deepEqual(hits.map(h=>h.id),['a','a','ground']);
 const parts=uniquePartHits(hits);
 assert.deepEqual(parts.map(h=>h.id),['a']);
 assert.equal(parts[0],hits[0]);
 assert.equal(hits.length,3);
});
test('overlapping authored parts remain individually selectable',()=>{
 const w=world(),b=box('b');b.min[2]=.5;b.max[2]=1.5;
 assert.equal(insertElement(w,b).ok,true);
 assert.deepEqual(uniquePartHits(castRay(w,[3,4,12],[0,0,-1])).map(h=>h.id),['a','b']);
 assert.deepEqual(uniquePartHits([]),[]);
});
