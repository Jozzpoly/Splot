import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../src/world.mjs';
const close=(a,b,eps=.05)=>assert.ok(Math.abs(a-b)<eps,`expected ${a} near ${b}`);
const requiresFeature=()=>assert.equal(typeof W.placeScaffold,'function','live world must offer independently authored 2.5D scaffolds');
test('author creates a ramp and platform as one atomic spatial change, not special-case demo geometry',()=>{
 requiresFeature();const w=W.createWorld();const result=W.placeScaffold(w,17,15,{turns:0,height:1.8});
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(w.constructions.length,2);
 const [r,p]=w.constructions; assert.notEqual(r.id,p.id);close(W.surfaces(w,18,15).find(s=>s.id===r.id).z,.55,.1);
 close(W.surfaces(w,22.4,15).find(s=>s.id===p.id).z,1.8);
 const hit=W.raycast(w,{x:22.4,y:15,z:3},{x:22.4,y:15,z:.5});assert.equal(hit.id,p.id);
 assert.notEqual(W.bodyConflicts(w,{id:'test',kind:'human',x:22.4,y:15,z:.5,r:.3,h:1.64,support:'ground'}).length,0);
});
test('third construction with a different height and orientation uses the same world systems',()=>{
 requiresFeature();const w=W.createWorld();for(const [x,y,t,h] of [[17,15,0,1.8],[66,39,1,2.2],[18,40,3,1.35]]){
  const result=W.placeScaffold(w,x,y,{turns:t,height:h});assert.equal(result.ok,true,JSON.stringify(result));
  const a=w.constructions.at(-2),b=w.constructions.at(-1);const center={x:(b.ax+b.bx)/2,y:(b.ay+b.by)/2};
  close(W.surfaces(w,center.x,center.y).find(s=>s.id===b.id).z,h);
  const hit=W.raycast(w,{...center,z:h+1},{...center,z:h-.6});assert.equal(hit.id,b.id);
 }
 assert.equal(w.constructions.length,6);
});
test('authoring an invalid location or overlapping construction is atomic; state unchanged',()=>{
 requiresFeature();const w=W.createWorld();assert.equal(W.placeScaffold(w,17,15).ok,true);const prior=W.snapshot(w);
 assert.equal(W.placeScaffold(w,17,15).ok,false);assert.equal(W.snapshot(w),prior);
 assert.equal(W.placeScaffold(w,83,53).ok,false);assert.equal(W.snapshot(w),prior);
});
test('all authored construction identities, orientations and heights round-trip in the actual playable world',()=>{
 requiresFeature();const w=W.createWorld();W.placeScaffold(w,17,15,{turns:0,height:1.8});W.placeScaffold(w,66,39,{turns:1,height:2.2});
 const json=W.snapshot(w),copy=W.restore(json);assert.equal(W.snapshot(copy),json);
 assert.deepEqual(copy.constructions,w.constructions);
 const invalid=JSON.parse(json);invalid.constructions[2].id=invalid.constructions[0].id;
 assert.throws(()=>W.restore(invalid),/construction|identity|id/i);
});
test('removing one structure has only local consequences: grounded grip elsewhere is retained; unsupported actors fall',()=>{
 requiresFeature();const w=W.createWorld();const r=W.placeScaffold(w,17,15);assert.equal(r.ok,true);
 const platform=w.constructions[1],p=W.getBody(w,'player');
 p.x=(platform.ax+platform.bx)/2;p.y=(platform.ay+platform.by)/2;p.z=platform.z0;p.support=platform.id;
 assert.equal(W.eraseConstruction(w,platform.id).ok,true);
 W.gravityStep(w);assert.equal(p.support,null);assert.ok(p.vz<0);
});
test('human can traverse a new ramp without an invisible entry-direction lock and reach its new platform',()=>{
 requiresFeature();const w=W.createWorld();const r=W.placeScaffold(w,17,15,{turns:0,height:1.8});assert.equal(r.ok,true);
 const p=W.getBody(w,'player');Object.assign(p,{x:16.65,y:15,z:0,support:'ground'});
 let progressed=0;for(let i=0;i<110;i++){const moved=W.walk(w,'player',.075,0);progressed+=moved.delta.dx;W.gravityStep(w);}
 assert.ok(progressed>6,`moved ${progressed}m; support=${p.support}, z=${p.z}`);
 assert.ok(p.z>1.65,`height=${p.z} support=${p.support}`);
});
test('screen-projected picking identifies authored upper and lower surfaces independent of controlled actor',()=>{
 requiresFeature();const w=W.createWorld();W.placeScaffold(w,17,15,{turns:0,height:1.8});
 const p=w.constructions.at(-1),x=(p.ax+p.bx)/2,y=(p.ay+p.by)/2,groundY=y-(p.z0*.53/.67);
 assert.equal(typeof W.pickConstructionAtProjection,'function');
 const hits=W.pickConstructionAtProjection(w,x,groundY);
 assert.equal(hits[0]?.id,p.id,JSON.stringify(hits));close(hits[0]?.at?.z,1.8);
});
test('renderer can obtain finite-volume triangles from same canonical construction source as raycasting',()=>{
 requiresFeature();const w=W.createWorld();W.placeScaffold(w,17,15);
 assert.equal(typeof W.constructionMeshes,'function');const meshes=W.constructionMeshes(w);
 assert.equal(meshes.length,2);assert.equal(meshes[0].triangles.length,12);
 const d=w.constructions[1],x=(d.ax+d.bx)/2,y=(d.ay+d.by)/2;
 const top=W.raycast(w,{x,y,z:d.z0+1},{x,y,z:d.z0-.8});
 assert.equal(top.id,d.id);
 const zvals=meshes[1].triangles.slice(2,4).flatMap(face=>face.map(v=>v.z));
 zvals.forEach(z=>close(z,top.at.z));
});
test('old in-world mechanics push a crate uphill on new authored ramp and over its platform edge',()=>{
 requiresFeature();const w=W.createWorld();assert.equal(W.placeScaffold(w,17,15).ok,true);
 const a=W.getBody(w,'player'),b=W.getBody(w,'crate');Object.assign(a,{x:16.12,y:15,z:0,support:'ground'});Object.assign(b,{x:17,y:15,z:0,support:'ground'});
 const supports=new Set(),first=b.x;
 for(let i=0;i<125;i++){W.walk(w,'player',.075,0);W.gravityStep(w);supports.add(b.support);assert.deepEqual(W.bodyConflicts(w,a),[]);assert.deepEqual(W.bodyConflicts(w,b),[]);}
 assert.ok(b.x>first+6,`crate displacement: ${b.x-first}`);
 assert.ok(supports.has(w.constructions[0].id),'crate used new ramp');
 assert.ok(supports.has(w.constructions[1].id),'crate used new deck');
 assert.ok(supports.has(null),'crate fell off new deck');
 assert.ok(w.stats.pushes>0,'existing push system participated');
});
test('existing grip can pull a crate uphill and onto new platform without special-case interaction code',()=>{
 requiresFeature();const w=W.createWorld();assert.equal(W.placeScaffold(w,17,15).ok,true);
 const a=W.getBody(w,'player'),b=W.getBody(w,'crate');Object.assign(a,{x:16.07,y:15,z:0,support:'ground'});Object.assign(b,{x:17,y:15,z:0,support:'ground'});
 assert.equal(W.toggleGrip(w,'player','crate').ok,true);
 for(let i=0;i<95;i++){W.walk(w,'player',.075,0);W.gravityStep(w);}
 assert.equal(a.support,w.constructions[1].id);assert.equal(b.support,w.constructions[1].id);
 assert.equal(w.grips.player,'crate');assert.ok(w.stats.drags>0);
 assert.deepEqual(W.bodyConflicts(w,b),[]);
});
test('same traversal works when the player enters the ramp from a rotated direction',()=>{
 requiresFeature();for(const turns of [1,2,3]){
  const w=W.createWorld(),x=turns===1?66:turns===2?64:17,y=turns===1?39:turns===2?40:42;
  assert.equal(W.placeScaffold(w,x,y,{turns,height:1.35}).ok,true);
  const a=W.getBody(w,'player'),[vx,vy]=[[1,0],[0,1],[-1,0],[0,-1]][turns];
  Object.assign(a,{x:x-vx*.35,y:y-vy*.35,z:0,support:'ground'});
  for(let i=0;i<100;i++){W.walk(w,'player',vx*.075,vy*.075);W.gravityStep(w);}
  assert.equal(a.support,w.constructions[1].id,`turns=${turns}, ${a.support}`);
  close(a.z,1.35);
 }
});
test('restore rejects authored geometry outside world bounds rather than trusting a malformed save',()=>{
 requiresFeature();const w=W.createWorld();assert.equal(W.placeScaffold(w,17,15).ok,true);
 const json=JSON.parse(W.snapshot(w));json.constructions[0].ax=-100;json.constructions[0].bx=-96.4;
 assert.throws(()=>W.restore(json),/construction|bounds|geometry/i);
});
test('new authored ramp cannot overlap the historic ramp which also has real occupied volume',()=>{
 requiresFeature();const w=W.createWorld();w.bodies.forEach((b,i)=>Object.assign(b,{x:8+i*2,y:8,z:0,support:'ground'}));const before=W.snapshot(w);
 const result=W.placeScaffold(w,34,27,{turns:0,height:1.8});
 assert.equal(result.ok,false,JSON.stringify(result));assert.equal(W.snapshot(w),before);
});
test('restore rejects an authored plank that intersects an existing world solid',()=>{
 requiresFeature();const w=W.createWorld();assert.equal(W.placeScaffold(w,17,15).ok,true);
 const obj=JSON.parse(W.snapshot(w));Object.assign(obj.constructions[0],{ax:35.8,ay:23,bx:39.4,by:23});
 assert.throws(()=>W.restore(obj),/construction|overlap|occupied/i);
});
test.todo('load-bearing structural failure must eventually propagate from removed ramp to connected platform, not yet simulated');
