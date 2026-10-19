// Feniks-derived pressure case: same XY is not the same physical place.
// Test the LIVE Splot world with a builder-created platform, not the K3 lab.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,getBody,placeScaffold,bodyConflicts,raycast,surfaces,updateBoar,DT,tickWorld} from '../src/world.mjs';

function platformFoodCase(boarOnPlatform,foodOnPlatform) {
  const w=createWorld();
  const placed=placeScaffold(w,17,15,{turns:0,height:1.8});
  assert.equal(placed.ok,true,JSON.stringify(placed));
  const platform=w.constructions[1],x=(platform.ax+platform.bx)/2,y=(platform.ay+platform.by)/2;
  const b=getBody(w,'boar');
  Object.assign(b,{x,y,z:boarOnPlatform?1.8:0,support:boarOnPlatform?platform.id:'ground',vz:0});
  w.goal={id:'food',x,y,z:foodOnPlatform?1.8:0,eaten:false};
  assert.deepEqual(bodyConflicts(w,b),[], 'test setup must be a geometrically valid body pose');
  return w;
}

test('boar directly below player-authored platform cannot consume food above through floor',()=>{
  const w=platformFoodCase(false,true);
  updateBoar(w,DT);
  assert.equal(w.goal.eaten,false,'same XY on different support levels is NOT an encounter');
  assert.equal(w.events.some(e=>e.type==='food-reached'),false);
  for(let i=0;i<120;i++)tickWorld(w,{ai:true});
  assert.equal(w.goal.eaten,false,'flat route must not silently grant vertical consumption');
});

test('boar atop authored platform cannot consume food below through floor',()=>{
  const w=platformFoodCase(true,false);
  updateBoar(w,DT);
  assert.equal(w.goal.eaten,false);
  assert.equal(w.events.some(e=>e.type==='food-reached'),false);
});

test('boar and food on same ground surface can still interact',()=>{
  const w=platformFoodCase(false,false);
  updateBoar(w,DT);
  assert.equal(w.goal.eaten,true);
  assert.ok(w.events.some(e=>e.type==='food-reached'));
});

test('boar and food on same upper surface can still interact',()=>{
  const w=platformFoodCase(true,true);
  updateBoar(w,DT);
  assert.equal(w.goal.eaten,true);
  assert.ok(w.events.some(e=>e.type==='food-reached'));
});

test.todo('Nav must represent multi-height support surfaces and legal connections; XY-only A* is not sufficient');
test.todo('AI must acquire knowledge through perception rather than reading all geometry and goal positions');

test('stacked positions remain distinct: boar may shelter below while scout occupies platform above',()=>{
  const w=platformFoodCase(false,true),boar=getBody(w,'boar'),scout=getBody(w,'scout');
  Object.assign(scout,{x:boar.x,y:boar.y,z:1.8,support:w.constructions[1].id,vz:0});
  assert.deepEqual(bodyConflicts(w,boar),[], 'ground boar is physically below platform');
  assert.deepEqual(bodyConflicts(w,scout),[], 'scout stands on the surface, not inside boar');
  const candidates=w.constructions.filter(p=>Math.abs(p.z0-1.8)<1e-8);
  assert.equal(candidates.length,1);
  const supports=surfaces(w,boar.x,boar.y);
  assert.ok(supports.some(s=>s.id==='ground'&&s.z===0));
  assert.ok(supports.some(s=>s.id===w.constructions[1].id&&Math.abs(s.z-1.8)<1e-9));
  const hit=raycast(w,{x:boar.x,y:boar.y,z:3.0},{x:boar.x,y:boar.y,z:1.0},
    {ignore:['scout','boar','player','crate','deck-crate']});
  assert.equal(hit.id,w.constructions[1].id, 'same structure must occlude a downward physical ray');
});
