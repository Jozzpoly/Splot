// Splot Next: optional Rapier contact challenger in the SAME playable world.
// R&D only: Z-up, fixed authored structures, kinematic actors, dynamic crates.
// No camera, renderer, editor or snapshot contract is owned by this adapter.
import {clearanceAt,supportCandidates} from './spatial-core.mjs';
const norm=(x,y)=>Math.hypot(x,y);
const HALF_PI=Math.PI/2;
function panelQuat(e){
 const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],dz=e.b[2]-e.a[2];
 const yaw=Math.atan2(dy,dx),pitch=-Math.atan2(dz,Math.hypot(dx,dy));
 const a=Math.sin(yaw/2),b=Math.cos(yaw/2),c=Math.sin(pitch/2),d=Math.cos(pitch/2);
 return {x:-a*c,y:b*c,z:a*d,w:b*d};
}
function staticPart(R,engine,e){
 let p,half,rot;
 if(e.kind==='box'){
  p=e.min.map((x,i)=>(x+e.max[i])/2);
  half=e.min.map((x,i)=>(e.max[i]-x)/2);
 }else{
  p=e.a.map((x,i)=>(x+e.b[i])/2);p[2]-=e.thickness/2;
  half=[Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1],e.b[2]-e.a[2])/2,e.width/2,e.thickness/2];
  rot=panelQuat(e);
 }
 const d=R.RigidBodyDesc.fixed().setTranslation(...p);if(rot)d.setRotation(rot);
 const body=engine.createRigidBody(d);
 engine.createCollider(R.ColliderDesc.cuboid(...half).setFriction(.85),body);
 return body;
}
function supporting(scene,b){
 const s=supportCandidates(scene,b.x,b.y,{maxZ:31});
 return s.find(h=>Math.abs(h.z-b.z)<.095)?.id??null;
}
export function createRapierBridge(world,R){
 if(!R?.World||!R?.RigidBodyDesc||!R?.ColliderDesc)throw Error('rapier not initialized');
 const engine=new R.World({x:0,y:0,z:-9.81});engine.timestep=1/60;
 const ground=engine.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(world.scene.width/2,world.scene.height/2,-.35));
 engine.createCollider(R.ColliderDesc.cuboid(world.scene.width/2,world.scene.height/2,.35).setFriction(.85),ground);
 const statics=new Map(),refs=new Map();
 let activeGrip=null;
 let revision=-1,warning='';
 const makeBody=b=>{
  const kinematic=b.kind!=='crate';
  const d=kinematic?R.RigidBodyDesc.kinematicPositionBased():R.RigidBodyDesc.dynamic();
  d.setTranslation(b.x,b.y,b.z+b.h/2);
  if(!kinematic){d.setLinearDamping(.65);d.setAngularDamping(1.8);}
  const rb=engine.createRigidBody(d);
  if(kinematic){
   const capsuleHalf=Math.max(.05,(b.h-2*b.r)/2);
   const c=engine.createCollider(R.ColliderDesc.capsule(capsuleHalf,b.r)
    .setRotation({x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2}).setFriction(.7),rb);
   const kcc=engine.createCharacterController(.02);
   kcc.setMaxSlopeClimbAngle(Math.PI/3);kcc.enableAutostep(.25,.08,true);kcc.enableSnapToGround(.24);
   if(kcc.setApplyImpulsesToDynamicBodies)kcc.setApplyImpulsesToDynamicBodies(true);
   return {rb,c,kcc,b,fallVelocity:-.06};
  }
  const c=engine.createCollider(R.ColliderDesc.cuboid(b.r,b.r,b.h/2)
   .setDensity(Math.max(.1,b.mass/(4*b.r*b.r*b.h))).setFriction(.78).setRestitution(.03),rb);
  // Visual crates are still axis-aligned; this is an explicit temporary limit.
  if(rb.lockRotations)rb.lockRotations(true,true);
  return {rb,c,b};
 };
 function syncBodies(){
  const ids=new Set(world.bodies.map(b=>b.id));
  for(const [id,ref] of refs)if(!ids.has(id)){engine.removeRigidBody(ref.rb);refs.delete(id);}
  for(const b of world.bodies)if(!refs.has(b.id))refs.set(b.id,makeBody(b));
 }
 function syncStatics(){
  if(revision===world.scene.revision)return;
  const want=new Map(world.scene.elements.map(e=>[e.id,e]));
  for(const [id,entry] of statics){
   if(!want.has(id)||JSON.stringify(want.get(id))!==entry.hash){
    engine.removeRigidBody(entry.body);statics.delete(id);
   }
  }
  for(const [id,e] of want)if(!statics.has(id))statics.set(id,{body:staticPart(R,engine,e),hash:JSON.stringify(e)});
  revision=world.scene.revision;
  // Authoring remains permissive. If a part encloses an actor, attempt
  // local displacement instead of silently preserving invalid occupancy.
  for(const actor of world.bodies.filter(b=>b.kind!=='crate')){
   const query=clearanceAt(world.scene,{x:actor.x,y:actor.y,z:actor.z,r:actor.r,h:actor.h,supportId:actor.support});
   if(query.free)continue;
   let found=null;
   outer:for(let r=.35;r<=3.6;r+=.25)for(let i=0;i<24;i++){
    const th=i*Math.PI/12,x=actor.x+r*Math.cos(th),y=actor.y+r*Math.sin(th);
    const surface=supportCandidates(world.scene,x,y,{maxZ:31}).filter(s=>s.z<=actor.z+.15&&s.z>=actor.z-.3).sort((a,b)=>Math.abs(a.z-actor.z)-Math.abs(b.z-actor.z))[0];
    const z=surface?.z??actor.z;
    if(clearanceAt(world.scene,{x,y,z,r:actor.r,h:actor.h,supportId:surface?.id}).free){
     found={x,y,z,support:surface?.id??null};break outer;
    }
   }
   if(found){
    Object.assign(actor,found);
    const ref=refs.get(actor.id);
    if(ref)ref.rb.setTranslation({x:actor.x,y:actor.y,z:actor.z+actor.h/2},true);
    world.events.push({type:'authoring-contact-resolved',id:actor.id,reason:query.contacts.join(','),time:world.time});
   }else{
    warning='Unresolved overlap '+actor.id+' '+query.contacts.join(',');
    world.events.push({type:'authoring-contact-unresolved',id:actor.id,reason:query.contacts.join(','),time:world.time});
   }
  }
 }
 syncStatics();syncBodies();
 function moveActor(ref,dx,dy,dt,speed){
  const len=norm(dx,dy),power=Math.min(1,len),scale=len?power/len:0;
  const stepZ=ref.b.support===null?Math.max(-.4,-.055+ref.fallVelocity*dt):-.055;
  ref.kcc.computeColliderMovement(ref.c,{x:dx*scale*speed*dt,y:dy*scale*speed*dt,z:stepZ});
  const d=ref.kcc.computedMovement(),p=ref.rb.translation();
  ref.rb.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z});
  // Support is resolved after physics step; do not infer free-fall from slope contact alone.
  if(len>1e-3)ref.b.yaw=Math.atan2(dy,dx);
 }
 function advance(dt,input=[0,0]){
  if(world.paused)return;
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('invalid-dt');
  syncStatics();syncBodies();engine.timestep=dt;
  const human=refs.get('human');if(human)moveActor(human,input[0],input[1],dt,4.1);
  const boar=refs.get('boar');
  if(boar){const b=boar.b,dx=world.food.x-b.x,dy=world.food.y-b.y,len=norm(dx,dy);
   moveActor(boar,len>.8?dx/len:0,len>.8?dy/len:0,dt,2.6);}
  // Grip is a physical one-sided rope, not velocity teleportation.
  // Its anchor follows the kinematic human and pulls a dynamic crate.
  if(world.grip){
   const c=refs.get(world.grip),h=refs.get('human');
   if(!c||!h||Math.abs(c.b.z-h.b.z)>1.4){
    world.events.push({type:'release',id:world.grip,reason:'separation',time:world.time});
    world.grip=null;
   }
  }
  if(activeGrip?.id!==world.grip){
   if(activeGrip){engine.removeImpulseJoint(activeGrip.joint,true);activeGrip=null;}
   if(world.grip){
    const human=refs.get('human'),crate=refs.get(world.grip);
    const data=R.JointData.rope(1.3,{x:0,y:0,z:-.12},{x:0,y:0,z:.18});
    activeGrip={id:world.grip,joint:engine.createImpulseJoint(data,human.rb,crate.rb,true)};
   }
  }
  engine.step();world.time+=dt;
  for(const [id,ref] of refs){
   const b=ref.b,p=ref.rb.translation(),prior=b.support;
   b.x=p.x;b.y=p.y;b.z=p.z-b.h/2;
   if(Math.abs(b.z)<.035)b.z=0;
   b.support=supporting(world.scene,b);
   if(ref.kcc)ref.fallVelocity=b.support?0:Math.max(-20,ref.fallVelocity-9.81*dt);
   if(b.support&&!prior&&id!=='boar')world.events.push({type:'land',id,on:b.support,time:world.time});
  }
  if(world.events.length>80)world.events.splice(0,world.events.length-80);
 }
 return {advance,syncStatics,syncBodies,engine,get warning(){return warning},get status(){return {parts:statics.size,bodies:refs.size,events:world.events.slice(-4)}}};
}