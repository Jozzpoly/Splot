import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,placeScaffold,solids,raycast,bodyConflicts,snapshot,restore,eraseConstruction,walk,getBody,gravityStep} from '../../src/world.mjs';

function setUp(x=20,y=35,turns=0,height=1.8){
 const w=createWorld();
 const r=placeScaffold(w,x,y,{turns,height});
 assert.equal(r.ok,true,JSON.stringify(r));
 return {w,platform:r.ids.find(id=>id.includes('platform')),ramp:r.ids.find(id=>id.includes('ramp'))};
}
test('authored elevated platform has physical members from the same construction ID',()=>{
 const {w,platform}=setUp();
 const members=solids(w).filter(s=>s.id.startsWith(platform+':post:'));
 assert.equal(members.length,4);
 for(const p of members){assert.equal(p.minZ,0);assert.ok(p.maxZ>1.25&&p.maxZ<1.8); assert.equal(p.material,'stone');}
});
test('platform posts are material: stop actors and raycasts, not drawn-only decoration',()=>{
 const {w,platform}=setUp();const post=solids(w).find(s=>s.id.startsWith(platform+':post:'));
 const at={id:'probe',kind:'human',x:(post.minX+post.maxX)/2,y:(post.minY+post.maxY)/2,z:0,r:.3,h:1.64,support:'ground'};
 assert.ok(bodyConflicts(w,at).includes(post.id));
 const cy=(post.minY+post.maxY)/2,cz=Math.min(post.maxZ*.5,.6);
 const hit=raycast(w,{x:post.minX-1,y:cy,z:cz},{x:post.maxX+1,y:cy,z:cz});
 assert.equal(hit?.id,post.id);
});
test('two orientations and heights use same physical support semantics and survive exact save',()=>{
 for(const turns of [1,2,3]){const {w,platform}=setUp(24,36,turns,2.2);
  assert.equal(solids(w).filter(s=>s.id.startsWith(platform+':post:')).length,4);
  const imported=restore(snapshot(w));
  assert.deepEqual(solids(imported).filter(s=>s.id.startsWith(platform+':post:')),solids(w).filter(s=>s.id.startsWith(platform+':post:')));
 }
});
test('removing platform removes only its own posts, leaving other structures',()=>{
 const {w,platform}=setUp();const r=placeScaffold(w,35,43,{turns:0,height:2.2});assert.ok(r.ok,JSON.stringify(r));
 const before=solids(w).filter(s=>s.id.includes(':post:'));assert.equal(before.length,8);
 assert.equal(eraseConstruction(w,platform).ok,true);
 assert.equal(solids(w).filter(s=>s.id.startsWith(platform+':post:')).length,0);
 assert.equal(solids(w).filter(s=>s.id.includes(':post:')).length,4);
});
test('builder cannot put new vertical posts through an old ground actor or authored wall',()=>{
 const w=createWorld();let r=placeScaffold(w,20,35,{turns:0,height:1.8});assert.ok(r.ok);
 const post=solids(w).find(s=>s.id.includes(':post:'));
 // Use the same geometry as if an existing actor were at a future post location.
 const w2=createWorld();Object.assign(getBody(w2,'player'),{x:(post.minX+post.maxX)/2,y:(post.minY+post.maxY)/2,z:0,support:'ground'});
 const snap=snapshot(w2);const invalid=placeScaffold(w2,20,35,{turns:0,height:1.8});
 assert.equal(invalid.ok,false);
 assert.equal(snapshot(w2),snap);
});