// Render-derived data only: NEVER own physics, picking, materials or
// authored identities. Static authored primitives rebuild on scene revision;
// Box3D-updated dynamic primitive geometry is regenerated on every render
// because physics transforms intentionally do NOT increment authored revision.
import {trianglesFor} from './spatial-core.mjs';
import {exteriorBoxTriangles} from './exterior-boxes.mjs';
// Render-only opt-in guides: surface seams are not separate authored parts,
// colliders, picking targets or support surfaces.
function panelPlankSeams(e){
 if(e.kind!=='panel'||e.material!=='wood')return [];
 const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],dz=e.b[2]-e.a[2],len=Math.hypot(dx,dy);
 if(len<1.65)return [];
 const across=[-dy/len,dx/len],slope=dz/len;
 const n=[-slope*dx/len,-slope*dy/len,1],mag=Math.hypot(...n),normal=n.map(v=>v/mag);
 const p=(dist,offset)=>{
  const t=dist/len;
  return [e.a[0]+dx*t+across[0]*offset,
   e.a[1]+dy*t+across[1]*offset,e.a[2]+dz*t+.012];
 };
 const triangles=[],stride=Math.max(.83,len/24),half=.012,width=e.width*.475;
 for(let dist=stride;dist<len-.25;dist+=stride){
  const a=p(dist-half,-width),b=p(dist+half,-width),
   c=p(dist+half,width),d=p(dist-half,width);
  const props={owner:e.id,material:'wood-seam',face:'visual-only-plank-guide',normal};
  triangles.push({...props,a,b,c},{...props,a,b:c,c:d});
 }
 return triangles;
}
export function createSceneVisualCache({exteriorBoxes=false,plankSeams=false}={}){
 let source=null,revision=-1,anchored=[],builds=0;
 const painted=e=>trianglesFor(e).map(t=>({...t,material:e.material||'stone'}));
 return {
  triangles(world){
   if(source!==world||revision!==world.revision){
    source=world;revision=world.revision;builds++;
    const fixed=world.elements.filter(e=>e.motionType!=='dynamic');
    anchored=(exteriorBoxes?exteriorBoxTriangles(fixed):fixed.flatMap(painted)).concat(
     plankSeams?fixed.flatMap(panelPlankSeams):[]);
   }
   const moving=world.elements.filter(e=>e.motionType==='dynamic').flatMap(painted);
   return anchored.concat(moving);
  },
  stats(){return {staticBuilds:builds,staticTriangles:anchored.length,revision,exteriorBoxes,plankSeams}},
  clear(){source=null;revision=-1;anchored=[]}
 };
}
