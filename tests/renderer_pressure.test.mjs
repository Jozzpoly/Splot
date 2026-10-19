import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld, placeScaffold, raycast, bodyConflicts} from '../src/world.mjs';
const k = .53 / .67;
function cameraHit(world,p,ignore){
 const target={x:p.x,y:p.y,z:p.z},start={x:p.x,y:p.y+10*k,z:p.z+10};
 return raycast(world,start,target,{ignore});
}
function example(){
 const w=createWorld();
 assert.equal(placeScaffold(w,20,23,{turns:3,height:1.8}).ok,true);
 assert.equal(placeScaffold(w,16,13,{turns:0,height:2.2}).ok,true);
 return w;
}
test('a physically admissible ground actor can have feet obscured by the platform while head remains visible',()=>{
 const w=example(),body={id:'probe',kind:'human',x:18.55,y:14.55,z:0,r:.3,h:1.64};
 const ignore=new Set(w.bodies.map(b=>b.id));
 assert.deepEqual(bodyConflicts(w,body,new Map(),ignore),[],'ground actor not in any solid');
 const ids=[...ignore];
 const foot=cameraHit(w,{x:body.x,y:body.y,z:.14},ids);
 const head=cameraHit(w,{x:body.x,y:body.y,z:1.5},ids);
 assert.equal(foot?.id,'made-platform-2');
 assert.equal(head,null);
});
test('same actor foot/head partial occlusion is not a special case of the original bridge',()=>{
 const w=example(),body={id:'probe',kind:'human',x:16.3,y:12.3,z:0,r:.3,h:1.64};
 const ignore=new Set(w.bodies.map(b=>b.id));
 assert.deepEqual(bodyConflicts(w,body,new Map(),ignore),[]);
 const ids=[...ignore];
 assert.equal(cameraHit(w,{x:body.x,y:body.y,z:.14},ids)?.id,'made-ramp-3');
 assert.equal(cameraHit(w,{x:body.x,y:body.y,z:1.5},ids),null);
});
test('a ground actor at the shallow entry ramp has an occluded foot although the whole-object painter would draw it last',()=>{
 const w=example(),b={id:'probe',kind:'human',x:20,y:22.8,z:0,r:.3,h:1.64,support:'ground'};
 const ignored=w.bodies.map(x=>x.id);
 assert.deepEqual(bodyConflicts(w,b,new Map(),new Set(ignored)),[],'low ramp entry is physically allowed');
 const foot=cameraHit(w,{x:b.x,y:b.y,z:.02},ignored);
 const head=cameraHit(w,{x:b.x,y:b.y,z:1.5},ignored);
 assert.equal(foot?.id,'made-ramp-1','physical ramp blocks the near-foot ray');
 assert.equal(head,null,'head ray remains unobstructed');
 const ramp=w.constructions.find(x=>x.id==='made-ramp-1');
 const painterActor=b.z+b.h-.05+.57*b.y;
 const painterRamp=Math.max(ramp.z0,ramp.z1)+.57*(ramp.ay+ramp.by)/2;
 assert.ok(painterActor>painterRamp,'legacy painter would place the entire actor in front of the ramp');
});
test.todo('compare actual actor pixels to world-ray visibility on the grounded ramp-contact case; the head/foot ray oracle alone is not a renderer test');