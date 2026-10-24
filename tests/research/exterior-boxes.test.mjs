import test from 'node:test';
import assert from 'node:assert/strict';
import {exteriorBoxTriangles} from '../../src/next/exterior-boxes.mjs';
const box=(id,min,max,motionType)=>({id,kind:'box',min,max,material:'wood',...(motionType?{motionType}:{})});
const face=(tris,id,axis,sign)=>tris.filter(t=>t.owner===id&&Math.abs(t.normal[axis]-sign)<1e-8);
const area=tris=>tris.reduce((total,t)=>{
 const a=t.a,b=t.b,c=t.c;
 const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
 const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 return total+Math.hypot(...cross)/2;
},0);
test('untouched single box retains precisely six quad surfaces',()=>{
 const t=exteriorBoxTriangles([box('A',[0,0,0],[2,2,2])]);
 assert.equal(t.length,12);
 assert.equal(new Set(t.map(q=>q.owner)).size,1);
 assert.ok(Math.abs(area(t)-24)<1e-8);
});
test('adjacent stacked boxes drop BOTH invisible meeting faces, retain identities',()=>{
 const a=box('low',[0,0,0],[2,2,1]),b=box('top',[0,0,1],[2,2,2]);
 const t=exteriorBoxTriangles([a,b]);
 assert.equal(face(t,'low',2,1).length,0);
 assert.equal(face(t,'top',2,-1).length,0);
 assert.deepEqual([...new Set(t.map(q=>q.owner))].sort(),['low','top']);
 assert.ok(Math.abs(area(t)-24)<1e-8,'exterior surface is 2x2x2 cuboid: 24, not 32');
});
test('identical independent AABBs render once by stable author order without merging their data',()=>{
 const a=box('old',[0,0,0],[1,1,1]),b=box('new',[0,0,0],[1,1,1]);
 const snapshot=JSON.stringify([a,b]),t=exteriorBoxTriangles([a,b]);
 assert.equal(t.length,12);
 assert.ok(t.every(f=>f.owner==='old'));
 assert.equal(JSON.stringify([a,b]),snapshot);
});
test('partial overlap subdivides exposed top without inventing holes',()=>{
 const a=box('a',[0,0,0],[2,2,2]),b=box('b',[1,1,0],[3,3,2]);
 const t=exteriorBoxTriangles([a,b]);
 const tops=t.filter(q=>q.face==='top');
 assert.ok(Math.abs(area(tops)-7)<1e-7,'top union area 4+4-1');
 assert.ok(tops.some(q=>q.owner==='b'));
 assert.ok(t.length>0&&t.every(q=>[q.a,q.b,q.c].flat().every(Number.isFinite)));
});
test('dynamic box cannot erase static visuals and is not itself pruned',()=>{
 const a=box('a',[0,0,0],[1,1,1]),b=box('moving',[0,0,0],[1,1,1],'dynamic');
 const t=exteriorBoxTriangles([a,b]);
 assert.equal(t.length,12);
 assert.ok(t.every(q=>q.owner==='a'));
});
test('panel remains separate with unchanged two-sided surface geometry',()=>{
 const pan={id:'ramp',kind:'panel',a:[0,0,0],b:[3,0,1],width:1,thickness:.2,material:'stone'};
 const t=exteriorBoxTriangles([pan]);
 assert.equal(t.length,12);
 assert.ok(t.every(q=>q.owner==='ramp'));
});
