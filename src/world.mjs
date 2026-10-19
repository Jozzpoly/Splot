import {makeSlopedPlank,plankHeight,plankAxisHeight,plankTriangles as buildPlankTriangles,plankCylinderContact,plankCircleContact,plankRayHits} from './spatial_construction.mjs';
// SPLOT FORGE: independent falsifiable substrate. All units are world metres,
// XY is ground, Z is gravity-up. Never imports/modifies the A2 runtime.
export const SIZE={w:84,h:54};
export const DECK={id:'bridge',minX:37,maxX:47,minY:24,maxY:30,minZ:2.28,maxZ:2.60};
export const RAMP={id:'ramp',minX:34,maxX:37,minY:26.15,maxY:27.85};
export const RAMP_THICKNESS=.24;
// Preserve the exact K2 shape/location, but derive its surface and collision
// triangles from the general, rotated sloped-plank primitive.
const MAIN_RAMP=makeSlopedPlank({id:'ramp',ax:RAMP.minX,ay:(RAMP.minY+RAMP.maxY)/2,
 bx:RAMP.maxX,by:(RAMP.minY+RAMP.maxY)/2,width:RAMP.maxY-RAMP.minY,
 z0:0,z1:DECK.maxZ,thickness:RAMP_THICKNESS});
export const rampHeight=x=>plankAxisHeight(MAIN_RAMP,x,(RAMP.minY+RAMP.maxY)/2);
export const rampTriangles=()=>buildPlankTriangles(MAIN_RAMP);
export const DT=1/60;
const EPS=1e-7;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const inside=(x,y,b)=>x>=b.minX-EPS&&x<=b.maxX+EPS&&y>=b.minY-EPS&&y<=b.maxY+EPS;
export function createWorld(seed=917){return {
 version:'forge-v1',seed,tick:0,time:0,deck:true,revision:0,authored:[],constructions:[],nextId:1,events:[],history:[],stats:{blocked:0,pushes:0,lands:0,routes:0,drags:0},grips:{},
 bodies:[
 {id:'player',kind:'human',x:41.1,y:27.0,z:0,r:.30,h:1.64,mass:72,heading:0,gaze:0,support:'ground',vz:0,walk:0},
 {id:'scout',kind:'human',x:41.1,y:27.0,z:2.60,r:.30,h:1.64,mass:60,heading:Math.PI,gaze:Math.PI,support:'bridge',vz:0,walk:0},
 {id:'boar',kind:'boar',x:40,y:22.5,z:0,r:.37,h:.83,mass:86,heading:1,gaze:1,support:'ground',vz:0,walk:0},
 {id:'crate',kind:'crate',x:43.0,y:27.0,z:0,r:.41,h:.82,mass:32,support:'ground',vz:0},
 {id:'deck-crate',kind:'crate',x:43.6,y:27,z:2.60,r:.41,h:.82,mass:32,support:'bridge',vz:0}],
 goal:{x:49.2,y:28.4,z:0,id:'food',eaten:false},
 nav:{path:[],targetKey:'',lastReplan:0}, imprints:{}, traces:[]};}
export const getBody=(w,id)=>w.bodies.find(b=>b.id===id);
function box(id,x0,y0,x1,y1,z0,z1){return {id,minX:x0,minY:y0,maxX:x1,maxY:y1,minZ:z0,maxZ:z1};}
export function solids(w){const a=[
  box('north-wall',47.4,22.5,48.15,27.3,0,2.2),
  box('south-wall',47.4,28.55,48.15,32,0,2.2),
  box('old-stone',36.4,22.7,37.4,23.65,0,1.45),
  box('tree-trunk',50.0,26.2,50.7,27.3,0,2.5),
  box('pillar-nw',37,23.92,37.55,24.42,0,2.6),
  box('pillar-ne',46.45,23.92,47,24.42,0,2.6),
  box('pillar-sw',37,29.58,37.55,30.08,0,2.6),
  box('pillar-se',46.45,29.58,47,30.08,0,2.6)];
 if(w.deck){a.push(box('slab-center',37,24,47,26.15,2.28,2.6),box('slab-south',37,27.85,47,30,2.28,2.6),box('slab-middle',37.5,26.15,47,27.85,2.28,2.6));}
 return a.concat(w.authored||[]);}
const authoredPlanks=w=>(w.constructions||[]).map(makeSlopedPlank);
const plankById=(w,id)=>authoredPlanks(w).find(s=>s.id===id);
export function constructionMeshes(w){return authoredPlanks(w).map(shape=>({id:shape.id,triangles:buildPlankTriangles(shape)}));}
export function pickConstructionAtProjection(w,x,groundY){
 // Canvas projection is screenY = base + .67*scale*(y-camY) - .53*scale*z.
 // The ray through a pixel therefore changes world Y as height changes.
 const k=.53/.67,high={x,y:groundY+8*k,z:8},low={x,y:groundY-.5*k,z:-.5};
 return authoredPlanks(w).flatMap(s=>plankRayHits(s,high,low).filter(hit=>hit.kind==='top'))
 .sort((a,b)=>a.t-b.t).filter((h,i,list)=>!list.slice(0,i).some(prev=>prev.id===h.id&&Math.abs(prev.t-h.t)<1e-7));
}


// A projected pixel is a WORLD RAY, not the selected actor's elevation.
// Exposes surface candidates rather than inventing a single target.
export function pickSurfacesAtProjection(w,x,groundY){
 if(!Number.isFinite(x)||!Number.isFinite(groundY))return [];
 const k=.53/.67, high={x,y:groundY+8*k,z:8}, low={x,y:groundY-.5*k,z:-.5}, hits=[];
 const point=z=>({x,y:groundY+z*k,z});
 const add=(id,z,y)=>{if(z<0||z>8||!Number.isFinite(y))return;
  if(hits.some(h=>h.id===id&&Math.abs(h.z-z)<1e-6))return;
  hits.push({id,x,y,z,kind:'surface'});};
 // The historically authored bridge is a planar top; the ramp is a real slab.
 if(w.deck){const p=point(DECK.maxZ);if(inside(x,p.y,DECK))add('bridge',p.z,p.y);
  for(const hit of plankRayHits(MAIN_RAMP,high,low).filter(h=>h.kind==='top'))add('ramp',hit.at.z,hit.at.y);}
 for(const slab of authoredPlanks(w))for(const hit of plankRayHits(slab,high,low).filter(h=>h.kind==='top'))add(slab.id,hit.at.z,hit.at.y);
 if(x>=0&&x<=SIZE.w&&groundY>=0&&groundY<=SIZE.h)add('ground',0,groundY);
 // Nearer to camera first. Distinct stacked heights must not be collapsed.
 return hits.sort((a,b)=>b.z-a.z||a.id.localeCompare(b.id));
}

