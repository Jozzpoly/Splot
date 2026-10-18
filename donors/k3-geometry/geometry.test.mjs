import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,makeConstruction,addConstruction,eraseConstruction,allShapes,allTriangles,surfaceCandidates,raycast,conflicts,move,pushCrate,gravityStep,snapshot,restore} from './geometry.mjs';
const near=(a,b,eps=.04)=>assert.ok(Math.abs(a-b)<=eps,`${a} not close to ${b}`);
test('two distinct authored constructions: rotated, different heights and materials',()=>{
 const w=makeWorld();assert.equal(w.constructions.length,2);
 assert.equal(w.constructions[0].shapes[0].top,2.6);
 assert.equal(w.constructions[1].shapes[0].top,1.6);
 assert.equal(w.constructions[1].shapes[0].material,'timber');
 assert.ok(w.constructions[1].shapes[0].angle>1);
 assert.ok(allTriangles(w).length>50);
});
test('ground and an elevated surface coexist at one XY',()=>{
 const s=surfaceCandidates(makeWorld(),0,0);
 assert.ok(s.some(a=>a.id==='ground'&&a.z===0));
 assert.ok(s.some(a=>a.id==='stone-arch:deck'&&a.z===2.6));
});
test('camera-independent ray actually hits ramp top, and side face',()=>{
 const w=makeWorld();const x=-4.5,y=0;
 const hit=raycast(w,{x,y,z:3.5},{x,y,z:-.5});assert.ok(hit);assert.equal(hit.id,'stone-arch:ramp');assert.equal(hit.kind,'top');
 const side=raycast(w,{x,y:2,z:1},{x,y:0,z:1});assert.ok(side);assert.equal(side.id,'stone-arch:ramp');
});
test('a head at ground level cannot pass through the material wedge',()=>{
 const w=makeWorld();const b={id:'test',x:-4.5,y:0,z:0,r:.25,h:1.64};assert.ok(conflicts(w,b).includes('stone-arch:ramp'));
});
test('low side entry can be legal; high side remains blocked by volume',()=>{
 const w=makeWorld(),p=w.bodies[0];p.x=-6.68;p.y=1.23;p.z=0;p.support='ground';
 const low=move(w,'player',0,-.30);assert.equal(low.ok,true,JSON.stringify(low));
 p.x=-3.15;p.y=1.25;p.z=0;p.support='ground';
 const high=move(w,'player',0,-.31);assert.equal(high.ok,false);
});
test('a person can stand beneath an elevated bridge without magically jumping on it',()=>{
 const w=makeWorld(),p=w.bodies[0];p.x=0;p.y=-.6;p.z=0;p.support='ground';
 assert.deepEqual(conflicts(w,p),[]);const d=move(w,'player',0,.2);assert.equal(d.ok,true,JSON.stringify(d));near(p.z,0);assert.equal(p.support,'ground');
});
test('ramp B works with 90 degree rotation without changing queries',()=>{
 const w=makeWorld(),p=w.bodies[0];p.x=9;p.y=-3.49;p.z=0;p.support='ground';
 const a=[];for(let i=0;i<46;i++){const r=move(w,'player',0,.065);if(r.ok)a.push(p.z);else break;}
 assert.ok(Math.max(...a)>1.2,`height achieved ${Math.max(...a)}`);
 const hit=raycast(w,{x:9,y:-2,z:3},{x:9,y:-2,z:0});assert.equal(hit?.id,'timber-crossing:ramp');
});
test('crate can leave platform and become airborne then land on ground',()=>{
 const w=makeWorld(),b=w.bodies.find(x=>x.id==='crate');b.y=0;
 let airborne=false;for(let i=0;i<22;i++){let r=pushCrate(w,'crate',.08,0);assert.equal(r.ok,true,JSON.stringify(r));if(b.support===null){airborne=true;break;}}
 assert.equal(airborne,true);assert.equal(b.z,2.6);
 for(let i=0;i<120;i++)gravityStep(w);
 assert.equal(b.support,'ground');near(b.z,0);assert.ok(w.events.some(e=>e.type==='land'&&e.id==='crate'));
});
test('authored third construction uses exact same rules, not special-cased locations',()=>{
 const w=makeWorld();const result=addConstruction(w,{id:'third',x:-9,y:7,angle:Math.PI,length:3,width:1.9,height:1.25,rampLength:2.7,material:'metal'});
 assert.equal(result.ok,true,JSON.stringify(result));
 const hit=raycast(w,{x:-9,y:7,z:3},{x:-9,y:7,z:0});assert.equal(hit?.id,'third:deck');
 assert.ok(surfaceCandidates(w,-9,7).some(s=>s.id==='third:deck'));
 const saved=snapshot(w);const copied=restore(saved);assert.equal(copied.constructions.length,3);
 assert.ok(eraseConstruction(copied,'third').ok);assert.equal(copied.constructions.length,2);
});
test('removed support transitions actor toward falling',()=>{
 const w=makeWorld(),s=w.bodies.find(x=>x.id==='scout');assert.equal(s.support,'stone-arch:deck');
 assert.ok(eraseConstruction(w,'stone-arch').ok);assert.equal(s.support,null);
 gravityStep(w);assert.ok(s.z<2.6);assert.ok(w.events.some(x=>x.type==='support-lost'&&x.id==='scout'));
});
test('change visual material does not silently change terrain physics',()=>{
 const w=makeWorld();const c=w.constructions[0],p=c.parameters;
 const x=makeConstruction({...p,id:'recolored',material:'metal'});
 assert.equal(x.shapes[0].top,c.shapes[0].top);
 near(x.shapes[1].top,c.shapes[1].top);
});
test('restore rejects an explicitly intersecting actor',()=>{
 const w=makeWorld(),s=JSON.parse(snapshot(w));s.bodies[0].x=-4.5;s.bodies[0].y=0;s.bodies[0].z=0;
 assert.throws(()=>restore(s),/intersects/);
});
test('metamorphic: top-ray and authored ramp surface agree across two rotations',()=>{
 for(const [id,x,y,a,height] of [['east',0,0,0,2.6],['north',8,2,Math.PI/2,1.4]]){
  const c=makeConstruction({id,x,y,angle:a,length:4,width:2.4,height,rampLength:4,rampWidth:1.8,material:'stone',withPosts:false});
  const w={constructions:[c],bodies:[],events:[],tick:0};
  const r=c.shapes.find(s=>s.type==='ramp');const cos=Math.cos(a),sin=Math.sin(a);
  for(let i=0;i<60;i++){
   const u=-r.length/2+(i+.5)/60*r.length;
   const xx=r.x+u*cos,yy=r.y+u*sin,z=r.bottom+(r.top-r.bottom)*(u/r.length+.5);
   const top=surfaceCandidates(w,xx,yy,0).find(s=>s.id===r.id);
   const hit=raycast(w,{x:xx,y:yy,z:r.top+.1},{x:xx,y:yy,z:-1});
   assert.ok(hit,`${id} missing hit ${i}`);assert.equal(hit.id,r.id);
   near(hit.at.z,z,1e-6);near(top.z,z,1e-6);
  }
 }
});
test('high roof intersects tall body below, short person passes under',()=>{
 const w=makeWorld();const tall={id:'tall',x:0,y:0,z:0,r:.22,h:2.5};
 const short={id:'short',x:0,y:0,z:0,r:.22,h:1.64};
 assert.ok(conflicts(w,tall).includes('stone-arch:deck'));
 assert.equal(conflicts(w,short).length,0);
});
test('deleting unrelated construction does not affect another actor support',()=>{
 const w=makeWorld();const s=w.bodies.find(x=>x.id==='scout');
 const x=addConstruction(w,{id:'remote',x:-3,y:7,angle:Math.PI,length:3,width:2,height:1.25,rampLength:2.5,material:'metal'});assert.equal(x.ok,true);
 eraseConstruction(w,'remote');assert.equal(s.support,'stone-arch:deck');
});
