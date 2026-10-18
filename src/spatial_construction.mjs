// A deliberately narrow geometry primitive for Splot's experimental 2.5D.
// One authored, finite-thickness sloped plank (XY ground, Z up) produces
// contact footprint, top-support height, occupied volume approximation,
// full triangles and ray hits. It is NOT a physics solver or a map format.
const EPS=1e-7;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const faceIndices=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
export function makeSlopedPlank({id,ax,ay,bx,by,width,z0,z1,thickness}){
 const nums=[ax,ay,bx,by,width,z0,z1,thickness];
 if(typeof id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)||nums.some(n=>!Number.isFinite(n))||width<=0||thickness<=0)
  throw new TypeError('invalid sloped plank');
 const length=Math.hypot(bx-ax,by-ay);
 if(length<.001||length>1000||width>1000||Math.abs(z1-z0)>1000||thickness>100)throw new RangeError('sloped plank out of range');
 const tx=(bx-ax)/length,ty=(by-ay)/length;
 return Object.freeze({id,ax,ay,bx,by,width,z0,z1,thickness,length,tx,ty,nx:-ty,ny:tx});
}
function coords(s,x,y){const dx=x-s.ax,dy=y-s.ay;return {u:dx*s.tx+dy*s.ty,v:dx*s.nx+dy*s.ny};}
export function plankAxisHeight(s,x,y){const {u}=coords(s,x,y);return s.z0+(s.z1-s.z0)*clamp(u/s.length,0,1);}
export function plankHeight(s,x,y){const {u,v}=coords(s,x,y);if(u < -EPS||u>s.length+EPS||Math.abs(v)>s.width/2+EPS)return null;
 return plankAxisHeight(s,x,y);
}
export function plankCircleContact(s,b){const {u,v}=coords(s,b.x,b.y);const nearU=clamp(u,0,s.length),nearV=clamp(v,-s.width/2,s.width/2);
 return (u-nearU)**2+(v-nearV)**2 <= b.r*b.r+EPS;
}
function xyz(s,u,v,z){return {x:s.ax+s.tx*u+s.nx*v,y:s.ay+s.ty*u+s.ny*v,z};}
export function plankTriangles(s){const half=s.width/2;
 const b0=xyz(s,0,-half,s.z0-s.thickness),b1=xyz(s,s.length,-half,s.z1-s.thickness),b2=xyz(s,s.length,half,s.z1-s.thickness),b3=xyz(s,0,half,s.z0-s.thickness);
 const t0=xyz(s,0,-half,s.z0),t1=xyz(s,s.length,-half,s.z1),t2=xyz(s,s.length,half,s.z1),t3=xyz(s,0,half,s.z0);
 const verts=[b0,b1,b2,b3,t0,t1,t2,t3];return faceIndices.map(indices=>indices.map(i=>verts[i]));
}
export function plankCylinderContact(s,b,supportId=s.id,{lowStep=.32}={}){
 if(!plankCircleContact(s,b))return false;
 const {u}=coords(s,b.x,b.y),left=clamp(u-b.r,0,s.length),right=clamp(u+b.r,0,s.length);
 const a=s.z0+(s.z1-s.z0)*(left/s.length),c=s.z0+(s.z1-s.z0)*(right/s.length);
 const low=Math.min(a,c)-s.thickness,high=Math.max(a,c);
 // A low accessible entry edge is a step-up, not a full-height wall.
 if(b.support==='ground'&&high<=lowStep)return false;
 // No duplicate collision between a foot and its own support plane.
 // Legacy K2 support is centre-based; at a side boundary the body's foot
 // may still overlap the plank even when its centre left its footprint.
 // Preserve that contact policy during migration rather than silently changing
 // how actors exit the ramp. A stronger contact solver remains an open issue.
 const centreAxisZ=plankAxisHeight(s,b.x,b.y);
 if(b.support===supportId&&Math.abs(b.z-centreAxisZ)<.05)return false;
 return b.z<high-EPS&&b.z+b.h>low+EPS;
}
function triT(start,end,tri){const v=sub(end,start),e1=sub(tri[1],tri[0]),e2=sub(tri[2],tri[0]),h=cross(v,e2),det=dot(e1,h);
 if(Math.abs(det)<1e-10)return null;const inv=1/det,delta=sub(start,tri[0]),u=inv*dot(delta,h);if(u<-EPS||u>1+EPS)return null;
 const q=cross(delta,e1),w=inv*dot(v,q);if(w<-EPS||u+w>1+EPS)return null;
 const t=inv*dot(e2,q);return t>=-EPS&&t<=1+EPS?t:null;
}
export function plankRayHits(s,start,end){const hits=[];for(const [i,triangle]of plankTriangles(s).entries()){
 const t=triT(start,end,triangle);if(t===null)continue;
 hits.push({id:s.id,kind:i<2?'bottom':i<4?'top':'side',t,at:{x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,z:start.z+(end.z-start.z)*t}});
 }return hits.sort((a,b)=>a.t-b.t);
}
