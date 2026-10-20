import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialWorld,insertElement,exportWorld,importWorld,supportCandidates} from '../../src/next/spatial-core.mjs';
import {partMotionMode,setBoxMotion,boxCenter,translateBoxToCenter,boxVolume} from '../../src/next/part-lifecycle.mjs';

const fresh=()=>{
 const scene=createSpatialWorld();
 assert.equal(insertElement(scene,{id:'box-one',kind:'box',
  min:[4,5,3],max:[6,7,5],material:'wood'}).ok,true);
 return scene;
};
test('release and re-anchor preserve the same part ID and auth revision',()=>{
 const scene=fresh(),id=scene.elements[0].id,rev=scene.revision;
 assert.equal(partMotionMode(scene.elements[0]),'anchored');
 assert.equal(setBoxMotion(scene,id,'dynamic').ok,true);
 assert.equal(scene.revision,rev+1);
 assert.equal(scene.elements[0].id,id);
 assert.equal(partMotionMode(scene.elements[0]),'dynamic');
 const motionRev=scene.revision;
 const before=boxCenter(scene.elements[0]);
 assert.equal(translateBoxToCenter(scene.elements[0],[before[0],before[1],2]),true);
 assert.equal(scene.revision,motionRev,'simulation must not fake authoring revision');
 assert.deepEqual(scene.elements[0].min,[4,5,1]);
 assert.equal(setBoxMotion(scene,id,'anchored').ok,true);
 assert.equal(partMotionMode(scene.elements[0]),'anchored');
 assert.deepEqual(scene.elements[0].min,[4,5,1]);
 assert.equal(boxVolume(scene.elements[0]),8);
});
test('moving scene geometry updates the same support and ray truth',()=>{
 const scene=fresh();setBoxMotion(scene,'box-one','dynamic');
 assert.equal(supportCandidates(scene,5,6).find(h=>h.id==='box-one').z,5);
 translateBoxToCenter(scene.elements[0],[5,6,2]);
 assert.equal(supportCandidates(scene,5,6).find(h=>h.id==='box-one').z,3);
 const saved=exportWorld(scene),restored=importWorld(saved);
 assert.equal(partMotionMode(restored.elements[0]),'dynamic');
 assert.equal(restored.elements[0].min[2],1);
});
test('reject unsupported types instead of silently fabricating structural physics',()=>{
 const scene=fresh();
 assert.equal(insertElement(scene,{id:'panel-one',kind:'panel',a:[3,3,0],b:[7,3,2],width:2,thickness:.2}).ok,true);
 const rev=scene.revision;
 assert.equal(setBoxMotion(scene,'panel-one','dynamic').reason,'box-only-research-boundary');
 assert.equal(setBoxMotion(scene,'box-one','rolling').reason,'invalid-motion-type');
 assert.equal(setBoxMotion(scene,'not-found','dynamic').reason,'not-found');
 assert.equal(scene.revision,rev);
});

test('reject invalid motion types',()=>{
 const scene=fresh(),rev=scene.revision;
 const invalid={id:'bad-box',kind:'box',min:[3,3,1],max:[4,4,2],motionType:'flying'};
 assert.equal(insertElement(scene,invalid).reason,'unsupported-motion-type');
 const panel={id:'bad-panel',kind:'panel',a:[3,3,0],b:[7,3,2],width:2,thickness:.2,motionType:'dynamic'};
 assert.equal(insertElement(scene,panel).reason,'unsupported-motion-type');
 assert.equal(scene.revision,rev);
});
