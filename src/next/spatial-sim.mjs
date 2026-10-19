import {createSpatialWorld,insertElement,supportCandidates,clearanceAt} from './spatial-core.mjs';
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createLiveWorld(){
 const scene=createSpatialWorld({width:42,height:32});
 const put=o=>{const r=insertElement(scene,o);if(!r.ok)throw Error(r.reason)};
 put({id:'footbridge-ramp',kind:'panel',a:[13,13,0],b:[18,13,2.4],width:2.3,thickness:.22,material:'wood'});
 put({id:'footbridge-deck',kind:'panel',a:[18,13,2.4],b:[28,13,2.4],width:4,thickness:.30,material:'wood'});
 for(const [id,x,y] of [['nw',18,11.15],['ne',27.6,11.15],['sw',18,14.85],['se',27.6,14.85]])
  put({id:'support-'+id,kind:'box',min:[x-.18,y-.18,0],max:[x+.18,y+.18,2.4],material:'stone'});
 put({id:'boulder',kind:'box',min:[30,18,0],max:[32,20,1.6],material:'stone'});
 const bodies=[{id:'human',kind:'human',x:12.2,y:14,z:0,r:.32,h:1.6,mass:76,support:'ground',vz:0,yaw:0},
 {id:'crate-1',kind:'crate',x:14.2,y:15.2,z:0,r:.43,h:.86,mass:36,support:'ground',vz:0,yaw:0},
 {id:'boar',kind:'boar',x:29,y:21,z:0,r:.43,h:.75,mass:82,support:'ground',vz:0,yaw:1}];
 return {scene,bodies,time:0,grip:null,events:[],food:{x:35,y:12,z:0},paused:false};
}
export const getBody=(w,id)=>w.bodies.find(b=>b.id===id);
function overlap(a,b,x=a.x,y=a.y,z=a.z){return (x-b.x)**2+(y-b.y)**2<(a.r+b.r-.005)**2&&z<b.z+b.h-.01&&z+a.h>b.z+.01;}
function walkOne(w,b,dx,dy,dt,{push=true}={}){
 if(!b||(!dx&&!dy)||b.support===null)return false;
 const x=b.x+dx,y=b.y+dy;
 const list=supportCandidates(w.scene,x,y,{maxZ:31});
 // Gradual ramp traversal; descent larger than a stair becomes a real fall.
 const candidates=list.filter(s=>s.z<=b.z+.27).sort((a,c)=>Math.abs(a.z-b.z)-Math.abs(c.z-b.z));
 let choice=null;
 for(const s of candidates){if(Math.abs(s.z-b.z)>.52)continue;
  if(clearanceAt(w.scene,{x,y,z:s.z,r:b.r,h:b.h,supportId:s.id}).free){choice=s;break;}}
 const nz=choice?.z??b.z;
 if(!clearanceAt(w.scene,{x,y,z:nz,r:b.r,h:b.h,supportId:choice?.id}).free)return false;
 const hit=w.bodies.find(o=>o!==b&&overlap(b,o,x,y,nz));
 if(hit){
  if(push&&b.kind==='human'&&hit.kind==='crate'&&hit.support!==null){
   const moved=walkOne(w,hit,dx,dy,dt,{push:false});
   if(!moved){w.events.push({type:'blocked',by:hit.id,time:w.time});return false;}
  }else return false;
 }
 b.x=x;b.y=y;b.z=nz;b.support=choice?.id??null;
 if(!choice)b.vz=0;
 if(Math.hypot(dx,dy)>.001)b.yaw=Math.atan2(dy,dx);
 return true;
}
function gravityStep(w,b,dt){
 if(b.support!==null){
  const s=supportCandidates(w.scene,b.x,b.y,{maxZ:31}).find(o=>o.id===b.support&&Math.abs(o.z-b.z)<.25);
  if(s){b.z=s.z;b.vz=0;return;}
  b.support=null;
 }
 const from=b.z;b.vz=Math.max(-24,b.vz-16*dt);let z=Math.max(-2,from+b.vz*dt);
 const s=supportCandidates(w.scene,b.x,b.y,{maxZ:31}).find(o=>o.z<=from+.001&&o.z>=z-.001);
 if(s){z=s.z;b.vz=0;b.support=s.id;w.events.push({type:'land',id:b.id,on:s.id,time:w.time});}
 b.z=z;
}
function clampMove(x,y,speed,dt){const len=Math.hypot(x,y);if(!len)return [0,0];const k=Math.min(len,1)*speed*dt/len;return [x*k,y*k];}
export function moveBody(w,id,[vx,vy],dt){const b=getBody(w,id);if(!b)throw Error('unknown-body');
 const [dx,dy]=clampMove(vx,vy,id==='boar'?2.6:4.1,dt);
 const succeeded=walkOne(w,b,dx,dy,dt);
 if(w.grip&&id==='human'){const crate=getBody(w,w.grip);if(!crate||near(b,crate)>1.8||Math.abs(b.z-crate.z)>.6){w.grip=null;w.events.push({type:'release',reason:'separation',time:w.time});}}
 return succeeded;
}
export function toggleGrip(w){const human=getBody(w,'human');if(w.grip){w.events.push({type:'release',id:w.grip,time:w.time});w.grip=null;return {ok:true,gripped:false};}
 const candidates=w.bodies.filter(b=>b.kind==='crate'&&Math.abs(human.z-b.z)<.5&&near(human,b)<1.45).sort((a,b)=>near(human,a)-near(human,b));
 if(!candidates.length)return {ok:false,reason:'out-of-reach'};
 w.grip=candidates[0].id;w.events.push({type:'grip',id:w.grip,time:w.time});return {ok:true,gripped:true,id:w.grip};
}
export function stepLive(w,dt,input=[0,0]){
 if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('invalid-dt');if(w.paused)return;
 w.time+=dt;moveBody(w,'human',input,dt);
 const human=getBody(w,'human');
 // A gripped crate is a *constrained sliding object*, not a 3D rigid body.
 // Preserve reaction and reach; no fictitious moment/rotation impulses.
 if(w.grip){const c=getBody(w,w.grip);if(c){let dx=human.x-c.x,dy=human.y-c.y,d=Math.hypot(dx,dy);
  if(d>1.0){const step=clampMove(dx,dy,Math.min(4.1,(d-1)*10),dt);
   if(!walkOne(w,c,step[0],step[1],dt,{push:false})&&d>1.6){w.grip=null;w.events.push({type:'release',reason:'contact',time:w.time});}
  }
 }}
 const boar=getBody(w,'boar'),d=Math.hypot(w.food.x-boar.x,w.food.y-boar.y);
 if(d>.8&&w.time%1.0<.74){
  // Local sensing and locomotion only; this is not yet pathfinding or epistemics.
  const x=(w.food.x-boar.x)/d,y=(w.food.y-boar.y)/d;
  if(!moveBody(w,'boar',[x,y],dt))moveBody(w,'boar',[-y,x],dt);
 }
 for(const b of w.bodies)gravityStep(w,b,dt);
 if(w.events.length>80)w.events=w.events.slice(-80);
}
export function addCrate(w,x,y,z=0){const i=w.bodies.filter(b=>b.kind==='crate').length+1;
 const p={id:'crate-'+i,kind:'crate',x,y,z,r:.43,h:.86,mass:36,support:null,vz:0,yaw:0};
 if(!clearanceAt(w.scene,{x,y,z,r:p.r,h:p.h}).free)return {ok:false,reason:'occupied'};
 w.bodies.push(p);return {ok:true,id:p.id};
}
