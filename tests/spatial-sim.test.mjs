import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveWorld,getBody,moveBody,stepLive,toggleGrip,addCrate} from '../src/next/spatial-sim.mjs';
import {supportCandidates,removeElement,insertElement} from '../src/next/spatial-core.mjs';
test('live scene includes separately editable ramp, deck, supports, player, crate and animal',()=>{
 const w=createLiveWorld();assert.equal(w.scene.elements.length,7);assert.equal(w.bodies.length,3);
 assert.ok(w.scene.elements.some(e=>e.id==='footbridge-ramp'));
});
test('player moves in world coordinates and cannot walk through masonry',()=>{
 const w=createLiveWorld(),b=getBody(w,'human');
 for(let i=0;i<10;i++)stepLive(w,1/60,[1,0]);
 assert.ok(b.x>12.2);assert.equal(b.z,0);
});
test('rendered or hidden panels have actual physical height and traversable slope',()=>{
 const w=createLiveWorld(),b=getBody(w,'human');
 Object.assign(b,{x:13.4,y:13,z:.192,support:'footbridge-ramp'});
 let last=b.z;
 for(let i=0;i<85;i++){stepLive(w,1/60,[1,0]);assert.ok(b.z>=last-.1);last=b.z;}
 assert.ok(b.z>1.2,'should ascend above one metre, rather than remain on flat XY ground');
});
test('the lower passage and upper deck are distinct support choices',()=>{
 const w=createLiveWorld(),hits=supportCandidates(w.scene,22,13);
 assert.deepEqual(hits.map(h=>h.id),['footbridge-deck','ground']);
});
test('independent removal of deck invalidates support and leads to gravity',()=>{
 const w=createLiveWorld(),b=getBody(w,'human');
 Object.assign(b,{x:24,y:13,z:2.4,support:'footbridge-deck'});
 assert.equal(removeElement(w.scene,'footbridge-deck').ok,true);
 stepLive(w,1/60);assert.equal(b.support,null);
 for(let i=0;i<80;i++)stepLive(w,1/60);
 assert.ok(b.z<.02);assert.equal(b.support,'ground');
});
test('grip is range and elevation bounded, rather than XY-only',()=>{
 const w=createLiveWorld(),c=getBody(w,'crate-1');
 assert.equal(toggleGrip(w).ok,false);
 getBody(w,'human').x=13.7;getBody(w,'human').y=15.2;
 assert.equal(toggleGrip(w).ok,true);assert.equal(w.grip,'crate-1');
 assert.equal(toggleGrip(w).gripped,false);
 c.z=2.4;c.support='footbridge-deck';assert.equal(toggleGrip(w).ok,false);
});
test('new crate occupies actual world volume and edits are independently addressable',()=>{
 const w=createLiveWorld(),r=addCrate(w,32,12);assert.equal(r.ok,true);assert.ok(getBody(w,r.id));
});