function constructionSupport(s,x,y,r=0){
 if(r>0&&!plankCircleContact(s,{x,y,r}))return null;
 const height=plankHeight(s,x,y);
 if(height!==null)return height;
 // A crate's footprint retains contact at a finite edge; axis height is an
 // acknowledged kinematic approximation, not a tipping/torque calculation.
 return r>0?plankAxisHeight(s,x,y):null;
}
export function surfaces(w,x,y,r=0){const s=[{id:'ground',z:0}];if(w.deck){
  // Deck support uses the same physical rectangle as its solid slab. A body
  // for crates remains supported while some of its footprint still touches it.
  // Without rotational physics this models edge contact, NOT tipping forces.
  if(r>0?circleRect({x,y,r},DECK):inside(x,y,DECK))s.push({id:'bridge',z:2.6});
  const rampZ=plankHeight(MAIN_RAMP,x,y);
  if(rampZ!==null)s.push({id:'ramp',z:rampZ});
 }for(const plank of authoredPlanks(w)){const z=constructionSupport(plank,x,y,r);if(z!==null)s.push({id:plank.id,z});}
 return s;}
function circleRect(b,s){const xx=clamp(b.x,s.minX,s.maxX),yy=clamp(b.y,s.minY,s.maxY);return (b.x-xx)**2+(b.y-yy)**2<(b.r-EPS)**2;}
function touchesRampSlab(b){
 return plankCylinderContact(MAIN_RAMP,b,'ramp');
}
function touchesAuthoredPlank(s,b){
 if(!plankCylinderContact(s,b,s.id))return false;
 // A body already approaching from a supported surface may step up to the
 // thin upper face. The volume below that ledge still blocks low actors.
 const z=constructionSupport(s,b.x,b.y,b.r);
 if(z!==null&&b.support!==null&&z>=b.z-.01&&z-b.z<=.23&&b.z>=z-s.thickness-.05)return false;
 return true;
}
function zOverlap(a,b){return a.z<b.z+b.h-EPS&&a.z+a.h>b.z+EPS;}
function circles(a,b){return (a.x-b.x)**2+(a.y-b.y)**2<(a.r+b.r-EPS)**2;}
export function bodyConflicts(w,b,moves=new Map(),ignoreIds=new Set()){
 const loc=moves.get(b.id)||b;const bs={...b,...loc};const hit=[];
 if(bs.x-bs.r<0||bs.y-bs.r<0||bs.x+bs.r>SIZE.w||bs.y+bs.r>SIZE.h)hit.push('bounds');
 for(const s of solids(w)){if(circleRect(bs,s)&&bs.z<s.maxZ-EPS&&bs.z+bs.h>s.minZ+EPS)hit.push(s.id);}
 if(w.deck&&touchesRampSlab(bs))hit.push('ramp-slab');
 for(const plank of authoredPlanks(w))if(touchesAuthoredPlank(plank,bs))hit.push(plank.id);
 for(const q of w.bodies){if(q.id===b.id||ignoreIds.has(q.id))continue;const qp={...q,...(moves.get(q.id)||{})};if(circles(bs,qp)&&zOverlap(bs,qp))hit.push(q.id);}
 return hit;
}
function requestedSupport(w,b,x,y){
 const opts=surfaces(w,x,y,b.kind==='crate'?b.r:0).filter(o=>Math.abs(o.z-b.z)<.24+EPS);
 const same=opts.find(o=>o.id===b.support);
 const entry=opts.find(o=>(o.id==='ramp'||o.id.startsWith('made-ramp-'))&&o.z<.22&&b.support==='ground');
 return entry||same||opts.sort((a,c)=>Math.abs(a.z-b.z)-Math.abs(c.z-b.z))[0]||null;
}
// Shared material memory: accepted ground contacts only. The small grid is a
// semantic gameplay field, not a texture-driven illusion of extra forces.
const imprintKey=(x,y)=>Math.floor(x*2.5)+','+Math.floor(y*2.5);
export function imprintAt(w,x,y){return w.imprints[imprintKey(x,y)]||0;}
export function materialFactor(w,x,y){const t=terrain(x,y,w.seed),fresh=t==='grass'?.87:t==='soil'?.96:1;
 return Math.min(1,fresh+(1-fresh)*imprintAt(w,x,y)*.9);}
