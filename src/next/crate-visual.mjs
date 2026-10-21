// A crate has one visible top surface, not two coincident tops.
// The Box3D contact shape is independent of this purely visual skin.
import {trianglesFor,rayFromPixel} from './spatial-core.mjs';
export function crateTriangles(b){
 const lid=.07;
 const base=trianglesFor({kind:'box',id:b.id,
  min:[b.x-b.r,b.y-b.r,b.z],
  max:[b.x+b.r,b.y+b.r,b.z+b.h-lid]});
 const cap=trianglesFor({kind:'box',id:b.id,
  min:[b.x-b.r-.018,b.y-b.r-.018,b.z+b.h-lid],
  max:[b.x+b.r+.018,b.y+b.r+.018,b.z+b.h]});
 // Both internal faces are sealed and must not be sent to depth rendering.
 return [...base.filter(t=>t.face!=='top').map(t=>({...t,material:'crate'})),
         ...cap.filter(t=>t.face!=='bottom').map(t=>({...t,material:'wood'}))];
}

// Only a dynamic CRATE's visible top is a placement target for ANOTHER
// dynamic crate. Authored boxes and panels retain their independent anchored
// semantics; clicking this surface never creates an implicit rigid joint.
// Ray and visual cap share the same 0.018 m top overhang.
export function crateTopHits(bodies,cam,x,y){
 const ray=rayFromPixel(cam,x,y),[ox,oy,oz]=ray.origin,[dx,dy,dz]=ray.direction;
 if(dz>=-1e-9)return [];
 const hits=[];
 for(const b of bodies){
  if(b.kind!=='crate')continue;
  const top=b.z+b.h,distance=(top-oz)/dz;
  if(distance<=1e-8||distance>200)continue;
  const px=ox+dx*distance,py=oy+dy*distance,half=b.r+.018;
  if(Math.abs(px-b.x)>half+1e-8||Math.abs(py-b.y)>half+1e-8)continue;
  hits.push({id:b.id,face:'top',normal:[0,0,1],distance,point:[px,py,top]});
 }
 return hits.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}


// Erasing any outward-facing piece of a dynamic crate's rendered skin should
// erase that BODY, without invoking static geometry behind it.
// The two finite slabs match crateTriangles (base + protruding lid).
export function crateSurfaceHits(bodies,cam,x,y){
 const {origin,direction}=rayFromPixel(cam,x,y),EPS=1e-8,hits=[];
 const aabb=(min,max)=>{
  let enter=-Infinity,exit=Infinity,axis=-1,sign=0;
  for(let i=0;i<3;i++){
   const d=direction[i];
   if(Math.abs(d)<EPS){if(origin[i]<min[i]||origin[i]>max[i])return null;continue;}
   let a=(min[i]-origin[i])/d,b=(max[i]-origin[i])/d,side=d>0?-1:1;
   if(a>b)[a,b]=[b,a];
   if(a>enter){enter=a;axis=i;sign=side;}
   exit=Math.min(exit,b);if(exit<enter)return null;
  }
  if(enter<=EPS||enter>200)return null;
  const normal=[0,0,0];normal[axis]=sign;
  return {distance:enter,normal,face:axis===2?(sign>0?'top':'bottom'):'side',
   point:origin.map((n,i)=>n+enter*direction[i])};
 };
 for(const b of bodies){
  if(b.kind!=='crate')continue;
  const r=b.r,z=b.z,x=b.x,y=b.y,cap=.018,lid=.07;
  const candidates=[
   aabb([x-r,y-r,z],[x+r,y+r,z+b.h-lid]),
   aabb([x-r-cap,y-r-cap,z+b.h-lid],[x+r+cap,y+r+cap,z+b.h])
  ].filter(Boolean).sort((a,b)=>a.distance-b.distance);
  if(candidates.length)hits.push({...candidates[0],id:b.id});
 }
 return hits.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}
