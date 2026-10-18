// Bounded, seeded test of material authoring + running world + save/restore.
// A clean run is not evidence of good gameplay, perception, or real rigid-body physics.
import {createWorld,getBody,tickWorld,placeObject,eraseObject,bodyConflicts,snapshot,restore,DT} from '../src/world.mjs';
import fs from 'node:fs';
const rng=(seed)=>()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/2**32;
const stats={seeds:10,ticks:0,editsAccepted:0,editsRejected:0,erasures:0,checks:0,roundtrips:0,violations:[],reasons:{},invalidations:0};
for(let seed=1;seed<=stats.seeds;seed++){
 const r=rng(seed*20261018),w=createWorld(500+seed),authored=[];
 for(let t=0;t<900;t++){
  if(t%13===0){
   const kind=r()<.56?'wall':'crate';
   const x=27+r()*29,y=18+r()*20;
   const oldRevision=w.revision;
   const res=placeObject(w,kind,x,y);
   if(res.ok){stats.editsAccepted++;authored.push(res.id);if(w.revision<=oldRevision)stats.violations.push({seed,t,type:'no-authoring-revision'});}
   else {stats.editsRejected++;stats.reasons[res.reason]=(stats.reasons[res.reason]||0)+1;}
  }
  if(t%29===0&&authored.length){
   const id=authored.splice(Math.floor(r()*authored.length),1)[0];
   const res=eraseObject(w,id);
   if(res.ok)stats.erasures++;
   else stats.violations.push({seed,t,type:'erase-failed',id,reason:res.reason});
  }
  const actor=seed%2?'player':'scout';
  const a=tickWorld(w,{selected:actor,move:[r()*2-1,r()*2-1],ai:true});
  for(const b of w.bodies){
   stats.checks++;
   if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||!Number.isFinite(b.z)||b.z<0)
    stats.violations.push({seed,t,type:'invalid-coordinate',id:b.id});
   const hits=bodyConflicts(w,b).filter(x=>x!=='bounds');
   if(hits.length)stats.violations.push({seed,t,type:'intersection',id:b.id,hits});
  }
  if(t%90===0){
   const ss=snapshot(w),v=restore(ss);stats.roundtrips++;
   if(snapshot(v)!==ss)stats.violations.push({seed,t,type:'snapshot-not-identical'});
  }
  stats.ticks++;
 }
}
const out={...stats,violations:stats.violations.slice(0,30),violationCount:stats.violations.length};
fs.writeFileSync(new URL('../AUTHORING_CHAOS_RESULTS.json',import.meta.url),JSON.stringify(out,null,2));
console.log(JSON.stringify({...out,violations:out.violations.slice(0,5)},null,2));
if(stats.violations.length)process.exitCode=1;
