// Splot Next: physical spatial facts, independent of renderer, input, and NPCs.
// World metres. Z is up. Geometries are finite solid volumes; faces for
// drawing, picking and support are derived from the SAME authored definitions.
const EPS=1e-8;
const num=n=>typeof n==='number'&&Number.isFinite(n);
const vec=p=>Array.isArray(p)&&p.length===3&&p.every(num);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,t)=>a.map(v=>v*t);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const unit=a=>{const len=length(a);if(len<EPS)throw Error('zero-vector');return mul(a,1/len)};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const frozenClone=o=>JSON.parse(JSON.stringify(o));
export const WORLD_FORMAT='splot-spatial-v2-research';
export function createSpatialWorld({width=42,height=32}={}) {
 if(!num(width)||!num(height)||width<4||height<4||width>512||height>512)throw Error('invalid-world-bounds');
 return {format:WORLD_FORMAT,width,height,revision:0,elements:[]};
}
function validElement(w,e){
 if(!e||typeof e!=='object'||Array.isArray(e)||typeof e.id!=='string'||!/^[-_a-zA-Z0-9]{1,64}$/.test(e.id))return 'invalid-id';
 if(!['panel','box'].includes(e.kind))return 'unsupported-kind';
 if(e.material!==undefined&&(typeof e.material!=='string'||!/^[-_a-zA-Z0-9]{1,32}$/.test(e.material)))return 'invalid-material';
 let points=[];
 if(e.kind==='panel'){
  if(!vec(e.a)||!vec(e.b)||!num(e.width)||!num(e.thickness)||e.width<.1||e.thickness<.02||e.width>40||e.thickness>5)return 'invalid-panel';
  const d=Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]);if(d<.2||d>80)return 'invalid-span';
  if(Math.abs(e.b[2]-e.a[2])>15)return 'invalid-slope';
  points=[e.a,e.b];
 }else{
  if(!vec(e.min)||!vec(e.max)||e.min.some((v,i)=>v>=e.max[i]-.01))return 'invalid-box';
  points=[e.min,e.max];
 }
 for(const p of points)if(p[0]<-2||p[0]>w.width+2||p[1]<-2||p[1]>w.height+2||p[2]<-2||p[2]>30)return 'out-of-bounds';
 return null;
}
export function insertElement(world,element){
 if(world.elements.length>=256)return {ok:false,reason:'capacity'};
 if(world.elements.some(e=>e.id===element?.id))return {ok:false,reason:'duplicate-id'};
 const reason=validElement(world,element);if(reason)return {ok:false,reason};
 world.elements.push(frozenClone(element));world.revision++;return {ok:true,id:element.id,revision:world.revision};
}
export function replaceElement(world,id,next){
 const i=world.elements.findIndex(e=>e.id===id);if(i===-1)return {ok:false,reason:'not-found'};
 if(id!==next?.id)return {ok:false,reason:'identity-change'};
 const reason=validElement(world,next);if(reason)return {ok:false,reason};
 world.elements[i]=frozenClone(next);world.revision++;return {ok:true,id,revision:world.revision};
}
export function removeElement(world,id){const i=world.elements.findIndex(e=>e.id===id);if(i<0)return {ok:false,reason:'not-found'};
 world.elements.splice(i,1);world.revision++;return {ok:true,id,revision:world.revision};}
export function exportWorld(w){return JSON.stringify(w);}
export function importWorld(s){const o=typeof s==='string'?JSON.parse(s):s;
 if(!o||o.format!==WORLD_FORMAT||!Array.isArray(o.elements)||!Number.isSafeInteger(o.revision)||o.revision<0)throw Error('invalid-format');
 const w=createSpatialWorld({width:o.width,height:o.height});
 for(const e of o.elements){const r=insertElement(w,e);if(!r.ok)throw Error('bad-element:'+r.reason);}
 w.revision=o.revision;return w;}
function tri(a,b,c,owner,face){const normal=unit(cross(sub(b,a),sub(c,a)));
 return {a,b,c,normal,owner,face};}
