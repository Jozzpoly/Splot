// Render-only *experimental* exterior of anchored axis-aligned boxes.
// The independent authored elements and their Box3D colliders remain unchanged.
// Sloped panels, moving boxes and cross-type contacts are intentionally OUTSIDE
// this experiment. URL opt-in: ?faces=exterior-boxes. Never a physics CSG.
import {trianglesFor} from './spatial-core.mjs';
const EPS=1e-7;
const axes=[[1,2],[0,2],[0,1]];
const ordered=(values)=>values.sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>EPS);
const quads=(e,axis,sign,u0,u1,v0,v1)=>{
 const plane=sign===1?e.max[axis]:e.min[axis];
 const p=(x,y,z)=>[x,y,z];
 let corners;
 if(axis===2)corners=sign===1?
  [p(u0,v0,plane),p(u1,v0,plane),p(u1,v1,plane),p(u0,v1,plane)]:
  [p(u0,v1,plane),p(u1,v1,plane),p(u1,v0,plane),p(u0,v0,plane)];
 else if(axis===0)corners=sign===1?
  [p(plane,u0,v0),p(plane,u1,v0),p(plane,u1,v1),p(plane,u0,v1)]:
  [p(plane,u1,v0),p(plane,u0,v0),p(plane,u0,v1),p(plane,u1,v1)];
 else corners=sign===1?
  [p(u1,plane,v0),p(u0,plane,v0),p(u0,plane,v1),p(u1,plane,v1)]:
  [p(u0,plane,v0),p(u1,plane,v0),p(u1,plane,v1),p(u0,plane,v1)];
 const normal=[0,0,0];normal[axis]=sign;
 const mk=(a,b,c)=>({a,b,c,normal,face:axis===2?(sign===1?'top':'bottom'):'side',
  owner:e.id,material:e.material||'stone'});
 return [mk(corners[0],corners[1],corners[2]),mk(corners[0],corners[2],corners[3])];
};
export function exteriorBoxTriangles(elements,{maxCells=4096}={}){
 if(!Array.isArray(elements)||!Number.isInteger(maxCells)||maxCells<1)throw Error('invalid-exterior-args');
 const boxes=elements.filter(e=>e.kind==='box'&&e.motionType!=='dynamic');
 const out=[];
 for(const e of elements){
  if(e.motionType==='dynamic')continue;
  if(e.kind!=='box'){
   out.push(...trianglesFor(e).map(t=>({...t,material:e.material||'stone'})));
   continue;
  }
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   const [ua,va]=axes[axis],plane=sign===1?e.max[axis]:e.min[axis];
   const u0=e.min[ua],u1=e.max[ua],v0=e.min[va],v1=e.max[va];
   const blockers=[];
   for(const other of boxes){
    if(other===e)continue;
    const oneSide=sign===1?
     (other.min[axis]<plane+EPS&&other.max[axis]>plane+EPS):
     (other.min[axis]<plane-EPS&&other.max[axis]>plane-EPS);
    // Coincident OUTWARD faces have a deterministic first-authored winner.
    const sameOutside=sign===1?
     Math.abs(other.max[axis]-plane)<=EPS:
     Math.abs(other.min[axis]-plane)<=EPS;
    const precedence=boxes.indexOf(other)<boxes.indexOf(e);
    if(!oneSide&&!(sameOutside&&precedence))continue;
    const a=Math.max(u0,other.min[ua]),b=Math.min(u1,other.max[ua]);
    const c=Math.max(v0,other.min[va]),d=Math.min(v1,other.max[va]);
    if(b-a>EPS&&d-c>EPS)blockers.push([a,b,c,d]);
   }
   if(!blockers.length){out.push(...quads(e,axis,sign,u0,u1,v0,v1));continue;}
   const us=ordered([u0,u1,...blockers.flatMap(b=>[b[0],b[1]])]);
   const vs=ordered([v0,v1,...blockers.flatMap(b=>[b[2],b[3]])]);
   // Pathological dense subdividing is diagnostic, not a reason to hang play.
   // Safe conservative fallback: original face, possible internal overlaps.
   if((us.length-1)*(vs.length-1)>maxCells){
    out.push(...quads(e,axis,sign,u0,u1,v0,v1));continue;
   }
   for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){
    const a=us[i],b=us[i+1],c=vs[j],d=vs[j+1];
    if(b-a<EPS||d-c<EPS)continue;
    const u=(a+b)/2,v=(c+d)/2;
    if(blockers.some(q=>u>=q[0]-EPS&&u<=q[1]+EPS&&v>=q[2]-EPS&&v<=q[3]+EPS))continue;
    out.push(...quads(e,axis,sign,a,b,c,d));
   }
  }
 }
 return out;
}
