// Render-derived data only: NEVER own physics, picking, materials or
// authored identities. Static authored primitives rebuild on scene revision;
// Box3D-updated dynamic primitive geometry is regenerated on every render
// because physics transforms intentionally do NOT increment authored revision.
import {trianglesFor} from './spatial-core.mjs';
import {exteriorBoxTriangles} from './exterior-boxes.mjs';
export function createSceneVisualCache({exteriorBoxes=false}={}){
 let source=null,revision=-1,anchored=[],builds=0;
 const painted=e=>trianglesFor(e).map(t=>({...t,material:e.material||'stone'}));
 return {
  triangles(world){
   if(source!==world||revision!==world.revision){
    source=world;revision=world.revision;builds++;
    const fixed=world.elements.filter(e=>e.motionType!=='dynamic');
    anchored=exteriorBoxes?exteriorBoxTriangles(fixed):fixed.flatMap(painted);
   }
   const moving=world.elements.filter(e=>e.motionType==='dynamic').flatMap(painted);
   return anchored.concat(moving);
  },
  stats(){return {staticBuilds:builds,staticTriangles:anchored.length,revision,exteriorBoxes}},
  clear(){source=null;revision=-1;anchored=[]}
 };
}
