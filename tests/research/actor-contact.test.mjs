import test from 'node:test';
import assert from 'node:assert/strict';
import {compliantActorImpulse} from '../../src/next/actor-contact.mjs';
const human={id:'human',x:0,y:0,z:0,r:.32,h:1.6,mass:76};
const boar={id:'boar',x:.69,y:0,z:0,r:.43,h:.75,mass:82};
const solve=(a=human,b=boar,va=[3,0],vb=[-1,0],dt=1/60)=>compliantActorImpulse(a,b,va,vb,dt);
test('soft collision is finite, capped, bilateral and impulse-conserving',()=>{
 const hit=solve();
 assert.equal(hit.active,true);
 assert.ok(hit.impulse>0&&hit.impulse<=1250/60+1e-9);
 assert.ok(Math.abs(human.mass*hit.ax+boar.mass*hit.bx)<1e-9);
 assert.ok(Math.abs(human.mass*hit.ay+boar.mass*hit.by)<1e-9);
 assert.ok(hit.ax<0&&hit.bx>0);
});
test('does not fabricate contact across a genuine height or spatial separation',()=>{
 assert.equal(solve(human,{...boar,z:3}).active,false);
 assert.equal(solve(human,{...boar,x:3}).active,false);
 assert.equal(solve(human,{...boar,x:.88},[-2,0],[2,0]).active,false);
});
test('normal is deterministic for coincident centers, and invalid dt is inert',()=>{
 const r=solve(human,{...boar,x:0,y:0},[0,0],[0,0]);
 assert.ok([r.impulse,r.ax,r.ay,r.bx,r.by,...r.normal].every(Number.isFinite));
 assert.equal(solve(human,boar,[4,0],[0,0],0).active,false);
});
test('parameter and mass variation do not create NaN or unbounded correction',()=>{
 let contacts=0;
 for(let i=1;i<=8000;i++){
  const alpha=i*.038,body={...boar,x:Math.cos(alpha)*(i%200)/150,y:Math.sin(alpha)*(i%200)/150,
   mass:1+i%120,z:(i%2)*.3},v=[Math.sin(i)*7,Math.cos(i*.37)*4];
  const q=solve(human,body,v,[-v[1],v[0]]);
  assert.ok(Number.isFinite(q.impulse)&&q.impulse<=1250/60+1e-9);
  assert.ok([q.ax,q.ay,q.bx,q.by].every(Number.isFinite));
  if(q.active){
   contacts++;
   assert.ok(Math.abs(human.mass*q.ax+body.mass*q.bx)<1e-8);
   assert.ok(Math.abs(human.mass*q.ay+body.mass*q.by)<1e-8);
  }
 }
 assert.ok(contacts>50);
});
