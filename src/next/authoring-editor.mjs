// One authored scene transaction per intentional edit, not per drag frame.
// Box3D owns dynamic poses; history must not overwrite moving solver bodies.
import {insertElement,removeElement,replaceElement,rayFromPixel} from './spatial-core.mjs';
const copy=v=>v===null?null:JSON.parse(JSON.stringify(v));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// In material tools, one selectable target per part, not per intersected face.
// Keep raw face hits in placement tools for intentional support elevation.
export function uniquePartHits(hits){
 const seen=new Set();
 return hits.filter(hit=>{
  if(!hit||typeof hit.id!=='string'||hit.id==='ground'||seen.has(hit.id))return false;
  seen.add(hit.id);return true;
 });
}
export function translatedElement(e,[dx,dy,dz]){
 if(!e||!['box','panel'].includes(e.kind))throw Error('unsupported-element');
 if(![dx,dy,dz].every(Number.isFinite))throw Error('invalid-translation');
 const q=copy(e);
 const t=p=>p.map((x,i)=>x+[dx,dy,dz][i]);
 if(q.kind==='box'){q.min=t(q.min);q.max=t(q.max);}
 else {q.a=t(q.a);q.b=t(q.b);}
 return q;
}
export function screenOnHeightPlane(camera,x,y,z){
 if(!Number.isFinite(z))return null;
 const ray=rayFromPixel(camera,x,y);
 if(Math.abs(ray.direction[2])<1e-8)return null;
 const dt=(z-ray.origin[2])/ray.direction[2];
 if(!Number.isFinite(dt)||dt<0)return null;
 return ray.origin.map((v,i)=>v+dt*ray.direction[i]);
}
export function createEditHistory(limit=64){
 if(!Number.isInteger(limit)||limit<1||limit>500)throw Error('invalid-history-limit');
 const past=[],future=[];
 const find=(world,id)=>world.elements.find(e=>e.id===id)||null;
 // Both expected and target are immutable snapshots. First validate current
 // authorship identity, then use core's only authoritative scene operations.
 const applyChange=(world,from,to)=>{
  const id=to?.id||from?.id;
  if(!id|| (from&&to&&from.id!==to.id))return {ok:false,reason:'identity-change'};
  const current=find(world,id);
  if(!same(current,from))return {ok:false,reason:'stale-part'};
  if(current?.kind==='box'&&current.motionType==='dynamic')
   return {ok:false,reason:'dynamic-part'};
  if(from&&to?.kind==='box'&&to.motionType==='dynamic')
   return {ok:false,reason:'dynamic-part'};
  if(same(from,to))return {ok:false,reason:'no-change'};
  if(!from)return insertElement(world,to);
  if(!to)return removeElement(world,id);
  return replaceElement(world,id,to);
 };
 // Solver body poses evolve continuously. History acts on stable ID,
 // not old x/y/z. A removed crate reappears at its deletion-time pose;
 // this is not simulation replay and never moves other bodies backwards.
 const bodyChange=(live,from,to)=>{
  if(!live?.scene||!Array.isArray(live.bodies))return {ok:false,reason:'missing-live-world'};
  const id=to?.id||from?.id;
  if(!id||!/^[-_a-zA-Z0-9]{1,64}$/.test(id)||from&&to)
   return {ok:false,reason:'unsupported-body-change'};
  for(const b of [from,to].filter(Boolean))
   if(b.kind!=='crate'||![b.x,b.y,b.z,b.r,b.h].every(Number.isFinite)||
      b.r<=0||b.h<=0||b.id!==id)return {ok:false,reason:'invalid-crate'};
  const current=live.bodies.find(b=>b.id===id);
  if(from){
   if(!current||current.kind!=='crate')return {ok:false,reason:'stale-crate'};
   live.bodies.splice(live.bodies.indexOf(current),1);
   if(live.grip===id)live.grip=null;
  }else{
   if(!to)return {ok:false,reason:'no-change'};
   if(current||live.scene.elements.some(e=>e.id===id))
    return {ok:false,reason:'duplicate-id'};
   live.bodies.push(copy(to));
  }
  return {ok:true,id,kind:'crate'};
 };
 return {
  apply(world,from,to){
   const initial=copy(from),final=copy(to),r=applyChange(world,initial,final);
   if(r.ok){past.push({kind:'part',from:initial,to:final});if(past.length>limit)past.shift();future.length=0;}
   return r;
  },
  // Record the body AFTER addCrate has admitted it to the same live world.
  recordBodyAdded(live,id){
   const b=live?.bodies?.find(b=>b.id===id);
   if(!b||b.kind!=='crate'||live.scene.elements.some(e=>e.id===id))
    return {ok:false,reason:'invalid-crate-creation'};
   past.push({kind:'crate',from:null,to:copy(b)});
   if(past.length>limit)past.shift();
   future.length=0;
   return {ok:true,id,kind:'crate'};
  },
  removeBody(live,id){
   const b=live?.bodies?.find(b=>b.id===id);
   if(!b||b.kind!=='crate')return {ok:false,reason:'not-crate'};
   const snapshot=copy(b),r=bodyChange(live,snapshot,null);
   if(r.ok){
    past.push({kind:'crate',from:snapshot,to:null});
    if(past.length>limit)past.shift();
    future.length=0;
   }
   return r;
  },
  undo(world){
   if(!past.length)return {ok:false,reason:'empty'};
   const c=past[past.length-1],r=c.kind==='crate'?bodyChange(world,c.to,c.from):applyChange(world.scene||world,c.to,c.from);
   if(r.ok){past.pop();future.push(c);}return {...r,kind:c.kind};
  },
  redo(world){
   if(!future.length)return {ok:false,reason:'empty'};
   const c=future[future.length-1],r=c.kind==='crate'?bodyChange(world,c.from,c.to):applyChange(world.scene||world,c.from,c.to);
   if(r.ok){future.pop();past.push(c);}return {...r,kind:c.kind};
  },
  // An external solver/lifecycle mutation must not leave stale commands
  // at the top of the undo stack, blocking other independent construction.
  // Keep commands on OTHER parts: a free-running crate cannot erase a
  // valid edit to an unrelated bridge panel.
  invalidateId(id){
   let removed=0;
   for(const stack of [past,future]){
    for(let i=stack.length-1;i>=0;i--){
     const c=stack[i];
     if(c.from?.id===id||c.to?.id===id){stack.splice(i,1);removed++;}
    }
   }
   return removed;
  },
  clear(){past.length=0;future.length=0;},
  get canUndo(){return past.length>0;},
  get canRedo(){return future.length>0;}
 };
}
