import test from 'node:test';
import assert from 'node:assert/strict';
import {crateTriangles,crateTopHits,crateSurfaceHits} from '../../src/next/crate-visual.mjs';
test('crate has exactly one exposed top, no coplanar material conflict',()=>{
 const b={id:'crate-17',kind:'crate',x:12.25,y:7,z:2.4,r:.43,h:.86};
 const tris=crateTriangles(b);
 assert.equal(tris.length,20);
 const tops=tris.filter(t=>t.face==='top');
 assert.equal(tops.length,2,'one top quad with two triangles');
 assert.ok(tops.every(t=>t.material==='wood'));
 assert.ok(tops.every(t=>[t.a,t.b,t.c].every(v=>Math.abs(v[2]-(b.z+b.h))<1e-9)));
 assert.equal(tris.filter(t=>t.material==='crate'&&t.face==='top').length,0);
 assert.equal(tris.filter(t=>t.material==='wood'&&t.face==='bottom').length,0);
 assert.equal(tris.filter(t=>t.owner===b.id).length,20);
});
test('hundreds of independent crate surfaces remain finite and unambiguous',()=>{
 let count=0;
 for(let i=0;i<350;i++){
  const b={id:'crate-'+i,x:i*.97,y:2,z:i%3*.86,r:.43,h:.86};
  const tris=crateTriangles(b);
  assert.equal(tris.filter(t=>t.face==='top').length,2);
  assert.equal(tris.filter(t=>t.material==='crate'&&t.face==='top').length,0);
  assert.ok(tris.every(t=>[t.a,t.b,t.c].flat().every(Number.isFinite)));
  count+=tris.length;
 }
 assert.equal(count,7000);
});

import {makeCamera,projectPoint} from '../../src/next/spatial-core.mjs';
test('ray on the visible crate top selects the real moving body rather than ground behind',()=>{
 const crate={id:'crate-7',kind:'crate',x:14.2,y:15.2,z:.6,r:.43,h:.86};
 const camera=makeCamera({target:[14,15,0],width:900,height:560,pixelsPerMeter:32});
 const top=projectPoint(camera,[crate.x,crate.y,crate.z+crate.h]);
 const hits=crateTopHits([crate],camera,top.x,top.y);
 assert.equal(hits.length,1);
 assert.equal(hits[0].id,crate.id);
 assert.equal(hits[0].face,'top');
 assert.ok(Math.abs(hits[0].point[2]-(crate.z+crate.h))<1e-8);
 const outside=projectPoint(camera,[crate.x+1,crate.y,crate.z+crate.h]);
 assert.equal(crateTopHits([crate],camera,outside.x,outside.y).length,0);
 assert.equal(crateTopHits([{...crate,kind:'human'}],camera,top.x,top.y).length,0);
});
test('crate surface picking sorts moving support candidates by camera depth',()=>{
 const a={id:'lower',kind:'crate',x:12,y:11,z:0,r:.43,h:.86};
 const b={...a,id:'upper',z:.86};
 const cam=makeCamera({target:[12,11,0],width:720,height:480,pixelsPerMeter:30});
 const p=projectPoint(cam,[12,11,1.72]);
 const hits=crateTopHits([a,b],cam,p.x,p.y);
 assert.equal(hits[0].id,'upper');
 assert.ok(hits.length>=1);
});


test('front face of visible moving crate is erasure target, not stacking support',()=>{
 const b={id:'crate-side',kind:'crate',x:14.2,y:15.2,z:0,r:.43,h:.86};
 const cam=makeCamera({target:[14,15,0],width:900,height:560,pixelsPerMeter:32});
 const p=projectPoint(cam,[b.x,b.y-b.r,b.z+b.h*.42]);
 assert.equal(crateTopHits([b],cam,p.x,p.y).length,0);
 const hits=crateSurfaceHits([b],cam,p.x,p.y);
 assert.equal(hits.length,1);
 assert.equal(hits[0].id,b.id);
 assert.equal(hits[0].face,'side');
 assert.ok(Math.abs(hits[0].point[1]-(b.y-b.r))<1e-5);
 assert.deepEqual(hits[0].normal,[0,-1,0]);
});
test('full crate skin picks visible lid but ignores unrelated bodies and empty pixels',()=>{
 const b={id:'crate',kind:'crate',x:12,y:11,z:0,r:.43,h:.86};
 const cam=makeCamera({target:[12,11,0],width:720,height:480,pixelsPerMeter:30});
 const p=projectPoint(cam,[b.x,b.y,b.z+b.h]);
 assert.equal(crateSurfaceHits([b],cam,p.x,p.y)[0]?.face,'top');
 assert.equal(crateSurfaceHits([{...b,kind:'boar'}],cam,p.x,p.y).length,0);
 assert.equal(crateSurfaceHits([b],cam,0,0).length,0);
});
