import test from 'node:test';
import assert from 'node:assert/strict';
import {splotToBox3D,box3DToSplot,panelQuaternionInBox3D,qmul} from '../../src/next/box3d-basis.mjs';
const eps=1e-10;
const rotate=(q,v)=>qmul(qmul(q,[...v,0]),[-q[0],-q[1],-q[2],q[3]]).slice(0,3);
const norm=v=>Math.hypot(...v);
const vnear=(a,b)=>a.every((x,i)=>Math.abs(x-b[i])<eps);
test('round-trip preserves coordinates and signed orientation',()=>{
 for(let i=0;i<5000;i++){
  const p=[Math.sin(i)*19,Math.cos(i*.71)*10,(i%41)*.13-2.8];
  assert.ok(vnear(box3DToSplot(splotToBox3D(p)),p));
 }
 const eX=splotToBox3D([1,0,0]),eY=splotToBox3D([0,1,0]),eZ=splotToBox3D([0,0,1]);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 assert.ok(vnear(cross(eX,eY),eZ));
});
test('local Box3D X axis is the expected slope in all orientations',()=>{
 for(const d of [[5,0,2.4],[0,5,2.4],[3,4,0],[4,-3,-1.8],[.1,.2,1.5],[-2,4,.7]]){
  const panel={a:[13,13,0],b:[13+d[0],13+d[1],d[2]],width:2,thickness:.25};
  const q=panelQuaternionInBox3D(panel),dir=splotToBox3D(d);
  assert.ok(vnear(rotate(q,[1,0,0]),dir.map(x=>x/norm(dir))));
  assert.ok(Math.abs(norm(q)-1)<eps);
 }
});
