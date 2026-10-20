// Splot research: import an authored scene + body positions from a local JSON
// export. This is a FRESH PHYSICS INITIALIZATION, not a solver checkpoint.
// Never mutate the live game before all validation is complete.
import {importWorld} from './spatial-core.mjs';
import {createLiveWorld} from './spatial-sim.mjs';
const fmt='splot-next-live-research-1';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const fail=m=>{throw Error('Nieprawidłowy zapis Splot: '+m);};
export function restoreResearchWorld(payload){
 const obj=typeof payload==='string'?JSON.parse(payload):payload;
 if(!obj||Array.isArray(obj)||typeof obj!=='object'||obj.format!==fmt)
  fail('oczekiwano Splot_Nowy_Rozdzial.json, nie raportu sesji.');
 if(!obj.scene||!Array.isArray(obj.scene.elements)||obj.scene.elements.length>256)
  fail('nieobsługiwane rozmiary sceny (limit badawczy: 256 części).');
 if(!Array.isArray(obj.bodies)||obj.bodies.length>2000||obj.bodies.length<2)
  fail('nieobsługiwana liczba ciał (limit badawczy: 2000).');
 if(!finite(obj.time)||obj.time<0||obj.time>1e9)fail('nieprawidłowy czas świata.');
 // Only canonical primitive fields enter the physics world. Unknown fields in
 // external files must never become authoritative runtime data by accident.
 const sanitized={format:obj.scene.format,width:obj.scene.width,
  height:obj.scene.height,revision:obj.scene.revision,
  elements:obj.scene.elements.map(e=>{
   if(!e||typeof e!=='object')fail('nieprawidłowa część.');
   if(e.kind==='box')return {id:e.id,kind:e.kind,
    min:e.min,max:e.max,...(own(e,'material')?{material:e.material}:{}),
    ...(own(e,'motionType')?{motionType:e.motionType}:{})};
   if(e.kind==='panel')return {id:e.id,kind:e.kind,a:e.a,b:e.b,
    width:e.width,thickness:e.thickness,
    ...(own(e,'material')?{material:e.material}:{})};
   fail('nieobsługiwany rodzaj części.');
  })};
 // importWorld rejects invalid transforms, duplicate IDs, invalid motion,
 // non-finite geometry and truncated/out-of-bounds content.
 const scene=importWorld(sanitized);
 const bodyIds=new Set(),bodies=[];
 let humanCount=0,boarCount=0;
 for(const b of obj.bodies){
  if(!b||typeof b!=='object'||Array.isArray(b))fail('nieprawidłowe ciało.');
  const kind=b.kind,id=b.id;
  if(!['human','boar','crate'].includes(kind)||typeof id!=='string'||
      !/^[-_a-zA-Z0-9]{1,64}$/.test(id))fail('nieobsługiwane ciało.');
  if((kind==='human'&&id!=='human')||(kind==='boar'&&id!=='boar')||
     (kind==='crate'&&!/^crate-[1-9][0-9]*$/.test(id)))fail('niespójny identyfikator ciała.');
  if(bodyIds.has(id))fail('powtarzający się identyfikator ciała.');
  bodyIds.add(id);
  if(kind==='human')humanCount++;
  if(kind==='boar')boarCount++;
  for(const name of ['x','y','z','r','h','mass','yaw']){
   if(!finite(b[name]))fail('nieprawidłowe pole ciała: '+name);
  }
  if(b.r<.05||b.r>10||b.h<.1||b.h>20||b.mass<.01||b.mass>1e6||
     b.x< -5||b.x>scene.width+5||b.y< -5||b.y>scene.height+5||
     b.z< -3||b.z>40)fail('ciało poza obsługiwanymi granicami.');
  // Old support IDs/velocities are never physically authoritative on reload.
  bodies.push({id,kind,x:b.x,y:b.y,z:b.z,r:b.r,h:b.h,
   mass:b.mass,yaw:b.yaw,vz:0,support:null});
 }
 if(humanCount!==1||boarCount!==1)fail('wymagane dokładnie po jednej postaci i dziku.');
 const world=createLiveWorld();
 world.scene=scene;world.bodies=bodies;world.time=obj.time;
 world.grip=null;world.events=[];world.paused=true;
 return world;
}
export function nextAuthoringSequence(w){
 const ids=[...w.scene.elements.map(e=>e.id),...w.bodies.map(b=>b.id)];
 let max=9;
 for(const id of ids){
  const m=typeof id==='string'&&id.match(/^(?:block|part|crate)-([0-9]+)$/);
  if(m){const n=Number(m[1]);if(Number.isSafeInteger(n))max=Math.max(max,n);}
 }
 return max+1;
}
