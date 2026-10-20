import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlaytestJournal} from '../../src/next/playtest-journal.mjs';

const mock=()=>{
 let ms=1000;
 const journal=createPlaytestJournal({clock:()=>ms,iso:()=>`test-clock-${ms}`});
 return {journal,advance:n=>ms+=n};
};
const scene=()=>{
 const w={time:0,scene:{elements:[{id:'ramp'}]},events:[],
  bodies:[{id:'human',x:1,y:1,z:0,r:.32,h:1.6},
   {id:'boar',x:3,y:3,z:0,r:.43,h:.75},
   {id:'crate-1',x:2,y:1,z:0,r:.43,h:.86}]};
 return w;
};
test('activity signal without opt-in never persists samples',()=>{
 const {journal:j,advance}=mock();
 j.interact('keyboard');advance(100);
 assert.match(j.status().label,/interakcje/);
 assert.equal(j.report().events.length,0);
 assert.equal(j.report().startedAt,null);
});
test('opt-in captures world causality without claiming user identity',()=>{
 const {journal:j,advance}=mock(),w=scene();
 assert.equal(j.start({engine:'box3d'}),true);
 j.interact('keyboard');j.observe(w,{engine:'box3d'});
 w.events.push({type:'land',id:'human',on:'ground'});
 advance(520);j.observe(w,{engine:'box3d'});
 assert.equal(j.report().events.filter(e=>e.type==='world-event').length,1);
 w.events.push({type:'actor-soft-contact-start',id:'human',with:'boar',gap:-.02,impulse:12.5});
 advance(520);j.observe(w,{engine:'box3d'});
 const contact=j.report().events.find(e=>e.type==='world-event'&&e.data.kind==='actor-soft-contact-start');
 assert.equal(contact.data.with,'boar');
 assert.equal(contact.data.impulse,12.5);
 assert.equal(contact.data.gap,-.02);
 w.bodies[1].x=1.3;w.bodies[1].y=1.2;
 advance(520);j.observe(w,{engine:'box3d'});
 assert.equal(j.report().summary.nearPasses,1);
 assert.ok(j.report().events.some(e=>e.type==='actor-proximity'));
 assert.equal(j.report().format,'splot-playtest-local-v1');
 assert.match(j.report().caveats.join(' '),/not proof of collision/);
 j.stop();const count=j.report().events.length;advance(1000);j.observe(w);
 assert.equal(j.report().events.length,count);
});
test('reset and data bound do not hide missing activity or record while off',()=>{
 const {journal:j,advance}=mock();
 j.start();let w=scene();
 for(let i=0;i<2200;i++){
  advance(510);w.time+=.51;j.observe(w,{engine:'box3d'});
 }
 assert.ok(j.report().events.length<=1500);
 const replacement=scene();j.observe(replacement,{engine:'rapier'});
 assert.ok(j.report().events.some(e=>e.type==='world-reset'&&e.data.engine==='rapier'));
 assert.equal(j.status({visible:false,focused:false}).pageVisible,false);
 j.stop();j.start({engine:'box3d'});
 assert.equal(j.report().summary.nearPasses,0);
 assert.ok(!j.report().events.some(e=>e.type==='sample'));
});

test('rolling 80-event world buffer remains observable after saturation',()=>{
 const {journal:j,advance}=mock(),w=scene();
 j.start();
 for(let i=0;i<102;i++){
  w.events.push({type:'tick-'+i,id:'test-body'});
  if(w.events.length>80)w.events=w.events.slice(-80);
  advance(25);j.observe(w);
 }
 const kinds=j.report().events.filter(e=>e.type==='world-event').map(e=>e.data.kind);
 assert.equal(kinds.length,102,'do not lose world events when buffer length stays 80');
 assert.equal(kinds[101],'tick-101');
});

test('source provenance distinguishes reached food from frozen physics and records camera',()=>{
 const {journal:j,advance}=mock(),w=scene();
 w.boarIntent={phase:'feeding',goal:'food',mode:'forage',foodDistance:.69,playerDistance:4};
 j.start({engine:'box3d'});
 j.observe(w,{engine:'box3d',camera:{azimuth:1.2,elevation:1.03,target:[15,13,.5]}});
 const report=j.report();
 const sample=report.events.find(e=>e.type==='sample');
 assert.equal(sample.data.boarIntent.phase,'feeding');
 assert.equal(sample.data.boarIntent.foodDistance,.69);
 assert.equal(sample.data.camera.azimuth,1.2);
 assert.deepEqual(sample.data.camera.target,[15,13,.5]);
 assert.equal(report.inProgress,true);
 assert.equal(report.endedAt,null);
 assert.equal(report.observedAt,'test-clock-1000');
 assert.equal(report.windowSeconds,0);
 advance(1000);
 assert.equal(j.report().windowSeconds,1);
});
