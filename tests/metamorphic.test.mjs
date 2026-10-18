// Scope-limited generalization probes, not a claim of local perception or global navigation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,getBody,tickWorld} from '../src/world.mjs';

function scenario(start,goal,seed=917,limit=1200) {
  const world=createWorld(seed);
  const animal=getBody(world,'boar');
  [animal.x,animal.y]=start;
  [world.goal.x,world.goal.y]=goal;
  world.nav.path=[];
  for(let t=0;t<limit&&!world.goal.eaten;t++) tickWorld(world,{ai:true});
  return {arrived:world.goal.eaten,seconds:world.time,position:[animal.x,animal.y],routes:world.stats.routes};
}

const localCases=[
 ['old center', [40,22.5],[49.2,28.4]],
 ['upper left',[4,4],[6,4]],
 ['upper right',[77,5],[79,5]],
 ['lower left',[6,48],[8,48]],
 ['lower right',[77,48],[79,48]],
 ['lower edge',[40,48],[40,51]],
 ['rotated near left edge',[5,28],[5,32]],
];
for(const [label,start,goal] of localCases) {
 test('same navigation rule works outside authored scene: '+label,()=>{
  const r=scenario(start,goal);
  assert.equal(r.arrived,true,JSON.stringify({label,...r}));
  assert(r.seconds<20,JSON.stringify({label,...r}));
 });
}
test('navigation relocations are deterministic for identical seed',()=>{
 const a=scenario([4,4],[6,4],67),b=scenario([4,4],[6,4],67);
 assert.deepEqual(a,b);
});
