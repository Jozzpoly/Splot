import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlopedPlank,plankHeight,plankTriangles,plankCircleContact,plankRayHits,plankCylinderContact} from '../src/spatial_construction.mjs';
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const rotate=(x,y,angle)=>({x:x*Math.cos(angle)-y*Math.sin(angle),y:x*Math.sin(angle)+y*Math.cos(angle)});

test('canonical plank: same ray heights as its walkable top at 33 sampling points',()=>{
 const p=makeSlopedPlank({id:'ramp',ax:34,ay:27,bx:37,by:27,width:1.7,z0:0,z1:2.6,thickness:.24});
 assert.equal(plankTriangles(p).length,12);
 for(let i=0;i<33;i++){const x=34.025+i*2.95/32,z=plankHeight(p,x,27);
  near(z,2.6*(x-34)/3);
  const hit=plankRayHits(p,{x,y:27,z:z+.47},{x,y:27,z:z-.55})[0];
  assert.equal(hit?.kind,'top');near(hit.at.z,z,1e-6);
 }
});

test('rotated, lowered, raised and reversed 2nd/3rd constructions keep support == ray hit',()=>{
 const configs=[{id:'north',angle:Math.PI/2,x:18,y:10,z0:.2,z1:1.4},
  {id:'diagonal',angle:-.71,x:51,y:41,z0:1.8,z1:3.1},
  {id:'reverse',angle:2.8,x:65,y:17,z0:2.5,z1:.6}];
 for(const c of configs){const d=rotate(4.8,0,c.angle),p=makeSlopedPlank({id:c.id,ax:c.x,ay:c.y,bx:c.x+d.x,by:c.y+d.y,width:1.4,z0:c.z0,z1:c.z1,thickness:.3});
  for(let j=1;j<20;j++){const rel=rotate(4.8*j/20,0,c.angle),x=c.x+rel.x,y=c.y+rel.y;
   const support=plankHeight(p,x,y),hits=plankRayHits(p,{x,y,z:Math.max(c.z0,c.z1)+2},{x,y,z:-2});
   const top=hits.find(h=>h.kind==='top');
   assert.ok(top,`${c.id} ${j} missing top`);near(top.at.z,support,1e-6);
  }
 }
});

test('circular footprint rejects diagonal corner false-positive of expanded rectangles',()=>{
 const p=makeSlopedPlank({id:'ledge',ax:0,ay:0,bx:4,by:0,width:2,z0:0,z1:2,thickness:.2});
 assert.equal(plankCircleContact(p,{x:4.29,y:1.29,r:.3}),false);
 assert.equal(plankCircleContact(p,{x:4.1,y:1.1,r:.3}),true);
 assert.equal(plankCircleContact(p,{x:2,y:1.5,r:.4}),false);
});

test('finite thickness has real underside and sides, but retains open air below raised end',()=>{
 const p=makeSlopedPlank({id:'ramp',ax:0,ay:0,bx:4,by:0,width:2,z0:0,z1:2.6,thickness:.24});
 assert.equal(plankCylinderContact(p,{x:3.85,y:0,z:0,r:.27,h:1.6,support:'ground'},'ramp'),false);
 assert.equal(plankCylinderContact(p,{x:2,y:0,z:0,r:.27,h:1.6,support:'ground'},'ramp'),true);
 const hits=plankRayHits(p,{x:3,y:0,z:1.6},{x:3,y:0,z:2.2});assert.ok(hits.some(h=>h.kind==='bottom'));
});

test('invalid constructions fail before generating incomplete geometry',()=>{
 for(const c of [{id:'',ax:0,ay:0,bx:1,by:1,width:2,z0:0,z1:1,thickness:.1},
  {id:'bad',ax:1,ay:2,bx:1,by:2,width:1,z0:0,z1:1,thickness:.1},
  {id:'bad',ax:0,ay:0,bx:2,by:0,width:-1,z0:0,z1:1,thickness:.1},
  {id:'bad',ax:0,ay:0,bx:2,by:0,width:1,z0:0,z1:Infinity,thickness:.1}])
  assert.throws(()=>makeSlopedPlank(c));
});

test('metamorphic XY rotation/translation preserves 840 independent top-ray and side-contact probes',()=>{
 const base=makeSlopedPlank({id:'base',ax:0,ay:0,bx:3.9,by:0,width:1.8,z0:.37,z1:2.7,thickness:.25});
 let state=87211;const r=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<70;i++){
  const angle=r()*Math.PI*2,x=-50+r()*100,y=-50+r()*100;
  const offset=rotate(3.9,0,angle),moved=makeSlopedPlank({id:'moved',ax:x,ay:y,bx:x+offset.x,by:y+offset.y,width:1.8,z0:.37,z1:2.7,thickness:.25});
  const xf=(u,v)=>{const q=rotate(u,v,angle);return {x:x+q.x,y:y+q.y};};
  for(let j=0;j<12;j++){
   const u=.12+3.6*r(),v= -.8+1.6*r(),z=plankHeight(base,u,v);
   const pos=xf(u,v);near(plankHeight(moved,pos.x,pos.y),z,1e-6);
   const a={x:u,y:v,z:z+.8},b={x:u,y:v,z:z-.5},c={...pos,z:z+.8},d={...pos,z:z-.5};
   const h1=plankRayHits(base,a,b).find(h=>h.kind==='top'),h2=plankRayHits(moved,c,d).find(h=>h.kind==='top');
   assert.ok(h1&&h2);near(h1.at.z,h2.at.z,1e-6);
   const p={x:u,y:v,r:.2,h:1.1,z:z-.5,support:'ground'},mp={...p,...pos};
   assert.equal(plankCylinderContact(base,p,'base'),plankCylinderContact(moved,mp,'moved'));
  }
 }
});
