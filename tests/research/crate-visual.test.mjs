import test from 'node:test';
import assert from 'node:assert/strict';
import {crateTriangles} from '../../src/next/crate-visual.mjs';
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
