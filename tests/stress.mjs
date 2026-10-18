import {createWorld,getBody,tickWorld,removeBridge,bodyConflicts,walk,DT,canReach,snapshot,restore} from '../src/world.mjs';import fs from 'node:fs';
const rng=(seed)=>()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/2**32;
const results={seedCount:12,stepsPerSeed:1500,ticks:0,attempts:0,failures:[],contacts:0,landings:0,pathCompleted:0,boarFoodReachedAt:null,characterSupportContact:0};
for(let seed=1;seed<=12;seed++){
 const random=rng(seed*1987),w=createWorld(seed),modes=['player','scout'];let prevPositions=new Map();
 for(let i=0;i<1500;i++){
  if(i===700&&seed%3===0)removeBridge(w);
  let selected=modes[seed%2],ang=Math.floor(i/47+random()*2)*.45;
  const commands={selected,move:[Math.cos(ang),Math.sin(ang)],ai:true};
  const events=tickWorld(w,commands);results.contacts+=events.filter(e=>e.type==='blocked').length;results.landings+=events.filter(e=>e.type==='land').length;
  const a=getBody(w,selected);if(a.support?.startsWith('body:'))results.characterSupportContact++;
  for(const b of w.bodies){
    results.attempts++;
    if(!Number.isFinite(b.x)||!Number.isFinite(b.z)||b.z<0)results.failures.push({seed,i,id:b.id,kind:'invalid-coordinate'});
    const overlapping=bodyConflicts(w,b).filter(id=>id!=='bounds');if(overlapping.length)results.failures.push({seed,i,id:b.id,kind:'overlap',overlapping});
  }
  if(w.goal.eaten){results.pathCompleted++;}
  results.ticks++;
 }
 if(seed===1) results.boarFoodReachedAt=w.goal.eaten? w.time:null;
 const a=restore(snapshot(w));if(snapshot(a)!==snapshot(w))results.failures.push({seed,kind:'snapshot-roundtrip'});
}
fs.writeFileSync(new URL('../STRESS_RESULTS.json',import.meta.url),JSON.stringify({...results,failures:results.failures.slice(0,24),failureCount:results.failures.length},null,2));console.log(JSON.stringify({ticks:results.ticks,bodyValidations:results.attempts,contacts:results.contacts,landings:results.landings,failures:results.failures.length,pathCompleted:results.pathCompleted,characterSupportContact:results.characterSupportContact},null,2));if(results.failures.length)process.exitCode=1;