function applyImprint(w,b,dx,dy){if(b.support!=='ground'||(!dx&&!dy))return;
 const d=Math.hypot(dx,dy),pressure=b.mass/(b.kind==='crate'?45:100),key=imprintKey(b.x,b.y),prev=w.imprints[key]||0;
 w.imprints[key]=Math.min(1,prev+Math.min(.17,d*pressure*.32));
}
function event(w,type,detail={}){const e={tick:w.tick,type,...detail};w.events.push(e);w.history.push(e);if(w.history.length>220)w.history.shift();return e;}
// An action either commits every moved body in this substep, or none.
// This is a kinematic constraint prototype, not a force/impulse solver.
export function proposeHorizontal(w,actorId,dx,dy,{strength=120}={}){
 const mover=getBody(w,actorId);if(!mover)return {ok:false,reason:'not-found'};
 if(mover.support===null&&mover.kind!=='human')return {ok:false,reason:'airborne'};
 const loc=new Map(),group=new Set([actorId]);
 // An airborne human can steer horizontally, but never re-acquire a platform
 // by a horizontal move alone. Gravity remains the only landing resolver.
 const airborne=mover.support===null;
 const support=airborne?null:requestedSupport(w,mover,mover.x+dx,mover.y+dy);
 if(!support){
  // Leaving a high walkable surface is allowed; the body enters free fall.
  // Ground-to-bridge without a ramp remains forbidden.
  if(mover.support==='ground')return {ok:false,reason:'no-support',hits:[]};
  loc.set(actorId,{x:mover.x+dx,y:mover.y+dy,z:mover.z,support:null});
 } else loc.set(actorId,{x:mover.x+dx,y:mover.y+dy,z:support.z,support:support.id});
 let totalMass=0;
 for(let iter=0;iter<w.bodies.length+1;iter++){
  let changed=false;
  for(const id of [...group]){
   const current=getBody(w,id);const p=loc.get(id);const pos={...current,...p};
   for(const vol of solids(w)){if(circleRect(pos,vol)&&pos.z<vol.maxZ-EPS&&pos.z+pos.h>vol.minZ+EPS)return {ok:false,reason:'static',hits:[vol.id]};}
   if(w.deck&&touchesRampSlab(pos))return {ok:false,reason:'static',hits:['ramp-slab']};
   for(const plank of authoredPlanks(w))if(touchesAuthoredPlank(plank,pos))return {ok:false,reason:'static',hits:[plank.id]};
   if(pos.x-pos.r<0||pos.x+pos.r>SIZE.w||pos.y-pos.r<0||pos.y+pos.r>SIZE.h)return {ok:false,reason:'bounds',hits:['bounds']};
   for(const other of w.bodies){if(group.has(other.id))continue;
    if(circles(pos,other)&&zOverlap(pos,other)){
     if(other.kind!=='crate'||other.support===null)return {ok:false,reason:'actor-contact',hits:[other.id]};
     totalMass+=other.mass;if(totalMass>strength)return {ok:false,reason:'mass',hits:[other.id]};
     const os=requestedSupport(w,other,other.x+dx,other.y+dy);
     // An elevated crate can lose its support when a real contact pushes it
     // across an edge. Grounded crates cannot tunnel through unavailable ledges.
     if(!os&&other.support==='ground')return {ok:false,reason:'crate-support',hits:[other.id]};
     group.add(other.id);loc.set(other.id,{x:other.x+dx,y:other.y+dy,z:os?.z??other.z,support:os?.id??null});changed=true;
    }
   }
  }
  if(!changed){
   // Final group collision must be checked at proposed poses, including group pairs.
   const moved=[...group].map(id=>({...getBody(w,id),...loc.get(id)}));
   for(let i=0;i<moved.length;i++)for(let j=i+1;j<moved.length;j++)if(circles(moved[i],moved[j])&&zOverlap(moved[i],moved[j]))return {ok:false,reason:'group-overlap',hits:[moved[i].id,moved[j].id]};
   return {ok:true,moves:loc,pushed:[...group].filter(id=>id!==actorId),mass:totalMass,support:support?.id??null};
  }
 }
 return {ok:false,reason:'too-many-contacts'};
}
// CONTACT EXPERIMENT K2: grip is a physical relationship, not a teleport.
// The crate stays grounded. Only accepted joint movement updates both bodies.
// No lifting, torque, articulated arms, impulses or rope simulation are claimed.
function clearGrip(w,actorId,reason='release',emit=true){
 const crateId=w.grips?.[actorId];if(!crateId)return {ok:false,reason:'not-gripping'};
 delete w.grips[actorId];if(emit)event(w,'grip-released',{actor:actorId,crate:crateId,reason});
 return {ok:true,actor:actorId,crate:crateId};
}
export function toggleGrip(w,actorId='player',targetId=null){
 const actor=getBody(w,actorId);
 if(!actor||actor.kind!=='human')return {ok:false,reason:'not-human'};
 if(w.grips?.[actorId])return clearGrip(w,actorId);
 if(actor.support===null)return {ok:false,reason:'airborne'};
 const candidates=w.bodies.filter(b=>b.kind==='crate'&&(targetId===null||b.id===targetId))
   .sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y));
 for(const b of candidates){
  const dist=Math.hypot(b.x-actor.x,b.y-actor.y);
  if(dist>1.18+EPS||dist<actor.r+b.r-EPS||Math.abs(b.z-actor.z)>.95||b.support===null||
     Object.values(w.grips||{}).includes(b.id))continue;
  if(b.mass>45)continue;
  if(!canReach(w,actorId,b.id,1.85).ok)continue;
  w.grips=w.grips||{};w.grips[actorId]=b.id;
  event(w,'grip-start',{actor:actorId,crate:b.id,distance:dist});
  return {ok:true,actor:actorId,crate:b.id,distance:dist};
 }
 return {ok:false,reason:'no-reachable-grounded-crate'};
}
function proposeDrag(w,actorId,dx,dy){
 const a=getBody(w,actorId),b=getBody(w,w.grips?.[actorId]);
 if(!a||!b||a.support===null||b.support===null||Math.abs(a.z-b.z)>.95)return {ok:false,reason:'broken-grip'};
 // Force both to follow identical displacement. If either fails, NEITHER moves.
 const sa=requestedSupport(w,a,a.x+dx,a.y+dy),sb=requestedSupport(w,b,b.x+dx,b.y+dy);
 if(!sa||(!sb&&b.support==='ground')||(sb&&Math.abs(sa.z-sb.z)>.95))return {ok:false,reason:'joint-support'};
 // Ground-drag grip has no suspended load capacity. It can pull the crate
 // over a ledge, but it releases at the accepted edge-crossing step.
 const slipsOffEdge=!sb&&b.support!=='ground';
 const moves=new Map([[a.id,{x:a.x+dx,y:a.y+dy,z:sa.z,support:sa.id}],
  [b.id,{x:b.x+dx,y:b.y+dy,z:sb?.z??b.z,support:sb?.id??null}]]);
 for(const v of [a,b]){
  const hits=bodyConflicts(w,v,moves);
  if(hits.length)return {ok:false,reason:'joint-collision',hits};
 }
 return {ok:true,moves,pushed:[],dragged:b.id,mass:b.mass,support:sa.id,releaseGripOnCommit:slipsOffEdge};
}
// Notify ordinary navigation of moved *dynamic* obstacles without running A*
// every physics substep. Persistent anchors bound invalidation frequency.
function informDynamicTopology(w,b,from){
 if(b.kind!=='crate')return;
 w.nav.motionAnchors=w.nav.motionAnchors||{};
 const anchor=w.nav.motionAnchors[b.id]||from;
 if(!w.nav.motionAnchors[b.id])w.nav.motionAnchors[b.id]={x:anchor.x,y:anchor.y};
 if(Math.hypot(b.x-anchor.x,b.y-anchor.y)>=.42){
  w.nav.motionAnchors[b.id]={x:b.x,y:b.y};touchTopology(w);
 }
}
export function commitHorizontal(w,id,dx,dy,{strength=120,emit=true}={}){
 const p=w.grips?.[id]?proposeDrag(w,id,dx,dy):proposeHorizontal(w,id,dx,dy,{strength});
 if(!p.ok){if(emit){w.stats.blocked++;event(w,'blocked',{actor:id,reason:p.reason,hits:p.hits||[],requested:[dx,dy]});}return {...p,delta:{dx:0,dy:0}};}
 for(const [bodyId,loc]of p.moves){const b=getBody(w,bodyId),from={x:b.x,y:b.y,z:b.z,support:b.support};Object.assign(b,loc);applyImprint(w,b,dx,dy);if(bodyId!==id)informDynamicTopology(w,b,from); if(from.support!==null&&b.support===null&&emit)event(w,'support-lost',{id:bodyId,from:from.support}); if(bodyId===id){b.heading=Math.atan2(dy,dx);b.walk=(b.walk||0)+Math.hypot(dx,dy);}else if(emit){event(w,'object-moved',{id:bodyId,from,to:{x:b.x,y:b.y,z:b.z},source:id});}}
 if(p.dragged){w.stats.drags=(w.stats.drags||0)+1;if(emit)event(w,'drag',{actor:id,crate:p.dragged,dx,dy});}
 if(p.releaseGripOnCommit)clearGrip(w,id,'edge-lost-support',emit);
 if(p.pushed.length){w.stats.pushes++;if(emit)event(w,'push',{actor:id,targets:p.pushed,mass:p.mass,dx,dy});}
 if(emit)event(w,'moved',{id,dx,dy,support:getBody(w,id).support});
 return {ok:true,delta:{dx,dy},pushed:p.pushed};
}
export function walk(w,id,dx,dy,{strength=120,emit=true}={}){
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.055));let moved={dx:0,dy:0},blocked=0;
 for(let i=0;i<count;i++){
  let p=commitHorizontal(w,id,dx/count,dy/count,{strength,emit});
  if(p.ok){moved.dx+=p.delta.dx;moved.dy+=p.delta.dy;}
  else{
   // An explicit, testable slide policy, not hidden position correction.
   if(Math.abs(dx)>EPS&&Math.abs(dy)>EPS){const xa=commitHorizontal(w,id,dx/count,0,{strength,emit});const ya=xa.ok?{ok:false}:commitHorizontal(w,id,0,dy/count,{strength,emit});
    if(xa.ok){moved.dx+=dx/count;if(emit)event(w,'slide',{actor:id,axis:'x'});}
    else if(ya.ok){moved.dy+=dy/count;if(emit)event(w,'slide',{actor:id,axis:'y'});}
    else blocked++;
   }else blocked++;
  }
 }
 return {delta:moved,blocked};
}
// Authoring actions are explicit privileged editor powers. They do not simulate
// carrying, lifting, constructing with tools, or physical ownership.
// Every accepted edit changes the canonical collision/query/navigation world.
function touchTopology(w){w.revision++;w.nav.path=[];w.nav.targetKey='';w.nav.lastReplan=0;}
function boxIntersects(a,b){return a.minX<b.maxX-EPS&&a.maxX>b.minX+EPS&&a.minY<b.maxY-EPS&&a.maxY>b.minY+EPS&&a.minZ<b.maxZ-EPS&&a.maxZ>b.minZ+EPS;}
function plankBounds(p){
 const vs=buildPlankTriangles(p).flat();return {id:p.id,minX:Math.min(...vs.map(q=>q.x)),maxX:Math.max(...vs.map(q=>q.x)),minY:Math.min(...vs.map(q=>q.y)),maxY:Math.max(...vs.map(q=>q.y)),minZ:Math.min(...vs.map(q=>q.z)),maxZ:Math.max(...vs.map(q=>q.z))};
}
function constructionObstacles(w){return [...solids(w),...authoredPlanks(w).map(plankBounds),...(w.deck?[{...plankBounds(MAIN_RAMP),id:'historic-ramp'}]:[])];}

