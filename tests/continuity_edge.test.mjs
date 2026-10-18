import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,getBody,toggleGrip,walk,removeBridge,gravityStep,bodyConflicts,snapshot,restore} from '../src/world.mjs';

function upper(w){const a=getBody(w,'scout'),b=getBody(w,'deck-crate');
 Object.assign(a,{x:45.88,y:27.95,z:2.6,support:'bridge'});
 Object.assign(b,{x:46.83,y:27.95,z:2.6,support:'bridge',vz:0});return [a,b];}

test('removing distant bridge does not break grounded player-to-crate grip',()=>{
 const w=createWorld(),a=getBody(w,'player'),b=getBody(w,'crate');
 Object.assign(a,{x:13,y:13,z:0,support:'ground'});Object.assign(b,{x:14,y:13,z:0,support:'ground'});
 assert.equal(toggleGrip(w,'player','crate').ok,true);
 removeBridge(w);
 assert.equal(w.grips.player,'crate');
 const x=b.x;walk(w,'player',-.25,0);assert.ok(b.x<x-.20);
});

test('direct physical push can move elevated crate across bridge edge into free fall',()=>{
 const w=createWorld(),[a,b]=upper(w);
 a.x=45.58; b.x=46.43;
 const m=walk(w,'scout',1.4,0);
 assert.ok(b.x>47.01,{m,actor:a.x,crate:b.x,support:b.support});
 assert.equal(b.support,null);
 assert.ok(w.history.some(e=>e.type==='support-lost'&&e.id===b.id));
 for(let i=0;i<150&&b.support===null;i++)gravityStep(w);
 assert.equal(b.support,'ground');assert.ok(b.z<.001);
});

test('gripped crate can leave edge, break limited ground-drag grip, and fall while actor remains on deck',()=>{
 const w=createWorld(),[a,b]=upper(w);
 assert.equal(toggleGrip(w,'scout','deck-crate').ok,true);
 const result=walk(w,'scout',.96,0);
 assert.ok(b.x>47.01,{result,a:a.x,b:b.x});
 assert.equal(b.support,null);assert.equal(a.support,'bridge');
 assert.equal(w.grips.scout,undefined);
 assert.ok(w.history.some(e=>e.type==='grip-released'&&e.reason==='edge-lost-support'));
 const st=restore(snapshot(w));assert.equal(getBody(st,'deck-crate').support,null);
 for(let i=0;i<160&&b.support===null;i++)gravityStep(w);
 assert.equal(b.support,'ground');
 assert.deepEqual(bodyConflicts(w,b),[]);
});

test('a crate retains support while its footprint still touches the authored deck surface; no clipping on fall',()=>{
 const w=createWorld(),[a,b]=upper(w);
 assert.equal(toggleGrip(w,'scout','deck-crate').ok,true);
 let release=null;
 for(let i=0;i<60;i++){
   const m=walk(w,'scout',.03,0);
   if(m.delta.dx<.029)break;
   if(b.support===null){release=b.x;break;}
 }
 assert.ok(release!==null,'edge should eventually lead to fall');
 assert.ok(release>47+b.r-.06,{release,r:b.r});
 assert.ok(b.x-b.r>=47-.06,{release,b});
 assert.equal(a.support,'bridge');
 for(let i=0;i<130&&b.support===null;i++){
  gravityStep(w);
  assert.deepEqual(bodyConflicts(w,b),[],`fall step ${i} body clips construction`);
 }
 assert.equal(b.support,'ground');
});

test('human can continue a finite horizontal input while airborne without regaining support',()=>{
 const w=createWorld(),a=getBody(w,'scout');Object.assign(a,{x:54,y:40,z:1.9,support:null,vz:-2});
 const r=walk(w,'scout',.3,.12);assert.ok(r.delta.dx>.25,{r,x:a.x});
 assert.equal(a.support,null);assert.equal(a.z,1.9);
});

test('airborne body lands on real north wall top if trajectory crosses it, rather than teleporting to ground',()=>{
 const w=createWorld(),b=getBody(w,'scout');Object.assign(b,{x:46.7,y:27,z:2.6,support:'bridge'});
 for(let i=0;i<25;i++)walk(w,'scout',.04,0);
 for(let i=0;i<70;i++)gravityStep(w);
 assert.equal(b.support,'solid:north-wall');assert.ok(Math.abs(b.z-2.2)<1e-8);
});

test('airborne body at gap between walls lands on ground',()=>{
 const w=createWorld(),b=getBody(w,'scout');Object.assign(b,{x:46.7,y:27.95,z:2.6,support:'bridge'});
 for(let i=0;i<25;i++)walk(w,'scout',.04,0);
 assert.equal(b.support,null);
 for(let i=0;i<80;i++)gravityStep(w);
 assert.equal(b.support,'ground');assert.equal(b.z,0);
});
