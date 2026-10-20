import test from 'node:test';
import assert from 'node:assert/strict';
import {followGainForSeconds,advanceCameraTarget} from '../../src/next/camera-timing.mjs';
test('exact legacy camera gain at 60Hz, not 240Hz gain',()=>{
 assert.ok(Math.abs(followGainForSeconds(.16,1/60)-.16)<1e-12);
 assert.ok(Math.abs(followGainForSeconds(.10,1/60)-.10)<1e-12);
 assert.ok(Math.abs(followGainForSeconds(.16,1/240)-.042659)<.001);
});
test('one second of camera smoothing has equal position at 60, 120 and 240Hz',()=>{
 const trial=(hz)=>{
  let position=[0,0,0];
  for(let i=0;i<hz;i++)position=advanceCameraTarget(position,[20,-5,4],1/hz);
  return position;
 };
 const base=trial(60);
 for(const hz of [120,240]){
  const t=trial(hz);
  for(let j=0;j<3;j++)assert.ok(Math.abs(t[j]-base[j])<1e-8);
 }
});
test('invalid and huge time gaps cannot corrupt or teleport camera',()=>{
 const original=[1,2,3];
 const z=advanceCameraTarget(original,[18,9,7],NaN);
 assert.deepEqual(z,original);
 assert.deepEqual(original,[1,2,3]);
 const step=advanceCameraTarget(original,[18,9,7],10);
 assert.ok(step[0]>1&&step[0]<18);
 assert.ok(step[2]>3&&step[2]<7);
});
