import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialWorld,insertElement,replaceElement} from '../../src/next/spatial-core.mjs';
import {createSceneVisualCache} from '../../src/next/scene-visual-cache.mjs';
const scene=()=>{
 const w=createSpatialWorld({width:42,height:32});
 assert.equal(insertElement(w,{id:'anchored',kind:'box',min:[2,2,0],max:[3,3,1],material:'wood'}).ok,true);
 assert.equal(insertElement(w,{id:'moving',kind:'box',min:[5,5,3],max:[6,6,4],material:'stone',motionType:'dynamic'}).ok,true);
 return w;
};
test('static authored triangles are not rebuilt every frame, but dynamic geometry still moves',()=>{
 const w=scene(),cache=createSceneVisualCache();
 const first=cache.triangles(w),a=first.filter(t=>t.owner==='anchored');
 assert.equal(a.length,12);assert.equal(first.filter(t=>t.owner==='moving').length,12);
 assert.equal(a[0].material,'wood');
 assert.equal(cache.stats().staticBuilds,1);
 const fixed=cache.triangles(w).filter(t=>t.owner==='anchored');
 assert.equal(cache.stats().staticBuilds,1);
 assert.equal(fixed[0],a[0],'static geometry must be reused by identity');
 const mov=w.elements.find(e=>e.id==='moving');
 mov.min[2]-=2;mov.max[2]-=2; // actual Box3D sync does not bump revision
 const second=cache.triangles(w).filter(t=>t.owner==='moving');
 assert.equal(cache.stats().staticBuilds,1);
 assert.ok(Math.abs(second[0].a[2]-first.filter(t=>t.owner==='moving')[0].a[2]+2)<1e-10);
});
test('authoring revision invalidates scene cache, even with same number of parts',()=>{
 const w=scene(),cache=createSceneVisualCache();
 cache.triangles(w);
 const a=w.elements.find(e=>e.id==='anchored');
 const changed=structuredClone(a);changed.min[2]+=.4;changed.max[2]+=.4;
 assert.equal(replaceElement(w,'anchored',changed).ok,true);
 const next=cache.triangles(w);
 assert.equal(cache.stats().staticBuilds,2);
 assert.ok(next.filter(t=>t.owner==='anchored').every(t=>[t.a,t.b,t.c].flat().every(Number.isFinite)));
 assert.ok(Math.abs(next.find(t=>t.owner==='anchored'&&t.face==='top').a[2]-1.4)<1e-8);
});
test('imported world with coincident revision does not reuse previous-world geometry',()=>{
 const a=scene(),b=scene(),cache=createSceneVisualCache();
 b.elements.find(e=>e.id==='anchored').min[0]+=9;
 b.elements.find(e=>e.id==='anchored').max[0]+=9;
 cache.triangles(a);cache.triangles(b);
 assert.equal(cache.stats().staticBuilds,2);
 assert.ok(cache.triangles(b).filter(t=>t.owner==='anchored').every(t=>[t.a,t.b,t.c].some(v=>v[0]>=11)));
});
test('changing anchored to dynamic must move to uncached geometry on scene revision',()=>{
 const w=scene(),cache=createSceneVisualCache();
 cache.triangles(w);
 const e=w.elements.find(e=>e.id==='anchored'),q=structuredClone(e);
 q.motionType='dynamic';
 assert.equal(replaceElement(w,e.id,q).ok,true);
 cache.triangles(w);
 assert.equal(cache.stats().staticBuilds,2);
 q.min[2]=9; // not authoritative, mutate canonical world instead
 w.elements.find(e=>e.id==='anchored').min[2]=9;
 assert.ok(Math.abs(cache.triangles(w).find(t=>t.owner==='anchored'&&t.face==='top').a[2]-w.elements.find(e=>e.id==='anchored').max[2])<1e-8);
});
