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

test('new boar perception reacts to a seen player, not a player behind opaque matter',()=>{
 const m=createBoarIntent({mode:'responsive-los'}),b={x:10,y:10,z:0,h:.75},
 p={x:11.5,y:10,z:0,h:1.6},food={x:15,y:13};
 assert.equal(m.choose({boar:b,player:p,food,time:1,playerVisible:false}).phase,'travel');
 const seen=m.choose({boar:b,player:p,food,time:1.1,playerVisible:true});
 assert.equal(seen.phase,'wary');assert.deepEqual(seen.lastSeen,{x:11.5,y:10});
 const hidden=m.choose({boar:b,player:{...p,x:8,y:13},food,time:1.4,playerVisible:false});
 assert.equal(hidden.phase,'wary');
 assert.deepEqual(hidden.lastSeen,{x:11.5,y:10});
 assert.ok(hidden.dir[0]<0&&Math.abs(hidden.dir[1])<1e-8);
 assert.equal(m.choose({boar:b,player:p,food,time:8,playerVisible:false}).phase,'travel');
 m.setMode('forage');
 assert.equal(m.choose({boar:b,player:p,food,time:9,playerVisible:true}).phase,'travel');
});
test('old responsive behavior remains the distance-only control',()=>{
 const m=createBoarIntent({mode:'responsive'});
 assert.equal(m.choose({boar:{x:10,y:10,z:0,h:.75},
 player:{x:11.5,y:10,z:0,h:1.6},food:{x:15,y:10},time:1,playerVisible:false}).phase,'wary');
});

test('opt-in crate-sensitive vision shares last-seen memory without altering old modes',()=>{
 const m=createBoarIntent({mode:'responsive-los-crates'});
 const boar={x:10,y:10,z:0,h:.75},player={x:11.5,y:10,z:0,h:1.6},food={x:15,y:10};
 assert.equal(m.choose({boar,player,food,time:1,playerVisible:false}).phase,'travel');
 assert.equal(m.choose({boar,player,food,time:1.1,playerVisible:true}).phase,'wary');
 assert.deepEqual(m.choose({boar,player:{...player,x:8,y:12},food,time:1.2,playerVisible:false}).lastSeen,{x:11.5,y:10});
 m.setMode('responsive-los');
 assert.equal(m.choose({boar,player,food,time:2,playerVisible:false}).phase,'travel');
});
