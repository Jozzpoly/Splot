// RESEARCH contract ONLY. Multiple sloped planks, authored identifiers,
// candidate surfaces and all hit layers; deliberately not a universal Studio
// document, playable-world save or full physics substrate.
import {makeSlopedPlank,plankHeight,plankRayHits,plankCircleContact,plankCylinderContact} from './spatial_construction.mjs';
export const MAX_PLANKS=24;
const fields=['id','ax','ay','bx','by','width','z0','z1','thickness'];
function strictParams(obj){
 if(obj===null||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).length!==fields.length||fields.some(k=>!Object.hasOwn(obj,k)))throw TypeError('invalid authored plank fields');
 const p={};for(const k of fields)p[k]=obj[k];makeSlopedPlank(p);return p;
}
export function createSpatialScene(definitions=[]){
 if(!Array.isArray(definitions)||definitions.length>MAX_PLANKS)throw TypeError('too many constructions');
 const scene={version:'spatial-research-v1',definitions:[]};for(const p of definitions){
  const accepted=addPlank(scene,p);if(!accepted.ok)throw TypeError('invalid construction scene: '+accepted.reason);
 }return scene;
}
export function addPlank(scene,params){
 const p=strictParams(params);
 if(scene.definitions.length>=MAX_PLANKS)return {ok:false,reason:'capacity'};
 if(scene.definitions.some(v=>v.id===p.id))return {ok:false,reason:'duplicate-id'};
 scene.definitions.push(p);return {ok:true,id:p.id};
}
export function removePlank(scene,id){const i=scene.definitions.findIndex(x=>x.id===id);if(i<0)return {ok:false,reason:'not-found'};
 scene.definitions.splice(i,1);return {ok:true,id};}
export function allPlanks(scene){return scene.definitions.map(makeSlopedPlank);}
// These are candidates, not automatic permission to step between surfaces.
// The caller must resolve traversability and body shape/clearance separately.
export function supportCandidates(scene,x,y,{radius=0}={}){
 const result=[{id:'ground',z:0}];for(const s of allPlanks(scene)){
  // A body can partly overlap a plank while its centre lies outside it.
  // Expose that fact; do not invent a unique support height for that case.
  if(!plankCircleContact(s,{x,y,r:radius}))continue;
  const z=plankHeight(s,x,y);if(z!==null)result.push({id:s.id,z});
  else result.push({id:s.id,z:null,edgeOnly:true});
 }
 return result;
}
export function contactCandidates(scene,body){return allPlanks(scene).filter(p=>plankCylinderContact(p,body,p.id)).map(p=>p.id);}
export function rayCandidates(scene,start,end,{kind=null}={}){
 return allPlanks(scene).flatMap(p=>plankRayHits(p,start,end)).filter(h=>!kind||h.kind===kind).sort((a,b)=>a.t-b.t||a.id.localeCompare(b.id));
}
export function scenePick(scene,start,end,{kind='top',index=0}={}){
 // Two triangles on one coplanar top can yield the same ray hit. Collapse
 // only numerically identical hits of a single face, never a separate height.
 const ordered=rayCandidates(scene,start,end,{kind}),unique=[];
 for(const h of ordered)if(!unique.some(prev=>prev.id===h.id&&Math.abs(prev.t-h.t)<1e-7))unique.push(h);
 return {candidates:unique,selected:unique[index]||null};
}
export function exportSpatialScene(scene){return JSON.stringify({version:'spatial-research-v1',planks:scene.definitions});}
export function importSpatialScene(serialized){const val=typeof serialized==='string'?JSON.parse(serialized):serialized;
 if(!val||typeof val!=='object'||Array.isArray(val)||Object.keys(val).length!==2||val.version!=='spatial-research-v1'||!Array.isArray(val.planks))throw TypeError('not a spatial research scene');
 return createSpatialScene(val.planks);
}
