import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoarIntent} from '../../src/next/boar-intent.mjs';
const boar={x:34.54,y:12.51,z:0,h:.75},food={x:35,y:12};
const player={x:31,y:12.51,z:0,h:1.6};
test('original food-only policy intentionally stops when food is reached',()=>{
 const policy=createBoarIntent();
 const r=policy.choose({boar,player,food,time:1});
 assert.equal(r.phase,'feeding');
 assert.deepEqual(r.dir,[0,0]);
 assert.ok(r.foodDistance<.8);
});
test('responsive policy reacts to close player but not separate height',()=>{
 const mind=createBoarIntent({mode:'responsive'});
 const near={...player,x:33.5};
 let r=mind.choose({boar,player:near,food,time:2});
 assert.equal(r.phase,'wary');
 assert.ok(r.dir[0]>0);
 r=mind.choose({boar,player:{...near,x:32},food,time:2.5});
 assert.equal(r.phase,'wary','a short separation should not cause state chatter');
 r=mind.choose({boar,player,food,time:6});
 assert.equal(r.phase,'feeding');
 r=mind.choose({boar,player:{...near,z:5},food,time:7});
 assert.equal(r.phase,'feeding','height overlap should matter');
});
test('switching modes recovers original behavior without a world reset',()=>{
 const mind=createBoarIntent({mode:'responsive'});
 mind.choose({boar,player:{...player,x:33.5},food,time:2});
 mind.setMode('forage');
 const r=mind.choose({boar,player:{...player,x:34.5},food,time:3});
 assert.equal(r.phase,'feeding');
 assert.deepEqual(r.dir,[0,0]);
});
test('fully coincident center does not generate NaN or teleport command',()=>{
 const mind=createBoarIntent({mode:'responsive'});
 const r=mind.choose({boar,player:{...player,x:boar.x,y:boar.y},food,time:1});
 assert.equal(r.phase,'wary');
 assert.ok(r.dir.every(Number.isFinite));
 assert.ok(Math.hypot(...r.dir)<=1+1e-8);
});
