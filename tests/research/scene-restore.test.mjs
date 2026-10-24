import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveWorld,addCrate} from '../../src/next/spatial-sim.mjs';
import {insertElement} from '../../src/next/spatial-core.mjs';
import {restoreResearchWorld,nextAuthoringSequence} from '../../src/next/scene-restore.mjs';
const saved=(w)=>JSON.stringify({format:'splot-next-live-research-1',scene:w.scene,bodies:w.bodies,time:w.time});
test('reopen an authored and materially edited game as paused fresh-physics state',()=>{
 const w=createLiveWorld();
 insertElement(w.scene,{id:'block-134',kind:'box',
  min:[8,8,4],max:[9.2,9.2,5.1],material:'wood',motionType:'dynamic'});
 const box=w.scene.elements.find(e=>e.id==='block-134');
 box.min[2]=.25;box.max[2]=1.35; // known pose, NOT historic velocity
 w.time=204.43;w.bodies.find(b=>b.id==='human').x=15.5;
 w.bodies.find(b=>b.id==='human').support='block-134';
 w.bodies.find(b=>b.id==='human').vz=-4.0;
 for(let i=0;i<58;i++)assert.equal(addCrate(w,3+(i%20),3+Math.floor(i/20)*1.4,0).ok,true);
 const loaded=restoreResearchWorld(saved(w));
 assert.equal(loaded.scene.elements.length,8);
 assert.equal(loaded.bodies.length,61);
 assert.equal(loaded.time,204.43);
 assert.equal(loaded.paused,true);
 assert.equal(loaded.grip,null);
 assert.equal(loaded.events.length,0);
 assert.equal(loaded.scene.elements.at(-1).id,'block-134');
 assert.equal(loaded.scene.elements.at(-1).min[2],.25);
 assert.equal(loaded.scene.elements.at(-1).motionType,'dynamic');
 assert.equal(loaded.bodies.find(b=>b.id==='human').x,15.5);
 assert.equal(loaded.bodies.find(b=>b.id==='human').vz,0);
 assert.equal(loaded.bodies.find(b=>b.id==='human').support,null);
 assert.equal(nextAuthoringSequence(loaded),135);
 assert.notEqual(loaded.scene,w.scene);
});
test('reject invalid, ambiguous or oversized inputs before mutating current world',()=>{
 const w=createLiveWorld(),original=saved(w);
 const variants=[
  {format:'splot-playtest-local-v1',scene:w.scene,bodies:w.bodies,time:w.time},
  {...JSON.parse(original),time:NaN},
  {...JSON.parse(original),bodies:[...w.bodies,w.bodies[0]]},
  {...JSON.parse(original),scene:{...w.scene,elements:[...w.scene.elements,
   {...w.scene.elements[0],id:w.scene.elements[0].id}]}},
  {...JSON.parse(original),bodies:[...w.bodies.map(b=>({...b})).map(b=>b.kind==='crate'?{...b,x:Infinity}:b)]}
 ];
 for(const payload of variants)assert.throws(()=>restoreResearchWorld(payload));
 assert.equal(saved(w),original);
});
test('does not promote untrusted object metadata or save velocities into physics truth',()=>{
 const w=createLiveWorld(),raw=JSON.parse(saved(w));
 raw.scene.elements[0].inject='not world truth';
 raw.bodies[0].script='arbitrary';
 raw.bodies[0].vz=-999;
 const r=restoreResearchWorld(raw);
 assert.equal(r.scene.elements[0].inject,undefined);
 assert.equal(r.bodies[0].script,undefined);
 assert.equal(r.bodies[0].vz,0);
});

test('crate identity continues after restoring a sparse numbered collection',()=>{
 const w=createLiveWorld();
 assert.equal(addCrate(w,3,3).id,'crate-2');
 assert.equal(addCrate(w,5,3).id,'crate-3');
 w.bodies=w.bodies.filter(b=>b.id!=='crate-2');
 const restored=restoreResearchWorld(saved(w));
 assert.equal(addCrate(restored,7,3).id,'crate-4');
 assert.equal(new Set(restored.bodies.map(b=>b.id)).size,restored.bodies.length);
});


test('no authored part can impersonate a live actor or crate ID on scene restore',()=>{
 const w=createLiveWorld(),base=JSON.parse(saved(w));
 for(const id of ['crate-1','human','boar']){
  const forged={...base,scene:{...base.scene,elements:[...base.scene.elements,
   {id,kind:'box',min:[3,3,0],max:[4,4,1],material:'wood'}]}};
  assert.throws(()=>restoreResearchWorld(forged),/identyfikator|powtarzający się/,
   'a visible scene element must never alias solver-owned body '+id);
 }
});