function quad(a,b,c,d,owner,face){return [tri(a,b,c,owner,face),tri(a,c,d,owner,face)];}
function boxTriangles(e){
 const [x,y,z]=e.min,[X,Y,Z]=e.max;
 const p=(a,b,c)=>[a,b,c];
 return [
 ...quad(p(x,y,Z),p(X,y,Z),p(X,Y,Z),p(x,Y,Z),e.id,'top'),
 ...quad(p(x,Y,z),p(X,Y,z),p(X,y,z),p(x,y,z),e.id,'bottom'),
 ...quad(p(x,y,z),p(X,y,z),p(X,y,Z),p(x,y,Z),e.id,'side'),
 ...quad(p(X,y,z),p(X,Y,z),p(X,Y,Z),p(X,y,Z),e.id,'side'),
 ...quad(p(X,Y,z),p(x,Y,z),p(x,Y,Z),p(X,Y,Z),e.id,'side'),
 ...quad(p(x,Y,z),p(x,y,z),p(x,y,Z),p(x,Y,Z),e.id,'side')];
}
function panelTriangles(e){
 const a=e.a,b=e.b,v=unit([b[0]-a[0],b[1]-a[1],0]),s=[-v[1]*e.width/2,v[0]*e.width/2,0];
 const p=[sub(a,s),sub(b,s),add(b,s),add(a,s)];const q=p.map(x=>sub(x,[0,0,e.thickness]));
 return [
 ...quad(p[0],p[1],p[2],p[3],e.id,'top'),
 ...quad(q[3],q[2],q[1],q[0],e.id,'bottom'),
 ...quad(q[0],q[1],p[1],p[0],e.id,'side'),
 ...quad(q[1],q[2],p[2],p[1],e.id,'side'),
 ...quad(q[2],q[3],p[3],p[2],e.id,'side'),
 ...quad(q[3],q[0],p[0],p[3],e.id,'side')];
}
export function trianglesFor(e){return e.kind==='box'?boxTriangles(e):panelTriangles(e);}
export function sceneTriangles(world){return world.elements.flatMap(trianglesFor);}
function intersectTriangle(o,d,t,maxDistance){
 const edge1=sub(t.b,t.a),edge2=sub(t.c,t.a),h=cross(d,edge2),det=dot(edge1,h);
 if(Math.abs(det)<EPS)return null;
 const inv=1/det,s=sub(o,t.a),u=dot(s,h)*inv;if(u<-EPS||u>1+EPS)return null;
 const q=cross(s,edge1),v=dot(d,q)*inv;if(v<-EPS||u+v>1+EPS)return null;
 const k=dot(edge2,q)*inv;return k>EPS&&k<=maxDistance+EPS?k:null;
}
export function castRay(world,origin,direction,{maxDistance=200,ground=true,onlySupports=false}={}){
 if(!vec(origin)||!vec(direction)||!num(maxDistance)||maxDistance<=0)throw Error('invalid-ray');
 const dir=unit(direction),out=[];
 for(const t of sceneTriangles(world)){
  if(onlySupports&&t.normal[2]<.45)continue;
  const distance=intersectTriangle(origin,dir,t,maxDistance);if(distance===null)continue;
  out.push({id:t.owner,face:t.face,normal:t.normal,distance,point:add(origin,mul(dir,distance))});
 }
 if(ground&&(!onlySupports||dir[2]<0)&&dir[2]<-EPS){
  const distance=-origin[2]/dir[2],point=add(origin,mul(dir,distance));
  if(distance>EPS&&distance<=maxDistance+EPS&&point[0]>=0&&point[0]<=world.width&&point[1]>=0&&point[1]<=world.height)
   out.push({id:'ground',face:'top',normal:[0,0,1],distance,point});
 }
 out.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
 // Adjacent triangles on the same face may yield coincident hits.
 return out.filter((hit,i)=>!out.slice(0,i).some(v=>v.id===hit.id&&v.face===hit.face&&Math.abs(v.distance-hit.distance)<1e-6));
}
export function supportCandidates(world,x,y,{maxZ=31}={}){
 if(!num(x)||!num(y)||!num(maxZ))throw Error('invalid-support-query');
 return castRay(world,[x,y,maxZ],[0,0,-1],{onlySupports:true,maxDistance:Math.max(1,maxZ+3)})
  .map(h=>({id:h.id,z:h.point[2],normal:h.normal,point:h.point}));
}
// A conservative volume gate until a complete swept-volume contact solver
// earns its place. It NEVER claims accurate rotation or rigid-body impulses.
function circleRect(u,v,minU,maxU,minV,maxV,r){const a=clamp(u,minU,maxU),b=clamp(v,minV,maxV);return (u-a)**2+(v-b)**2<=r*r+EPS;}
export function clearanceAt(world,{x,y,z,r=.28,h=1.6,supportId=null}){
 if([x,y,z,r,h].some(v=>!num(v))||r<=0||h<=0)throw Error('invalid-body');
 const contacts=[];
 if(x-r<0||x+r>world.width||y-r<0||y+r>world.height)contacts.push('bounds');
 for(const e of world.elements){
  let low,high,overlap=false;
  if(e.kind==='box'){
   overlap=circleRect(x,y,e.min[0],e.max[0],e.min[1],e.max[1],r);
   low=e.min[2];high=e.max[2];
  }else{
   const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],len=Math.hypot(dx,dy);
   const ux=dx/len,uy=dy/len,qx=x-e.a[0],qy=y-e.a[1],u=qx*ux+qy*uy,v=-qx*uy+qy*ux;
   overlap=circleRect(u,v,0,len,-e.width/2,e.width/2,r);
   const slope=(e.b[2]-e.a[2])/len;
   low=Math.min(e.a[2]+slope*clamp(u-r,0,len),e.a[2]+slope*clamp(u+r,0,len))-e.thickness;
   high=Math.max(e.a[2]+slope*clamp(u-r,0,len),e.a[2]+slope*clamp(u+r,0,len));
  }
  if(!overlap)continue;
  // A support surface and occupied volume are separate concepts; a body may
  // stand with feet on the top without intersecting the solid itself.
  if(e.id===supportId&&Math.abs(z-high)<.20)continue;
  if(z<high-1e-4&&z+h>low+1e-4)contacts.push(e.id);
 }
 return {free:contacts.length===0,contacts};
}
export function makeCamera({target=[20,15,0],azimuth=0,elevation=Math.PI/3,width=900,height=560,pixelsPerMeter=35}={}){
 if(!vec(target)||![azimuth,elevation,width,height,pixelsPerMeter].every(num)||elevation<.25||elevation>1.48||width<1||height<1||pixelsPerMeter<=0)throw Error('invalid-camera');
 const toward=unit([-Math.sin(azimuth)*Math.cos(elevation),Math.cos(azimuth)*Math.cos(elevation),-Math.sin(elevation)]);
 const right=unit(cross(toward,[0,0,1])),up=unit(cross(right,toward));
 return {target:[...target],azimuth,elevation,width,height,pixelsPerMeter,forward:toward,right,up};
}
export function projectPoint(cam,point){
 const p=sub(point,cam.target);return {x:cam.width/2+dot(p,cam.right)*cam.pixelsPerMeter,
  y:cam.height/2-dot(p,cam.up)*cam.pixelsPerMeter,depth:dot(p,cam.forward)};
}
export function rayFromPixel(cam,x,y){
 const p=add(add(cam.target,mul(cam.right,(x-cam.width/2)/cam.pixelsPerMeter)),mul(cam.up,(cam.height/2-y)/cam.pixelsPerMeter));
 return {origin:sub(p,mul(cam.forward,100)),direction:[...cam.forward]};
}
export function pickPixel(world,cam,x,y){const ray=rayFromPixel(cam,x,y);return castRay(world,ray.origin,ray.direction,{maxDistance:200});}
export function occlusionToPoint(world,cam,point,{ignoreId=null}={}){
 const p=projectPoint(cam,point),ray=rayFromPixel(cam,p.x,p.y);
 const distance=dot(sub(point,ray.origin),ray.direction);
 const hits=castRay(world,ray.origin,ray.direction,{maxDistance:distance-1e-4});
 const first=hits.find(h=>h.id!==ignoreId);
 return {visible:!first,blocker:first||null};
}
