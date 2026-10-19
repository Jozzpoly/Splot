import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../src/world.mjs';
const k=.53/.67;

test('screen-projected XY ray returns visible upper bridge and ground, independent from selected actor',()=>{
 const w=W.createWorld();
 const x=45,bridgeY=28.5,groundY=bridgeY-2.6*k;
 const hits=W.pickSurfacesAtProjection(w,x,groundY);
 assert.equal(hits[0].id,'bridge');
 assert.equal(hits[0].z,2.6);
 assert.equal(hits.at(-1).id,'ground');
 assert.equal(hits.at(-1).z,0);
 assert.ok(Math.abs(hits[0].y-bridgeY)<1e-7);
 assert.ok(Math.abs(hits.at(-1).y-groundY)<1e-7);
});
test('screen-projected picking preserves both distinct authored stacked slabs (plus ground)',()=>{
 const w=W.createWorld();
 const x=22,y=13;
 // Construct a pair of research-only stacked surfaces, generated through the same world geometry.
 w.constructions=[{id:'layer-low',ax:20,ay:13,bx:24,by:13,width:3,z0:1.2,z1:1.2,thickness:.23},
 {id:'layer-high',ax:20,ay:14.1,bx:24,by:14.1,width:3,z0:2.6,z1:2.6,thickness:.23}];
 // The two physical surfaces project to different world Y at their respective heights.
 const projectGy=13-1.2*k;
 const hits=W.pickSurfacesAtProjection(w,x,projectGy);
 assert.deepEqual(hits.filter(h=>h.id!=='ground').map(h=>h.id),['layer-high','layer-low']);
 assert.equal(hits.at(-1).id,'ground');
});
test('place crate on explicitly picked top and ground, preserving requested support',()=>{
 const w=W.createWorld(),x=45,y=28.5;
 const top=W.placeObject(w,'crate',x,y,{level:'bridge'});
 assert.equal(top.ok,true,JSON.stringify(top));
 assert.equal(W.getBody(w,top.id).support,'bridge');
 assert.equal(W.getBody(w,top.id).z,2.6);
 const ground=W.placeObject(w,'crate',x,y-2.6*k,{level:'ground'});
 assert.equal(ground.ok,true,JSON.stringify(ground));
 assert.equal(W.getBody(w,ground.id).support,'ground');
});
test('authoring on a new platform works, unsupported height/id rejects atomically',()=>{
 const w=W.createWorld();assert.equal(W.placeScaffold(w,17,15).ok,true);
 const d=w.constructions[1],x=(d.ax+d.bx)/2,y=(d.ay+d.by)/2;
 const hit=W.pickSurfacesAtProjection(w,x,y-d.z0*k).find(v=>v.id===d.id);
 assert.ok(hit,JSON.stringify(W.pickSurfacesAtProjection(w,x,y-d.z0*k)));
 const r=W.placeObject(w,'crate',hit.x,hit.y,{level:hit.id});
 assert.equal(r.ok,true,JSON.stringify(r));
 const crate=W.getBody(w,r.id);
 assert.equal(crate.support,d.id);assert.ok(Math.abs(crate.z-d.z0)<1e-7);
 const before=W.snapshot(w);
 const bad=W.placeObject(w,'crate',x,y,{level:'imaginary-platform'});
 assert.equal(bad.ok,false);assert.equal(W.snapshot(w),before);
});
test('explicit ground erasure never silently erases a projected authored platform',()=>{
 const w=W.createWorld();W.placeScaffold(w,17,15);
 const d=w.constructions[1],x=(d.ax+d.bx)/2,y=(d.ay+d.by)/2;
 const before=w.constructions.length;
 W.eraseNear(w,x,y,{level:'ground',skipConstructions:true});
 assert.equal(w.constructions.length,before);
});
test('eraser on authored elevated surface can remove a placed crate without deleting the structure',()=>{
 const w=W.createWorld();W.placeScaffold(w,17,15);
 const slab=w.constructions[1],x=(slab.ax+slab.bx)/2,y=(slab.ay+slab.by)/2;
 const placed=W.placeObject(w,'crate',x,y,{level:slab.id});assert.equal(placed.ok,true);
 const before=w.constructions.length;
 const first=W.eraseNear(w,x,y,{level:slab.id,skipConstructions:true});
 assert.equal(first.ok,true,JSON.stringify(first));assert.equal(first.id,placed.id);
 assert.equal(w.constructions.length,before);
 assert.equal(W.getBody(w,placed.id),undefined);
});