// Until static authored walls have a true load-bearing body, require their
// footprint to rest on one *flat* authored slab. No invisible ramp-mounted wall.
function flatWallSupport(w,x,y,z){
 const corners=[[x-.4,y-.4],[x-.4,y+.4],[x+.4,y-.4],[x+.4,y+.4]];
 return (w.constructions||[]).some(def=>{
  if(Math.abs(def.z0-def.z1)>.00001||Math.abs(def.z0-z)>.015)return false;
  const plank=makeSlopedPlank(def);
  return corners.every(([px,py])=>{const h=plankHeight(plank,px,py);return h!==null&&Math.abs(h-z)<.015;});
 });
}
function authoredWallHasSupport(w,vol){
 if(Math.abs(vol.minZ)<.015)return true;
 const x=(vol.minX+vol.maxX)/2,y=(vol.minY+vol.maxY)/2,z=vol.minZ;
 if(w.deck&&Math.abs(z-2.6)<.015&&inside(x,y,DECK))return true;
 return flatWallSupport(w,x,y,z);
}
export function placeObject(w,kind,x,y,{level='ground'}={}){
 if(!['crate','wall'].includes(kind)||!Number.isFinite(x)||!Number.isFinite(y))return {ok:false,reason:'bad-input'};
 // A named target surface must exist at the selected WORLD coordinate.
 const requested=surfaces(w,x,y).find(s=>s.id===level);
 if(!requested)return {ok:false,reason:level==='bridge'?'no-deck':'no-surface'};
 const z=requested.z;

 if(x<1||y<1||x>SIZE.w-1||y>SIZE.h-1)return {ok:false,reason:'bounds'};
 if(w.bodies.length+w.authored.length>75)return {ok:false,reason:'edit-budget'};
 if(kind==='wall'&&level!=='ground'&&level!=='bridge'&&!flatWallSupport(w,x,y,z))return {ok:false,reason:'needs-flat-support'};
 if(kind==='crate'){
  const id='made-crate-'+w.nextId;
  const b={id,kind:'crate',x,y,z,r:.41,h:.82,mass:32,support:level,vz:0};
  const hit=bodyConflicts(w,b);if(hit.length)return {ok:false,reason:'occupied',hits:hit};
  w.bodies.push(b);w.nextId++;touchTopology(w);event(w,'authored',{id,kind,x,y,z});return {ok:true,id,kind};
 }
 const id='made-wall-'+w.nextId, v=box(id,x-.4,y-.4,x+.4,y+.4,z,z+1.5);
 const hits=solids(w).filter(s=>boxIntersects(s,v)).map(s=>s.id);
 for(const b of w.bodies)if(circleRect(b,v)&&zOverlap(b,{z:v.minZ,h:v.maxZ-v.minZ}))hits.push(b.id);
 if(hits.length)return {ok:false,reason:'occupied',hits};
 w.authored.push(v);w.nextId++;touchTopology(w);event(w,'authored',{id,kind,x,y,z});return {ok:true,id,kind};
}
// One authoring action creates two finite-volume planks: a sloped access and a
// flat elevated surface. Each obeys exactly the same support/contact/ray laws.
// No new terrain modes, bespoke physics or per-stage navigation scripts.
export function placeScaffold(w,x,y,{turns=0,height=1.8}={}){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(height)||height<.9||height>3.0||
    !Number.isInteger(turns)||turns<0||turns>3)return {ok:false,reason:'invalid-geometry'};
 if((w.constructions||[]).length>=20||w.bodies.length+w.authored.length>70)return {ok:false,reason:'edit-budget'};
 const angles=[[1,0],[0,1],[-1,0],[0,-1]],v=angles[turns],rampLength=3.6,deckLength=4.2;
 const rx=x+rampLength*v[0],ry=y+rampLength*v[1];
 const defs=[
  {id:'made-ramp-'+w.nextId,ax:x,ay:y,bx:rx,by:ry,width:1.75,z0:0,z1:height,thickness:.23},
  {id:'made-platform-'+(w.nextId+1),ax:rx,ay:ry,bx:rx+deckLength*v[0],by:ry+deckLength*v[1],width:3.0,z0:height,z1:height,thickness:.27}
 ];
 const shapes=defs.map(makeSlopedPlank);
 // Test footprint and occupied volume before committing either part.
 const aabbs=shapes.map(plankBounds);
 if(aabbs.some(b=>b.minX<.3||b.minY<.3||b.maxX>SIZE.w-.3||b.maxY>SIZE.h-.3))return {ok:false,reason:'bounds'};
 const obstacles=constructionObstacles(w);
 // Existing static AABBs (and stage AABBs) must not be penetrated in volume.
 for(const candidate of aabbs)for(const o of obstacles)if(boxIntersects(candidate,o))return {ok:false,reason:'occupied',hits:[o.id]};
 for(const body of w.bodies)if(shapes.some(s=>plankCylinderContact(s,body,s.id)))return {ok:false,reason:'actor-contact',hits:[body.id]};
 w.constructions.push(...defs);w.nextId+=2;touchTopology(w);
 for(const d of defs)event(w,'authored-construction',{id:d.id,kind:d.id.includes('ramp')?'ramp':'platform',x:d.ax,y:d.ay,z:d.z1});
 return {ok:true,ids:defs.map(d=>d.id)};
}
export function eraseConstruction(w,id){
 const index=(w.constructions||[]).findIndex(v=>v.id===id);
 if(index<0)return {ok:false,reason:'not-authored-construction'};
 w.constructions.splice(index,1);touchTopology(w);event(w,'erased-construction',{id});
 // Static authored walls cannot remain suspended after their real support is gone.
 // This is an explicit local editor cleanup, NOT a load-bearing collapse solver.
 const lost=w.authored.filter(vol=>!authoredWallHasSupport(w,vol));
 if(lost.length){const vanished=new Set(lost.map(vol=>vol.id));w.authored=w.authored.filter(vol=>!vanished.has(vol.id));
  for(const vol of lost)event(w,'editor-part-lost',{id:vol.id,reason:'support-removed'});}

 for(const actorId of Object.keys(w.grips||{})){
  const a=getBody(w,actorId),b=getBody(w,w.grips[actorId]);
  if(a?.support===id||b?.support===id)clearGrip(w,actorId,'construction-removed');
 }
 for(const b of w.bodies)if(b.support===id){b.support=null;b.vz=0;event(w,'support-lost',{id:b.id,from:id});}
 return {ok:true,id};
}
export function eraseObject(w,id){
 if((w.constructions||[]).some(s=>s.id===id))return eraseConstruction(w,id);
 let idx=w.authored.findIndex(s=>s.id===id);
 if(idx>=0){w.authored.splice(idx,1);touchTopology(w);event(w,'erased',{id});return {ok:true,id};}
 if(Object.values(w.grips||{}).includes(id))return {ok:false,reason:'held-by-actor'};
 idx=w.bodies.findIndex(b=>b.id===id&&b.id.startsWith('made-crate-'));
 if(idx>=0){w.bodies.splice(idx,1);if(w.nav.motionAnchors)delete w.nav.motionAnchors[id];touchTopology(w);event(w,'erased',{id});return {ok:true,id};}
 return {ok:false,reason:'not-authored'};
}
export function eraseNear(w,x,y,{level='ground',radius=.75,skipConstructions=false}={}){
 const construction=(skipConstructions?[]:authoredPlanks(w)).filter(s=>plankCircleContact(s,{x,y,r:radius}))
  .sort((a,b)=>Math.hypot((a.ax+a.bx)/2-x,(a.ay+a.by)/2-y)-Math.hypot((b.ax+b.bx)/2-x,(b.ay+b.by)/2-y))[0];
 if(construction)return eraseConstruction(w,construction.id);
 const z=surfaces(w,x,y).find(s=>s.id===level)?.z??-100;
 const candidates=[...w.authored.map(s=>({id:s.id,x:(s.minX+s.maxX)/2,y:(s.minY+s.maxY)/2,z:s.minZ})),...w.bodies.filter(b=>b.id.startsWith('made-crate-'))];
 const hit=candidates.filter(a=>Math.abs(a.z-z)<.12&&Math.hypot(a.x-x,a.y-y)<=radius).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
 return hit?eraseObject(w,hit.id):{ok:false,reason:'no-edit-nearby'};
}
export function removeBridge(w){if(!w.deck)return;
 for(const actorId of Object.keys(w.grips||{})){
  const actor=getBody(w,actorId),crate=getBody(w,w.grips[actorId]);
  // A structural change only breaks constraints which actually depended on
  // the removed surface; the rest of the world retains its local relationships.
  if(!actor||!crate||['bridge','ramp'].includes(actor.support)||['bridge','ramp'].includes(crate.support))
   clearGrip(w,actorId,'structure-removed');
 }
 // Editor-authored static walls on the bridge have no independent support.
 // Remove them explicitly; do not pretend that fixed AABBs are falling rigid bodies.
 const noLongerSupported=w.authored.filter(a=>a.minZ>1);
 for(const a of noLongerSupported)event(w,'editor-part-lost',{id:a.id,reason:'bridge-destroyed'});
 w.authored=w.authored.filter(a=>a.minZ<=1);
 w.deck=false;touchTopology(w);event(w,'structure-removed',{id:'bridge'});
 for(const b of w.bodies){if(b.support==='bridge'||b.support==='ramp'){
  b.support=null;b.vz=0;event(w,'support-lost',{id:b.id,from:'bridge'});
 }}
}
function horizontalOverlap(a,b){return circles(a,b);}
// Free fall is time-integrated. A body may temporarily stand on another body:
// intentionally a falsifiable limitation, not a claim of proper character physics.
export function gravityStep(w,dt=DT){
 for(const actorId of Object.keys(w.grips||{})){const a=getBody(w,actorId),b=getBody(w,w.grips[actorId]);
  if(!a||!b||a.support===null||b.support===null||Math.abs(a.z-b.z)>.95)clearGrip(w,actorId,'support-lost');}
 for(const b of [...w.bodies].sort((a,b)=>a.z-b.z)){
  if(b.support==='bridge'&&!w.deck){b.support=null;event(w,'support-lost',{id:b.id});}
  if(b.support?.startsWith('made-')&&b.support?.includes('-')&&!['made-crate-','made-wall-'].some(prefix=>b.support.startsWith(prefix))){
   const p=plankById(w,b.support),z=p&&constructionSupport(p,b.x,b.y,b.kind==='crate'?b.r:0);
   if(z===null||z===undefined||Math.abs(b.z-z)>.045){const old=b.support;b.support=null;b.vz=0;event(w,'support-lost',{id:b.id,from:old});}
  }
  if(b.support?.startsWith('solid:')){
   const id=b.support.slice(6),v=solids(w).find(s=>s.id===id);
   if(!v||!circleRect(b,v)||Math.abs(b.z-v.maxZ)>.02){
    const old=b.support;b.support=null;b.vz=0;event(w,'support-lost',{id:b.id,from:old});
   }
  }
  if(b.support?.startsWith('body:')){
   const q=getBody(w,b.support.slice(5));if(!q||!horizontalOverlap(b,q)||Math.abs(b.z-(q.z+q.h))>.02){b.support=null;event(w,'support-lost',{id:b.id,from:'body'});}else{b.z=q.z+q.h;continue;}
  }
  if(b.support!==null)continue;
  const nextVz=Math.max(-15,b.vz-9.81*dt),target=b.z+nextVz*dt;
  let best={z:0,support:'ground'};
  const ceilingCandidates=[];
  for(const s of surfaces(w,b.x,b.y,b.kind==='crate'?b.r:0))if(s.z<=b.z+EPS&&s.z>=best.z)best={z:s.z,support:s.id};
  for(const wall of solids(w))if(circleRect(b,wall)&&wall.maxZ<=b.z+EPS&&wall.maxZ>=best.z)best={z:wall.maxZ,support:'solid:'+wall.id};
  for(const other of w.bodies){if(b.id===other.id||other.z+other.h>b.z+EPS||!horizontalOverlap(b,other))continue;
   if(other.z+other.h>=best.z)best={z:other.z+other.h,support:'body:'+other.id};}
  if(target<=best.z+EPS){b.z=best.z;b.vz=0;b.support=best.support;w.stats.lands++;event(w,'land',{id:b.id,on:best.support,z:b.z});}
  else {b.z=target;b.vz=nextVz;}
 }
}
const rayBox=(a,v,box)=>{let lo=0,hi=1;for(const [c,mi,ma]of [['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]){
 const d=v[c];if(Math.abs(d)<1e-11){if(a[c]<box[mi]||a[c]>box[ma])return null;continue;}
 let t1=(box[mi]-a[c])/d,t2=(box[ma]-a[c])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;
 }return lo;};
// Ray against exactly the SAME vertical cylinder used by body collision, not
// the cylinder's axis-aligned bounding rectangle (a former visibility lie).
function rayCylinder(start,d,b){
 const x=start.x-b.x,y=start.y-b.y;const a=d.x*d.x+d.y*d.y;
 let entry=0,exit=1;
 if(a<1e-12){if(x*x+y*y>b.r*b.r)return null;}
 else {const B=2*(x*d.x+y*d.y),C=x*x+y*y-b.r*b.r,D=B*B-4*a*C;if(D<0)return null;
  const root=Math.sqrt(D);entry=Math.max(entry,(-B-root)/(2*a));exit=Math.min(exit,(-B+root)/(2*a));}
 const z0=b.z,z1=b.z+b.h;
 if(Math.abs(d.z)<1e-12){if(start.z<z0||start.z>z1)return null;}
 else {let t0=(z0-start.z)/d.z,t1=(z1-start.z)/d.z;if(t0>t1)[t0,t1]=[t1,t0];entry=Math.max(entry,t0);exit=Math.min(exit,t1);}
 return entry<=exit&&exit>=0&&entry<=1?Math.max(0,entry):null;
}
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
function rayTriangle(start,end,tri){
 const d=subtract(end,start),e1=subtract(tri[1],tri[0]),e2=subtract(tri[2],tri[0]);
 const h=cross(d,e2),det=dot(e1,h);
 if(Math.abs(det)<1e-10)return null;
 const inv=1/det,off=subtract(start,tri[0]),u=inv*dot(off,h);
 if(u<-EPS||u>1+EPS)return null;
 const q=cross(off,e1),v=inv*dot(d,q);
 if(v<-EPS||u+v>1+EPS)return null;
 const t=inv*dot(e2,q);return t>=-EPS&&t<=1+EPS?t:null;
}
export function raycast(w,start,end,{ignore=[]}={}){const d={x:end.x-start.x,y:end.y-start.y,z:end.z-start.z};let best=null;
 for(const s of solids(w)){if(ignore.includes(s.id))continue;const t=rayBox(start,d,s);if(t!==null&&t>=0&&t<1-1e-7&&(!best||t<best.t))best={id:s.id,t,at:{x:start.x+t*d.x,y:start.y+t*d.y,z:start.z+t*d.z}};}
 if(w.deck&&!ignore.includes('ramp-slab'))for(const tri of rampTriangles()){
  const t=rayTriangle(start,end,tri);
  if(t!==null&&t>=0&&t<1-1e-7&&(!best||t<best.t))best={id:'ramp-slab',t,at:{x:start.x+t*d.x,y:start.y+t*d.y,z:start.z+t*d.z}};
 }
 for(const plank of authoredPlanks(w)){if(ignore.includes(plank.id))continue;for(const hit of plankRayHits(plank,start,end))if(hit.t>=0&&hit.t<1-1e-7&&(!best||hit.t<best.t))best={id:plank.id,t:hit.t,at:hit.at};}
 for(const b of w.bodies){if(ignore.includes(b.id))continue;const t=rayCylinder(start,d,b);if(t!==null&&t>=0&&t<1-1e-7&&(!best||t<best.t))best={id:b.id,t,at:{x:start.x+t*d.x,y:start.y+t*d.y,z:start.z+t*d.z}};}
 return best;}
export function canReach(w,actorId,targetId,reach=1.85){const a=getBody(w,actorId),b=getBody(w,targetId);if(!a||!b)return {ok:false,reason:'missing'};
 const start={x:a.x,y:a.y,z:a.z+Math.min(1.1,a.h*.65)},end={x:b.x,y:b.y,z:b.z+b.h*.55},dist=Math.hypot(start.x-end.x,start.y-end.y,start.z-end.z);
 if(dist>reach)return {ok:false,reason:'far',distance:dist};const hit=raycast(w,start,end,{ignore:[a.id,b.id]});return hit?{ok:false,reason:'occluded',by:hit.id}:{ok:true,distance:dist};}
const hash=(x,y,seed)=>{let h=Math.imul((x|0)^seed,374761393)+Math.imul(y|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;};
export function terrain(x,y,seed){const h=hash(Math.floor(x*4),Math.floor(y*4),seed)%1000;return h<140?'stony':h<610?'grass':'soil';}
function cellId(x,y){return x+','+y;}
function route(w,from,to,grid=.42){
 // The nav grid is derived from actual endpoints, not from a demo-specific area.
 // Keep a bounded search margin so small local problems stay cheap; distant
 // or elaborate detours still require a scalable, world-wide planner.
 const margin=8;
 const x0=Math.max(0,Math.floor((Math.min(from.x,to.x)-margin)/grid));
 const y0=Math.max(0,Math.floor((Math.min(from.y,to.y)-margin)/grid));
 const x1=Math.min(Math.ceil(SIZE.w/grid)-1,Math.floor((Math.max(from.x,to.x)+margin)/grid));
 const y1=Math.min(Math.ceil(SIZE.h/grid)-1,Math.floor((Math.max(from.y,to.y)+margin)/grid));
 const ox=x0*grid,oy=y0*grid,W=x1-x0+1,H=y1-y0+1;
 const inGrid=(x,y)=>x>=0&&y>=0&&x<W&&y<H; const world=(x,y)=>({x:ox+(x+.5)*grid,y:oy+(y+.5)*grid});
 const nearest=p=>({x:clamp(Math.floor((p.x-ox)/grid),0,W-1),y:clamp(Math.floor((p.y-oy)/grid),0,H-1)});
 const s=nearest(from),g=nearest(to),start=cellId(s.x,s.y);let nodes=new Map([[start,{x:s.x,y:s.y,g:0,f:0,from:null}]]),open=[start],closed=new Set();
 const heuristic=(x,y)=>Math.hypot(g.x-x,g.y-y);
 for(let step=0;step<2500&&open.length;step++){
  open.sort((a,b)=>nodes.get(a).f-nodes.get(b).f);let id=open.shift(),n=nodes.get(id);if(closed.has(id))continue;closed.add(id);
  if(n.x===g.x&&n.y===g.y){const p=[];let cur=id;while(cur){const z=nodes.get(cur);p.unshift(world(z.x,z.y));cur=z.from;}return p;}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   let xx=n.x+dx,yy=n.y+dy;if(!inGrid(xx,yy))continue;const nid=cellId(xx,yy);if(closed.has(nid))continue;
   const pt=world(xx,yy),body={...getBody(w,'boar'),x:pt.x,y:pt.y,z:0,r:.39,h:.83};
   if(bodyConflicts(w,body,new Map(),new Set(['player','scout','boar'])).filter(v=>v!=='food').length)continue;
   const ng=n.g+1+(terrain(pt.x,pt.y,w.seed)==='grass'?.08:0)*(1-imprintAt(w,pt.x,pt.y)),existing=nodes.get(nid);if(existing&&ng>=existing.g)continue;
   nodes.set(nid,{x:xx,y:yy,g:ng,f:ng+heuristic(xx,yy),from:id});open.push(nid);
  }
 }
 return [];
}
// Food is a world-space target, not a 2D trigger. This deliberately narrow
// contact rule prevents false interactions across stacked support surfaces.
// It does NOT solve how a boar perceives a target or navigates between floors.
export function boarCanReachFood(b,goal){
 return Math.hypot(goal.x-b.x,goal.y-b.y)<.65 &&
        Math.abs((goal.z??0)-b.z)<.45;
}
export function updateBoar(w,dt=DT){const b=getBody(w,'boar'),t=w.goal;if(!b||b.support===null||t.eaten)return;
 if(boarCanReachFood(b,t)){event(w,'food-reached',{by:b.id});w.goal.eaten=true;w.revision++;return;}
 const targetKey=`${t.x},${t.y},${t.z||0}`;
 // No-route is a legitimate result, not an instruction to run A* every tick.
 // Replan on a topology edit, goal change or a bounded periodic retry.
 if(!w.nav.lastReplan||w.nav.targetKey!==targetKey||w.nav.revision!==w.revision||w.tick-w.nav.lastReplan>180){
  w.nav.path=route(w,b,t);w.nav.lastReplan=w.tick;w.nav.targetKey=targetKey;w.nav.revision=w.revision;
  w.stats.routes++;event(w,'route-planned',{by:'boar',points:w.nav.path.length});
 }
 if(!w.nav.path.length)return;let wp=w.nav.path[0],d=Math.hypot(wp.x-b.x,wp.y-b.y);if(d<.19){w.nav.path.shift();return;}
 const surface=materialFactor(w,b.x,b.y),dx=(wp.x-b.x)/d*dt*1.22*surface,dy=(wp.y-b.y)/d*dt*1.22*surface;const moved=walk(w,'boar',dx,dy,{strength:0,emit:false});
 if(Math.hypot(moved.delta.dx,moved.delta.dy)<1e-5){w.nav.path=[];event(w,'route-blocked',{by:'boar'});}
 else if(w.tick%12===0)event(w,'locomotion',{id:'boar',dx:moved.delta.dx,dy:moved.delta.dy});
}
export function tickWorld(w,commands={},dt=DT){w.tick++;w.time+=dt;w.events=[];
 const id=commands.selected||'player',d=commands.move||[0,0],l=Math.hypot(d[0],d[1]);if(l>.001){const m=(commands.precision?1.6:3.6)*(w.grips?.[id]?.66:1)*materialFactor(w,getBody(w,id).x,getBody(w,id).y);walk(w,id,d[0]/l*m*dt,d[1]/l*m*dt,{strength:commands.strength??120});}
 gravityStep(w,dt);
 if(commands.ai!==false)updateBoar(w,dt);
 if(w.tick%30===0)event(w,'world-heartbeat',{time:w.time});
 return w.events;
}
export function snapshot(w){return JSON.stringify({version:w.version,seed:w.seed,tick:w.tick,time:w.time,deck:w.deck,revision:w.revision,authored:w.authored,constructions:w.constructions||[],nextId:w.nextId,bodies:w.bodies,goal:w.goal,nav:w.nav,stats:w.stats,imprints:w.imprints,grips:w.grips});}
export function restore(json){const v=typeof json==='string'?JSON.parse(json):json;
 if(v.version!=='forge-v1'||!Array.isArray(v.bodies)||v.bodies.length<5||v.bodies.length>75)throw new Error('Incompatible snapshot');
 const w=createWorld(v.seed);Object.assign(w,{...v,authored:v.authored||[],constructions:v.constructions||[],nextId:v.nextId||1,grips:v.grips||{},events:[],history:[],traces:[]});
 const ids=w.bodies.map(b=>b.id),essential=['player','scout','boar','crate','deck-crate'];
 if(new Set(ids).size!==ids.length||essential.some(id=>!ids.includes(id))||w.bodies.some(b=>!essential.includes(b.id)&&(!/^made-crate-\d+$/.test(b.id)||b.kind!=='crate')))throw new Error('Invalid body roster');
 if(!Array.isArray(w.authored)||w.authored.length>75||w.authored.some(o=>!/^made-wall-\d+$/.test(o.id)||!Number.isFinite(o.minX)||!Number.isFinite(o.minY)||!Number.isFinite(o.minZ)||!Number.isFinite(o.maxX)||!Number.isFinite(o.maxY)||!Number.isFinite(o.maxZ)||o.minX>=o.maxX||o.minY>=o.maxY||o.minZ>=o.maxZ||o.minX<0||o.minY<0||o.maxX>SIZE.w||o.maxY>SIZE.h))throw new Error('Invalid authored solids');
 // Validate elevated authoring *after* construction data has been validated.
 // A flat authored support permits a local elevated wall, never a fake ramp-mounted block.
 const shapes=w.constructions||[];if(!Array.isArray(shapes)||shapes.length>20)throw new Error('Invalid construction list');
 const names=new Set([...ids,...w.authored.map(a=>a.id)]);
 for(const def of shapes){if(!/^made-(ramp|platform)-\d+$/.test(def.id)||names.has(def.id))throw new Error('Invalid construction identity');names.add(def.id);
  const valid=['id','ax','ay','bx','by','width','z0','z1','thickness'];if(Object.keys(def).length!==valid.length||valid.some(k=>!Object.hasOwn(def,k)))throw new Error('Invalid construction fields');
  const shape=makeSlopedPlank(def),verts=buildPlankTriangles(shape).flat();
  if(verts.some(q=>q.x<.3-EPS||q.y<.3-EPS||q.x>SIZE.w-.3+EPS||q.y>SIZE.h-.3+EPS))
   throw new Error('Invalid construction bounds');
 }
 // A saved author's geometry may not silently intersect permanent collision
 // volumes, the historic ramp, or other separately authored constructions.
 const staticBoxes=constructionObstacles({...w,constructions:[]});
 const constructedBoxes=shapes.map(def=>plankBounds(makeSlopedPlank(def)));
 for(const b of constructedBoxes){if(staticBoxes.some(o=>boxIntersects(b,o)))throw new Error('Invalid construction overlap '+b.id);}
 for(let i=0;i<constructedBoxes.length;i++)for(let j=i+1;j<constructedBoxes.length;j++)
  if(boxIntersects(constructedBoxes[i],constructedBoxes[j]))throw new Error('Invalid construction overlap '+constructedBoxes[i].id);
 if(w.authored.some(o=>!authoredWallHasSupport(w,o)))throw new Error('Unsupported authored volume');
 if(w.authored.some(a=>ids.includes(a.id))||new Set(w.authored.map(x=>x.id)).size!==w.authored.length)throw new Error('Repeated authored ids');
 const numericIds=[...ids,...w.authored.map(x=>x.id),...shapes.map(x=>x.id)].filter(x=>/^made-(crate|wall|ramp|platform)-\d+$/.test(x)).map(x=>Number(x.split('-').at(-1)));
 if(!Number.isSafeInteger(w.nextId)||w.nextId<=Math.max(0,...numericIds))throw new Error('Invalid authoring sequence');
 for(const v of w.authored)if(solids({...w,authored:[]}).some(s=>boxIntersects(s,v)))throw new Error('Authored volume overlap with static solids');
 for(let i=0;i<w.authored.length;i++)for(let j=i+1;j<w.authored.length;j++)if(boxIntersects(w.authored[i],w.authored[j]))throw new Error('Authored solids overlap');
 for(const b of w.bodies){if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||!Number.isFinite(b.z)||b.z<0)throw new Error('Bad body coordinate '+b.id);}
 if(Object.values(w.imprints).some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Invalid material imprint');
 for(const b of w.bodies){
  if(b.support==='ground'&&Math.abs(b.z)>.015)throw new Error('Invalid ground support for '+b.id);
  if(b.support==='bridge'&&(!w.deck||!(b.kind==='crate'?circleRect(b,DECK):inside(b.x,b.y,DECK))||Math.abs(b.z-2.6)>.015))throw new Error('Invalid bridge support for '+b.id);
  if(b.support==='ramp'&&(!w.deck||plankHeight(MAIN_RAMP,b.x,b.y)===null||Math.abs(b.z-plankHeight(MAIN_RAMP,b.x,b.y))>.02))throw new Error('Invalid ramp support for '+b.id);
  if(typeof b.support==='string'&&/^made-(ramp|platform)-/.test(b.support)){
   const p=plankById(w,b.support),z=p&&constructionSupport(p,b.x,b.y,b.kind==='crate'?b.r:0);
   if(z===null||z===undefined||Math.abs(b.z-z)>.045)throw new Error('Invalid construction support '+b.id);
  }
  if(typeof b.support==='string'&&b.support.startsWith('body:')){
   const q=getBody(w,b.support.slice(5));if(!q||!circles(b,q)||Math.abs(b.z-q.z-q.h)>.02)throw new Error('Invalid body support for '+b.id);
  }
  if(typeof b.support==='string'&&b.support.startsWith('solid:')){
   const o=solids(w).find(x=>x.id===b.support.slice(6));if(!o||!circleRect(b,o)||Math.abs(b.z-o.maxZ)>.02)throw new Error('Invalid solid support for '+b.id);
  }
  if(b.support!==null&&!['ground','bridge','ramp'].includes(b.support)&&!/^made-(ramp|platform)-/.test(b.support)&&!b.support.startsWith('body:')&&!b.support.startsWith('solid:'))throw new Error('Unknown support for '+b.id);
 }
 if(!w.grips||typeof w.grips!=='object'||Array.isArray(w.grips))throw new Error('Invalid grips');
 const used=new Set();for(const [id,crateId]of Object.entries(w.grips)){
  const a=getBody(w,id),b=getBody(w,crateId);
  if(!a||a.kind!=='human'||!b||b.kind!=='crate'||used.has(crateId)||a.support===null||b.support===null||Math.abs(a.z-b.z)>.95||
   Math.hypot(a.x-b.x,a.y-b.y)>1.18+EPS||b.mass>45||!canReach(w,id,crateId,1.85).ok)
   throw new Error('Invalid grip: '+id);
  used.add(crateId);
 }
 for(const b of w.bodies)if(bodyConflicts(w,b).length)throw new Error('Snapshot contains overlaps: '+b.id+' '+bodyConflicts(w,b).join(','));
 return w;}
