import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlopedPlank,plankHeight} from '../src/spatial_construction.mjs';
import {createSpatialScene,addPlank,removePlank,supportCandidates,rayCandidates,scenePick,contactCandidates,exportSpatialScene,importSpatialScene} from '../src/spatial_scene.mjs';
const plank=(id,ay,z0,z1)=>({id,ax:11,ay,bx:16,by:ay,width:2,z0,z1,thickness:.22});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('two overlapping XY planks at different elevations preserve both pick candidates',()=>{
 const scene=createSpatialScene([plank('bottom',0,0,1.4),plank('upper',0,2,3.4)]);
 const x=13,y=0;
 assert.deepEqual(supportCandidates(scene,x,y).map(v=>v.id).sort(),['bottom','ground','upper']);
 const p=scenePick(scene,{x,y,z:5},{x,y,z:-1});
 assert.equal(p.candidates.length,2);assert.equal(p.selected.id,'upper');assert.equal(p.candidates[1].id,'bottom');
 close(p.candidates[0].at.z,plankHeight(makeSlopedPlank(plank('upper',0,2,3.4)),x,y));
 close(p.candidates[1].at.z,plankHeight(makeSlopedPlank(plank('bottom',0,0,1.4)),x,y));
});
test('camera target selection can choose second depth without changing authored scene',()=>{
 const scene=createSpatialScene([plank('bottom',0,0,1.4),plank('upper',0,2,3.4)]),start=exportSpatialScene(scene);
 const rayA={x:13,y:0,z:5},rayB={x:13,y:0,z:-1};
 assert.equal(scenePick(scene,rayA,rayB,{index:1}).selected.id,'bottom');
 assert.equal(scenePick(scene,rayA,rayB,{index:0}).selected.id,'upper');
 assert.equal(exportSpatialScene(scene),start);
});
test('three differently rotated authored planks satisfy top support vs ray parity',()=>{
 const definitions=[plank('first',10,0,1.6)];
 const angles=[Math.PI/2,.73,Math.PI*1.31];for(let i=0;i<angles.length;i++){
  const a=angles[i],u=4*Math.cos(a),v=4*Math.sin(a);
  definitions.push({id:'alt'+i,ax:20+i*10,ay:11,bx:20+i*10+u,by:11+v,width:1.4,z0:i*.15,z1:2.3+i*.4,thickness:.25});
 }
 const scene=createSpatialScene(definitions);
 for(const p of definitions){const s=makeSlopedPlank(p);
  for(let t=.1;t<.99;t+=.09){const x=s.ax+(s.bx-s.ax)*t,y=s.ay+(s.by-s.ay)*t,z=plankHeight(s,x,y);
   const supports=supportCandidates(scene,x,y);assert.ok(supports.some(x=>x.id===p.id&&Math.abs(x.z-z)<1e-8));
   const h=rayCandidates(scene,{x,y,z:z+.35},{x,y,z:z-.35},{kind:'top'}).find(h=>h.id===p.id);
   assert.ok(h,`missing ${p.id}`);close(h.at.z,z);
  }
 }
});
test('authoring rejects collision of IDs and retains other construction on deletion',()=>{
 const scene=createSpatialScene([plank('north',0,0,2),plank('south',10,0,1.8)]);
 assert.deepEqual(addPlank(scene,plank('north',0,1,3)),{ok:false,reason:'duplicate-id'});
 assert.equal(removePlank(scene,'north').ok,true);assert.deepEqual(scene.definitions.map(x=>x.id),['south']);
 assert.equal(supportCandidates(scene,13,0).length,1);
 assert.equal(supportCandidates(scene,13,10).length,2);
});
test('invalid imports never alter original scene; roundtrip preserves IDs and exact author choices',()=>{
 const scene=createSpatialScene([plank('lower',0,0,2),plank('upper',0,2.5,4.5)]),before=exportSpatialScene(scene);
 assert.equal(exportSpatialScene(importSpatialScene(before)),before);
 for(const bad of [before.replace('"lower"','"upper"'),before.replace('"width":2','"width":-2'),'{"version":"new","planks":[]}'])
  assert.throws(()=>importSpatialScene(bad));
 assert.equal(exportSpatialScene(scene),before);
});
test('contact requires actual occupied volume and distinguishes open air below high end',()=>{
 const scene=createSpatialScene([plank('lower',0,0,2)]);
 assert.deepEqual(contactCandidates(scene,{x:15.5,y:0,z:0,r:.3,h:1.2,support:'ground'}),[]);
 assert.deepEqual(contactCandidates(scene,{x:13.5,y:0,z:0,r:.3,h:1.2,support:'ground'}),['lower']);
});
