// RESEARCH CHALLENGER. Frozen Box3D Character Controller Donor v1 mathematics,
// not a claim that Splot has adopted the Donor's accepted gameplay feel.
// Physical world: Box3D Y-up; Splot: Z-up. Change of orthonormal basis:
// Splot (x,y,z) -> Box3D (x,z,-y), preserving handedness.
// No renderer or editor ownership. DO NOT promote before a real browser run.
import {createConstraintVelocityCharacter} from './box3d-donor/constraint-velocity-character.js';
import {supportCandidates,clearanceAt,castRay} from './spatial-core.mjs';
import {splotToBox3D,box3DToSplot,panelQuaternionInBox3D} from './box3d-basis.mjs';
import {compliantActorImpulse} from './actor-contact.mjs';
import {createBoarIntent} from './boar-intent.mjs';
import {partMotionMode,boxCenter,translateBoxToCenter,boxVolume} from './part-lifecycle.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=(x,y)=>Math.hypot(x,y);
// Opt-in research only: eye rays against authored solids, not a universal
// NPC sensor (loose solver-owned crates are not in this test).
// Perception-only segment cast versus solver-mirrored dynamic crate volumes.
// Real Box3D still owns their movement and actual contact.
function crateOnSightRay(origin,unit,length,crate){
 if(crate.kind!=='crate')return false;
 const lo=[crate.x-crate.r,crate.y-crate.r,crate.z],
   hi=[crate.x+crate.r,crate.y+crate.r,crate.z+crate.h];
 let enter=0,exit=length-.06;
 for(let i=0;i<3;i++){
  if(Math.abs(unit[i])<1e-9){
   if(origin[i]<lo[i]||origin[i]>hi[i])return false;
   continue;
  }
  const p=(lo[i]-origin[i])/unit[i],q=(hi[i]-origin[i])/unit[i];
  enter=Math.max(enter,Math.min(p,q));exit=Math.min(exit,Math.max(p,q));
  if(enter>exit)return false;
 }
 return exit>.015&&enter<exit;
}
function boarSeesPlayer(scene,boar,player,crates=[]){
 if(!boar||!player||Math.hypot(player.x-boar.x,player.y-boar.y)>3.5||
    boar.z>=player.z+player.h||player.z>=boar.z+boar.h)return false;
 const eye=[boar.x,boar.y,boar.z+boar.h*.72];
 for(const f of [.35,.76]){
  const dest=[player.x,player.y,player.z+player.h*f],
    dir=dest.map((v,i)=>v-eye[i]),len=Math.hypot(...dir);
  if(len<.08)return true;
  const staticBlocked=castRay(scene,eye,dir,{ground:false,maxDistance:len-.06}).length>0;
  const unit=dir.map(v=>v/len);
  const dynamicBlocked=crates.some(crate=>crateOnSightRay(eye,unit,len,crate));
  if(!staticBlocked&&!dynamicBlocked)return true;
 }
 return false;
}
function bodyKey(x){return x.id;}
export function createBox3DBridge(w,b3,{gripLaw='baseline',actorContact='ghost',boarMode='forage',substeps=4}={}){
 if(!['baseline','intent-force'].includes(gripLaw))throw Error('unknown Box3D grip law');
 if(!['ghost','compliant'].includes(actorContact))throw Error('unknown actor contact law');
 if(![4,8,12,16].includes(substeps))throw Error('unsupported research solver substeps');
 let contactMode=actorContact,contactNear=false,contactStarts=0,lastContactImpulse=0;
 const boarMind=createBoarIntent({mode:boarMode});
 let sawPlayer=false,nextSightCheck=-Infinity,sightSceneRevision=-1;
 if(!b3?.b3CreateWorld||!b3?.b3World_CollideMover||!b3?.b3SolvePlanes||!b3?.b3World_CastMover)
  throw Error('Box3D 0.1.1 mover API unavailable');
 const wd=b3.b3DefaultWorldDef();
 wd.gravity=[0,-16,0];
 const engine=b3.b3CreateWorld(wd);
 const statics=new Map(),dynamicParts=new Map(),refs=new Map();
 const state={revision:-1,warning:'',disposed:false};
 const shapeDef=(density=0)=>{const d=b3.b3DefaultShapeDef();d.density=density;d.baseMaterial.friction=.78;d.baseMaterial.restitution=.02;return d;};
 const makeFixed=(centerS,halfS,q=null)=>{
  const bd=b3.b3DefaultBodyDef();bd.position=splotToBox3D(centerS);
  if(q)bd.rotation=q;
  const rb=b3.b3CreateBody(engine,bd);
  // halfS is in Box3D-local axes already when q exists.
  b3.b3CreateBoxShape(rb,shapeDef(),halfS[0],halfS[1],halfS[2]);
  return rb;
 };
 function makePart(e){
  if(e.kind==='box'){
   const p=e.min.map((v,i)=>(v+e.max[i])/2),half=e.min.map((v,i)=>(e.max[i]-v)/2);
   return makeFixed(p,[half[0],half[2],half[1]]);
  }
  const p=e.a.map((v,i)=>(v+e.b[i])/2);p[2]-=e.thickness/2;
  return makeFixed(p,[
   Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1],e.b[2]-e.a[2])/2,
   e.thickness/2,e.width/2],panelQuaternionInBox3D(e));
 }
 const ground=makeFixed([w.scene.width/2,w.scene.height/2,-.35],
  [w.scene.width/2,.35,w.scene.height/2]);
 function makeDynamicBox(e){
  const center=boxCenter(e),half=e.min.map((v,i)=>(e.max[i]-v)/2);
  const bd=b3.b3DefaultBodyDef();
  bd.type=b3.b3BodyType.b3_dynamicBody;
  bd.position=splotToBox3D(center);
  // AABB scene truth cannot express arbitrary angular rotation. Lock it
  // explicitly; this is a translation-only rigid body experiment, NOT
  // beam/structure collapse, torque, or a complete construction solver.
  bd.motionLocks.angularX=true;bd.motionLocks.angularY=true;bd.motionLocks.angularZ=true;
  bd.linearDamping=.35;bd.angularDamping=1.5;
  const rb=b3.b3CreateBody(engine,bd);
  const halfBox=[half[0],half[2],half[1]];
  const density=e.material==='wood'?35:80;
  b3.b3CreateBoxShape(rb,shapeDef(density),...halfBox);
  return {rb,element:e,volume:boxVolume(e)};
 }
 function syncStatics(){
  if(w.scene.revision===state.revision)return;
  const current=new Map(w.scene.elements.map(e=>[e.id,e]));
  for(const [id,entry]of statics){
   const e=current.get(id);
   if(!e||partMotionMode(e)==='dynamic'||JSON.stringify(e)!==entry.hash){
    b3.b3DestroyBody(entry.rb);statics.delete(id);
   }
  }
  for(const [id,entry]of dynamicParts){
   const e=current.get(id);
   // Object identity is stable across physics translations, but changes
   // on authored replaceElement. Never recreate every tick.
   if(!e||partMotionMode(e)!=='dynamic'||entry.element!==e){
    b3.b3DestroyBody(entry.rb);dynamicParts.delete(id);
    if(e&&partMotionMode(e)==='anchored')
     w.events.push({type:'part-anchored',id,time:w.time});
   }
  }
  for(const [id,e]of current){
   if(partMotionMode(e)==='dynamic'){
    if(!dynamicParts.has(id)){
     dynamicParts.set(id,makeDynamicBox(e));
     w.events.push({type:'part-dynamic',id,time:w.time});
    }
   }else if(!statics.has(id)){
    statics.set(id,{rb:makePart(e),hash:JSON.stringify(e)});
   }
  }
  state.revision=w.scene.revision;
  // Editing remains permissive; unresolved deep overlaps are a visible debt.
  // Never disguise a teleport/reject as a solver feature.
  for(const a of w.bodies.filter(b=>b.kind!=='crate')){
   const q=clearanceAt(w.scene,{x:a.x,y:a.y,z:a.z,r:a.r,h:a.h,supportId:a.support});
   if(!q.free){
    state.warning='Nieuzgodniony kontakt po edycji: '+a.id;
    w.events.push({type:'authoring-contact-unresolved',id:a.id,time:w.time,reason:q.contacts.join(',')});
   }
  }
 }
 function createActor(b){
  const radius=b.kind==='boar'?Math.min(.28,b.h/2-.015):b.r;
  const halfSegment=Math.max(.015,b.h/2-radius);
  const controller=createConstraintVelocityCharacter(b3,engine,{
   startPosition:splotToBox3D([b.x,b.y,b.z+b.h/2]),radius,halfSegment,
   virtualMass:b.mass,maxSpeed:b.kind==='boar'?2.6:4.1,
   gravity:16,fallGravityMultiplier:1,groundAcceleration:31,
   groundDeceleration:36,airAcceleration:7.5,airDeceleration:1.2
  });
  return {kind:'actor',b,controller};
 }
 function createCrate(b){
  const def=b3.b3DefaultBodyDef();
  def.type=b3.b3BodyType.b3_dynamicBody;
  def.position=splotToBox3D([b.x,b.y,b.z+b.h/2]);
  def.linearDamping=.65;def.angularDamping=1.8;
  // In this parity build the renderer still draws AABB crates.
  def.motionLocks.angularX=true;def.motionLocks.angularY=true;def.motionLocks.angularZ=true;
  const rb=b3.b3CreateBody(engine,def),r=b.r;
  b3.b3CreateBoxShape(rb,shapeDef(Math.max(.1,b.mass/(4*r*r*b.h))),r,b.h/2,r);
  return {kind:'crate',b,rb};
 }
 function syncBodies(){
  const wanted=new Set(w.bodies.map(b=>b.id));
  for(const [id,entry]of refs)if(!wanted.has(id)){
   if(entry.rb)b3.b3DestroyBody(entry.rb);
   refs.delete(id);
  }
  for(const b of w.bodies)if(!refs.has(bodyKey(b)))
   refs.set(bodyKey(b),b.kind==='crate'?createCrate(b):createActor(b));
 }
 const position=[0,0,0],velocity=[0,0,0];
 function worldSupport(a){
  return supportCandidates(w.scene,a.x,a.y,{maxZ:31})
   .find(s=>Math.abs(s.z-a.z)<.12)?.id??null;
 }
 syncStatics();syncBodies();
 function intentFor(vx,vy){
  const amount=norm(vx,vy),power=Math.min(1,amount),factor=amount?power/amount:0;
  return {moveForward:vx*factor,moveRight:vy*factor,
   forward:[1,0,0],right:[0,0,-1],jump:false,jumpHeld:false,sprint:false};
 }
 function advance(dt,input=[0,0]){
  if(w.paused)return;
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('invalid-dt');
  syncStatics();syncBodies();
  const human=refs.get('human'),boar=refs.get('boar');
  let humanInput=input;
  if(gripLaw==='intent-force'&&w.grip&&human){
   const crate=refs.get(w.grip);
   if(crate?.kind==='crate'){
    const dx=human.b.x-crate.b.x,dy=human.b.y-crate.b.y,d=norm(dx,dy);
    const outward=d>.001?(dx*input[0]+dy*input[1])/d:0;
    if(outward>0&&d>1.35){
     // Finite kinematic agency: the player cannot outrun a held body
     // indefinitely. The physical crate still has to follow by impulse.
     const fraction=clamp((2.08-d)/.73,0,1);
     humanInput=[input[0]*fraction,input[1]*fraction];
    }
   }
  }
  human?.controller.preStep(dt,intentFor(humanInput[0],humanInput[1]));
  if(norm(...input)>.001&&human)human.b.yaw=Math.atan2(input[1],input[0]);
  if(boar){
   if(boarMind.mode.startsWith('responsive-los')&&
     (w.time>=nextSightCheck||sightSceneRevision!==w.scene.revision)){
      sawPlayer=boarSeesPlayer(w.scene,boar.b,human?.b,
        boarMind.mode==='responsive-los-crates'?w.bodies.filter(b=>b.kind==='crate'):[]);
      sightSceneRevision=w.scene.revision;nextSightCheck=w.time+.1;
   }
   const decision=boarMind.choose({boar:boar.b,player:human?.b,food:w.food,
     time:w.time,playerVisible:boarMind.mode.startsWith('responsive-los')&&sawPlayer});
   boar.controller.preStep(dt,intentFor(decision.dir[0],decision.dir[1]));
   w.boarIntent={phase:decision.phase,goal:decision.goal,
    foodDistance:decision.foodDistance,playerDistance:decision.playerDistance,
    playerVisible:decision.playerVisible,lastSeen:decision.lastSeen,
    mode:boarMind.mode};
   if(decision.changed)w.events.push({type:'boar-intent',id:'boar',phase:decision.phase,
    reason:decision.goal,time:w.time});
  }
  // Optional bilateral compliance, using current controller velocities.
  // This is a physical-intent approximation, not true Box3D rigid-body
  // collision; the Donor remains authoritative on static/dynamic world casts.
  if(human&&boar&&contactMode==='compliant'){
   const v=a=>[a.controller.velocity[0],-a.controller.velocity[2]];
   const hit=compliantActorImpulse(human.b,boar.b,v(human),v(boar),dt);
   lastContactImpulse=hit.impulse;
   if(hit.active){
    human.controller.velocity[0]+=hit.ax;
    human.controller.velocity[2]-=hit.ay;
    boar.controller.velocity[0]+=hit.bx;
    boar.controller.velocity[2]-=hit.by;
   }
   // Hysteresis prevents log spam when the two actors touch.
   const near=hit.gap!==null&&hit.gap<.03;
   if(near&&!contactNear){
    contactStarts++;
    w.events.push({type:'actor-soft-contact-start',id:'human',with:'boar',gap:hit.gap,impulse:hit.impulse,time:w.time});
   }else if(contactNear&&(hit.gap===null||hit.gap>.16)){
    w.events.push({type:'actor-soft-contact-end',id:'human',with:'boar',gap:hit.gap,time:w.time});
   }
   if(near)contactNear=true;
   else if(hit.gap===null||hit.gap>.16)contactNear=false;
  }else{lastContactImpulse=0;contactNear=false;}
  // Limited first contact/parity grip. This is NOT imported E17 or E19.
  if(w.grip&&human){
   const ref=refs.get(w.grip);
   if(!ref||ref.kind!=='crate'||Math.abs(ref.b.z-human.b.z)>.7||
    norm(ref.b.x-human.b.x,ref.b.y-human.b.y)>2.25){
    w.events.push({type:'release',id:w.grip,reason:'separation',time:w.time});w.grip=null;
   }else{
    const dx=human.b.x-ref.b.x,dy=human.b.y-ref.b.y,d=norm(dx,dy);
    if(d>1.0){
     b3.b3Body_GetLinearVelocity(velocity,ref.rb);
     const k=clamp((d-1)*24,0,45)*dt*ref.b.mass;
     const drag=clamp(4.5*dt,0,1)*ref.b.mass;
     let impulseS=[dx/d*k-velocity[0]*drag,
      dy/d*k+velocity[2]*drag,0];
     if(gripLaw==='intent-force'){
      // Alternative E17-inspired input grammar: desired anchor velocity,
      // bounded physical execution and reciprocal player reaction. Still
      // centre-point and translation-only; deliberately NOT the E17 executor.
      const playerV=human.controller.velocity;
      const dirX=dx/d,dirY=dy/d;
      const desiredRel=clamp((d-1.0)*10,0,8);
      const desiredVX=playerV[0]+dirX*desiredRel;
      const desiredVY=-playerV[2]+dirY*desiredRel;
      const jx=(desiredVX-velocity[0])*ref.b.mass;
      const jy=(desiredVY+velocity[2])*ref.b.mass;
      const magnitude=Math.hypot(jx,jy),maxJ=750*dt;
      const scale=magnitude>maxJ?maxJ/magnitude:1;
      impulseS=[jx*scale,jy*scale,0];
     }
     b3.b3Body_GetPosition(position,ref.rb);
     b3.b3Body_ApplyLinearImpulse(ref.rb,splotToBox3D(impulseS),[...position],true);
     // Deliberately limited reciprocal reaction on Donor velocity.
     human.controller.velocity[0]-=impulseS[0]/human.controller.virtualMass;
     human.controller.velocity[2]+=impulseS[1]/human.controller.virtualMass;
    }
   }
  }
  b3.b3World_Step(engine,dt,substeps);
  // Canonical live geometry follows the actual solver body. Picking,
  // rasterized faces and surface queries then see the same updated shape.
  for(const [id,entry]of dynamicParts){
   b3.b3Body_GetPosition(position,entry.rb);
   const center=box3DToSplot(position);
   if(translateBoxToCenter(entry.element,center)){
    // Not a new authoring revision; physical-state version is separate.
    w.scene.motionRevision=(w.scene.motionRevision||0)+1;
   }
  }
  human?.controller.postStep(dt);boar?.controller.postStep(dt);
  w.time+=dt;
  for(const [id,ref]of refs){
   const a=ref.b,old=a.support;
   if(ref.kind==='crate'){
    b3.b3Body_GetPosition(position,ref.rb);
    const p=box3DToSplot(position);a.x=p[0];a.y=p[1];a.z=p[2]-a.h/2;
   }else{
    const p=box3DToSplot(ref.controller.position);
    a.x=p[0];a.y=p[1];a.z=p[2]-a.h/2;
   }
   if(Math.abs(a.z)<.035)a.z=0;
   a.support=worldSupport(a);
   if(a.support&&!old&&id!=='boar')
    w.events.push({type:'land',id,on:a.support,time:w.time});
  }
  if(w.events.length>80)w.events.splice(0,w.events.length-80);
 }
 function dispose(){
  if(!state.disposed){b3.b3DestroyWorld(engine);state.disposed=true;}
 }
 return {engine,advance,dispose,syncStatics,syncBodies,
  get solverSubsteps(){return substeps},
  // Explicit research probes, never called from normal game logic.
  // True solver state: a mirrored Splot position/support is NOT proof
  // that the WASM body is awake or has processed a newly authored contact.
  researchCrateState(id){
   const ref=refs.get(id);
   if(ref?.kind!=='crate')return null;
   if(typeof b3.b3Body_IsAwake!=='function')throw Error('Box3D WASM b3Body_IsAwake unavailable');
   b3.b3Body_GetPosition(position,ref.rb);
   b3.b3Body_GetLinearVelocity(velocity,ref.rb);
   return {id,awake:b3.b3Body_IsAwake(ref.rb),
    xyz:box3DToSplot(position),velocity:box3DToSplot(velocity)};
  },
  researchWakeCrate(id){
   const ref=refs.get(id);
   if(ref?.kind!=='crate')throw Error('research wake requires a live crate');
   if(typeof b3.b3Body_SetAwake!=='function')throw Error('Box3D WASM b3Body_SetAwake unavailable');
   b3.b3Body_SetAwake(ref.rb,true);
   return this.researchCrateState(id);
  },

  setActorContactMode(mode){
   if(!['ghost','compliant'].includes(mode))throw Error('unknown actor contact law');
   contactMode=mode;contactNear=false;lastContactImpulse=0;
   w.events.push({type:'actor-contact-mode',mode,time:w.time});
  },
  get actorContactMode(){return contactMode},
  setBoarMode(next){
   boarMind.setMode(next);
   nextSightCheck=-Infinity;sightSceneRevision=-1;sawPlayer=false;
   w.events.push({type:'boar-mode',id:'boar',mode:next,time:w.time});
  },
  get boarMode(){return boarMind.mode},
  get warning(){return state.warning},
  get status(){return {parts:statics.size,bodies:refs.size,dynamicParts:dynamicParts.size,gripLaw,
   actorContact:contactMode,contactStarts,lastContactImpulse,boarMode:boarMind.mode,boarPhase:boarMind.phase,
   donor:'A-triple-prime derived; research only',events:w.events.slice(-4)}}};
}
