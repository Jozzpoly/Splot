// Research-only first dynamic construction lifecycle for *axis-aligned boxes*.
// No fake collapse: a released box becomes an actual Box3D dynamic rigid body.
// Orientation remains locked until scene OBB/transform truth is implemented.
// Scene revision tracks authoring; changing pose per physics tick does not
// pretend the user performed an edit or rebuild collider from each step.
import {replaceElement} from './spatial-core.mjs';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function partMotionMode(e){
 return e?.kind==='box'&&e.motionType==='dynamic'?'dynamic':'anchored';
}
export function setBoxMotion(world,id,motionType){
 if(!['dynamic','anchored'].includes(motionType))return {ok:false,reason:'invalid-motion-type'};
 const part=world.elements.find(e=>e.id===id);
 if(!part)return {ok:false,reason:'not-found'};
 if(part.kind!=='box')return {ok:false,reason:'box-only-research-boundary'};
 if(partMotionMode(part)===motionType)return {ok:true,id,unchanged:true};
 return replaceElement(world,id,{...part,motionType});
}
export function boxCenter(e){
 if(e?.kind!=='box')throw Error('not-box');
 return e.min.map((v,i)=>(v+e.max[i])/2);
}
export function translateBoxToCenter(e,p){
 if(e?.kind!=='box'||!Array.isArray(p)||p.length!==3||!p.every(finite))throw Error('invalid-box-pose');
 const old=boxCenter(e),delta=p.map((v,i)=>v-old[i]);
 if(!delta.some(x=>Math.abs(x)>1e-8))return false;
 for(let i=0;i<3;i++){e.min[i]+=delta[i];e.max[i]+=delta[i];}
 return true;
}
export function boxVolume(e){
 if(e?.kind!=='box')throw Error('not-box');
 return e.min.reduce((v,x,i)=>v*(e.max[i]-x),1);
}
