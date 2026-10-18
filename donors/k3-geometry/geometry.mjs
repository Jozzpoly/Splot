// SPLOT K3 - independent geometry candidate, not a production physics engine.
// XY plane, Z is up. All surfaces, faces, ray hits and foot queries derive
// from the same authored shape parameters. No special case by bridge ID.
export const EPS=1e-7;
const close=(a,b,e=EPS)=>Math.abs(a-b)<=e;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const v3=(x,y,z)=>({x,y,z});
const sub=(a,b)=>v3(a.x-b.x,a.y-b.y,a.z-b.z);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>v3(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
function local(s,x,y){const dx=x-s.x,dy=y-s.y,c=Math.cos(s.angle),t=Math.sin(s.angle);return {u:dx*c+dy*t,v:-dx*t+dy*c};}
function worldXY(s,u,v){const c=Math.cos(s.angle),t=Math.sin(s.angle);return {x:s.x+u*c-v*t,y:s.y+u*t+v*c};}
const validNum=x=>typeof x==='number'&&Number.isFinite(x);
const materials={stone:{base:'#879491',side:'#4c6767',line:'#c6d1bb',label:'kamień'},timber:{base:'#b58354',side:'#69503c',line:'#e0bf84',label:'drewno'},metal:{base:'#9eaabb',side:'#465866',line:'#d4e0e0',label:'metal'}};
export const MATERIALS=materials;
export function makeConstruction({id,x,y,angle=0,length=5,width=2.6,height=2.4,rampLength=3.6,rampWidth=1.9,thickness=.3,material='stone',withPosts=true}){
 if(!/^[a-zA-Z][\w-]{0,39}$/.test(id)||![x,y,angle,length,width,height,rampLength,rampWidth,thickness].every(validNum)||
  Math.min(length,width,height,rampLength,rampWidth,thickness)<=0||thickness>=height||!materials[material])throw new Error('invalid construction');
 const platform={id:id+':deck',owner:id,type:'box',x,y,angle,length,width,bottom:height-thickness,top:height,material,walkable:true};
 const rPos=worldXY(platform,-(length+rampLength)/2,0);
 const ramp={id:id+':ramp',owner:id,type:'ramp',x:rPos.x,y:rPos.y,angle,length:rampLength,width:rampWidth,bottom:0,top:height,material,walkable:true};
 const shapes=[platform,ramp];
 if(withPosts)for(const u of [-length/2+.21,length/2-.21])for(const v of [-width/2+.21,width/2-.21]){
  const p=worldXY(platform,u,v);
  shapes.push({id:`${id}:post:${u>0?'e':'w'}${v>0?'s':'n'}`,owner:id,type:'box',x:p.x,y:p.y,angle,length:.30,width:.30,bottom:0,top:height-thickness,material,walkable:false});
 }
 return {id,parameters:{id,x,y,angle,length,width,height,rampLength,rampWidth,thickness,material,withPosts},shapes};
}
export function containsFootprint(s,x,y,r=0){const p=local(s,x,y);return Math.abs(p.u)<=s.length/2+r&&Math.abs(p.v)<=s.width/2+r;}
export function centerOnShape(s,x,y){const p=local(s,x,y);return Math.abs(p.u)<=s.length/2+EPS&&Math.abs(p.v)<=s.width/2+EPS;}
function footprintTouch(s,x,y,r){const p=local(s,x,y),u=clamp(p.u,-s.length/2,s.length/2),v=clamp(p.v,-s.width/2,s.width/2);return {contact:Math.hypot(p.u-u,p.v-v)<=r+EPS,u:p.u,v:p.v};}
export function surfaceHeight(s,x,y,r=0){if(!s.walkable||!footprintTouch(s,x,y,r).contact)return null;
 if(s.type==='box')return s.top;
 const p=local(s,x,y); // The cylinder's leading edge makes the foot clear the uphill surface.
 return s.bottom+(s.top-s.bottom)*clamp((p.u+r+s.length/2)/s.length,0,1);
}
export function surfaceCandidates(w,x,y,r=0){let a=[{id:'ground',z:0,shape:null}];for(const s of allShapes(w)){const z=surfaceHeight(s,x,y,r);if(z!==null)a.push({id:s.id,z,shape:s});}return a.sort((a,b)=>b.z-a.z);}
export function allShapes(w){return w.constructions.flatMap(c=>c.shapes);}
function vertices(s){const l=s.length/2,h=s.width/2;const rect=[[-l,-h],[l,-h],[l,h],[-l,h]];
 const bz=rect.map(([u,v])=>{const p=worldXY(s,u,v);return v3(p.x,p.y,s.bottom);});
 const tz=rect.map(([u,v])=>{const p=worldXY(s,u,v);return v3(p.x,p.y,s.type==='ramp'?(u<0?s.bottom:s.top):s.top);});return [...bz,...tz];}
const faces=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
export function trianglesOf(s){const verts=vertices(s);return faces.map(([a,b,c],i)=>({v:[verts[a],verts[b],verts[c]],shape:s,face:i,kind:i<2?'bottom':i<4?'top':'side'})).filter(t=>{
 const e=cross(sub(t.v[1],t.v[0]),sub(t.v[2],t.v[0]));return dot(e,e)>1e-13;
});}
export function allTriangles(w){return allShapes(w).flatMap(trianglesOf);}
// Moller-Trumbore intersection over the exact authored triangles, including
// wedge sides and underside. Ray and support share construction data.
function intersectTri(start,end,tri){const d=sub(end,start),[a,b,c]=tri.v,e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
 if(Math.abs(det)<1e-10)return null;const inv=1/det,s=sub(start,a),u=inv*dot(s,h);if(u< -EPS||u>1+EPS)return null;
 const q=cross(s,e1),v=inv*dot(d,q);if(v< -EPS||u+v>1+EPS)return null;
 const t=inv*dot(e2,q);if(t< -EPS||t>1+EPS)return null;return t;}
export function rayHits(w,start,end,opts={}){const res=[];for(const tri of allTriangles(w)){
 if(opts.ignoreOwner===tri.shape.owner)continue;
 const t=intersectTri(start,end,tri);if(t!==null)res.push({id:tri.shape.id,owner:tri.shape.owner,kind:tri.kind,t,at:v3(start.x+t*(end.x-start.x),start.y+t*(end.y-start.y),start.z+t*(end.z-start.z))});
 }return res.sort((a,b)=>a.t-b.t);}
export function raycast(w,start,end,opts={}){return rayHits(w,start,end,opts)[0]||null;}
function overlapsSolidShape(s,b){const f=footprintTouch(s,b.x,b.y,b.r);if(!f.contact)return false;
 // A wedge's upper surface varies across the footprint. This conservative
 // bound is deliberately an approximation, not a rigid-body solver.
 const top=s.type==='ramp'?s.bottom+(s.top-s.bottom)*clamp((f.u+b.r+s.length/2)/s.length,0,1):s.top;
 return b.z<top-0.014&&b.z+b.h>s.bottom+0.014;
}
export function conflicts(w,b,ignoreId=null){const hit=[];for(const s of allShapes(w))if(overlapsSolidShape(s,b))hit.push(s.id);
 for(const p of w.bodies)if(p.id!==b.id&&p.id!==ignoreId&&Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r-.001&&b.z<p.z+p.h-EPS&&b.z+b.h>p.z+EPS)hit.push(p.id);
 return hit;}
export function makeWorld(){const constructions=[makeConstruction({id:'stone-arch',x:0,y:0,length:5.8,width:3,height:2.6,rampLength:3.8,angle:0,material:'stone'}),makeConstruction({id:'timber-crossing',x:9,y:1.5,length:4.0,width:2.5,height:1.6,rampLength:3,angle:Math.PI/2,material:'timber'})];
 return {tick:0,constructions,bodies:[{id:'player',x:-7,y:0,z:0,r:.25,h:1.64,kind:'human',support:'ground',vz:0},
  {id:'scout',x:.5,y:.25,z:2.6,r:.25,h:1.64,kind:'human',support:'stone-arch:deck',vz:0},
  {id:'crate',x:1.9,y:1,z:2.6,r:.36,h:.72,kind:'crate',support:'stone-arch:deck',vz:0}],events:[]};}
export function addConstruction(w,params){if(w.constructions.some(x=>x.id===params.id))return {ok:false,reason:'duplicate'};let c;try{c=makeConstruction(params);}catch(e){return {ok:false,reason:String(e.message)};}
 const list=w.constructions;w.constructions=[...list,c];for(const b of w.bodies)if(conflicts(w,b).length){w.constructions=list;return {ok:false,reason:'occupied'};}
 w.events.push({type:'construction-added',id:c.id,tick:w.tick});return {ok:true,id:c.id};}
export function eraseConstruction(w,id){const idx=w.constructions.findIndex(c=>c.id===id);if(idx<0)return {ok:false};
 w.constructions.splice(idx,1);for(const b of w.bodies)if(b.support?.startsWith(id+':')){b.support=null;b.vz=0;w.events.push({type:'support-lost',id:b.id,from:id,tick:w.tick});}return {ok:true};}
const bodyAt=(w,id)=>w.bodies.find(b=>b.id===id);
export function move(w,id,dx,dy){const b=bodyAt(w,id);if(!b)return {ok:false,reason:'not-found'};
 if(b.support===null)return {ok:false,reason:'airborne'};
 const trial={...b,x:b.x+dx,y:b.y+dy};const ss=surfaceCandidates(w,trial.x,trial.y,trial.r),options=ss.filter(s=>s.z<=b.z+.21&&s.z>=b.z-.33);let chosen=options[0]||null;
 if(!chosen && b.z<=.21)return {ok:false,reason:'unclimbable'};
 if(chosen){trial.z=chosen.z;trial.support=chosen.id;}else{trial.z=b.z;trial.support=null;}
 const hit=conflicts(w,trial);if(hit.length)return {ok:false,reason:'collision',hits:hit};
 Object.assign(b,{x:trial.x,y:trial.y,z:trial.z,support:trial.support});if(!chosen)w.events.push({type:'edge-left',id,tick:w.tick});return {ok:true,support:b.support,z:b.z};}
export function pushCrate(w,id,dx,dy){const b=bodyAt(w,id);if(!b||b.kind!=='crate')return {ok:false,reason:'not-crate'};return move(w,id,dx,dy);}
export function gravityStep(w,dt=1/60){w.tick++;
 for(const b of w.bodies){
  if(b.support){let s=b.support==='ground'?{z:0}:surfaceCandidates(w,b.x,b.y,b.r).find(s=>s.id===b.support);
   if(!s||Math.abs(s.z-b.z)>.06){const old=b.support;b.support=null;b.vz=0;w.events.push({type:'support-lost',id:b.id,from:old,tick:w.tick});}else continue;
  }
  const oldZ=b.z;const vz=Math.max(-16,b.vz-9.81*dt),dest=oldZ+vz*dt;
  const beneath=surfaceCandidates(w,b.x,b.y,b.r).filter(s=>s.z<=oldZ+EPS&&s.z>=dest-EPS).sort((a,b)=>b.z-a.z)[0];
  if(beneath){b.z=beneath.z;b.support=beneath.id;b.vz=0;w.events.push({type:'land',id:b.id,on:beneath.id,tick:w.tick});}
  else{b.z=dest;b.vz=vz;}
 }
}
export function snapshot(w){return JSON.stringify({version:1,tick:w.tick,constructions:w.constructions.map(c=>c.parameters),bodies:w.bodies.map(b=>({...b}))});}
export function restore(s){const x=typeof s==='string'?JSON.parse(s):s;if(x.version!==1||!Array.isArray(x.constructions)||!Array.isArray(x.bodies))throw Error('bad save');
 const w={tick:x.tick||0,constructions:x.constructions.map(makeConstruction),bodies:x.bodies.map(b=>({...b})),events:[]};
 for(const b of w.bodies)if(conflicts(w,b).length)throw Error('saved body intersects construction');return w;}
