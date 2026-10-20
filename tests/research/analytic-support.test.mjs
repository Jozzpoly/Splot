import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialWorld,insertElement,supportCandidates,castRay}
 from '../../src/next/spatial-core.mjs';
const oldRay=(w,x,y,maxZ=31)=>castRay(w,[x,y,maxZ],[0,0,-1],{
 onlySupports:true,maxDistance:Math.max(1,maxZ+3)
}).map(h=>({id:h.id,z:h.point[2],normal:h.normal}));
const scene=()=>{
 const w=createSpatialWorld({width:42,height:32});
 const parts=[
  {id:'ramp',kind:'panel',a:[8,8,0],b:[14,8,3.2],width:2.4,thickness:.23},
  {id:'sloping-back',kind:'panel',a:[24,12,5],b:[20,11,0],width:1.8,thickness:.23},
  {id:'deck',kind:'panel',a:[14,8,3.2],b:[24,8,3.2],width:4,thickness:.35},
 ];
 for(let i=0;i<20;i++)parts.push({id:'box-'+i,kind:'box',
  min:[3,3,i*1.1],max:[4.2,4.2,(i+1)*1.1]});
 for(const p of parts)assert.equal(insertElement(w,p).ok,true);
 return w;
};
const compare=(w,x,y,maxZ=31)=>{
 const a=supportCandidates(w,x,y,{maxZ}),b=oldRay(w,x,y,maxZ);
 assert.deepEqual(a.map(x=>x.id),b.map(x=>x.id),
  `support mismatch @${x},${y},${maxZ}`);
 assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i++){
  assert.ok(Math.abs(a[i].z-b[i].z)<1e-5,`Z disagreement ${a[i].id}: ${a[i].z} vs ${b[i].z}`);
  for(let k=0;k<3;k++)assert.ok(Math.abs(a[i].normal[k]-b[i].normal[k])<1e-5,
   `normal disagreement ${a[i].id} ${k}: ${a[i].normal[k]} vs ${b[i].normal[k]}`);
 }
};
test('analytic vertical query matches independent triangle ray for authored structures',()=>{
 const w=scene();
 for(let i=0;i<3000;i++){
  const x=(i*13.173%45)-1.3,y=(i*7.821%35)-1.2;
  compare(w,x,y);
 }
 for(let i=0;i<30;i++){
  const t=i/29;compare(w,8+6*t,8);compare(w,14+10*t,8);
  compare(w,3.1,3.1,5.3+i*.5);
 }
});
test('exact edges, overlapping support surfaces and unusual vertical query max',()=>{
 const w=scene();
 for(const [x,y,z] of [[3.6,3.6,31],[3,3,31],[4.2,4.2,31],
  [3.6,3.6,18.3],[3.6,3.6,8.4],[3.6,3.6,.4],
  [8,8,31],[14,8,31],[14,7,31],[24,12,31],[42,32,31],[-1,-1,31]]){
  compare(w,x,y,z);
 }
});
test('changing scene geometry and motion is reflected without stale support caches',()=>{
 const w=scene();
 compare(w,3.6,3.6);
 w.elements.find(e=>e.id==='box-19').max[2]+=1.3;
 compare(w,3.6,3.6);
});
