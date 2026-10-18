import {createWorld,getBody,placeObject,eraseObject,tickWorld,bodyConflicts} from '../src/world.mjs';
import {writeFileSync} from 'node:fs';
const scenarios=[
 {name:'północny zachód',a:[5,5],g:[8,5],block:[6.5,5]},
 {name:'południowy zachód',a:[9,42],g:[12,42],block:[10.5,42]},
 {name:'południowy wschód',a:[70,44],g:[73,44],block:[71.5,44]},
];
function solve(s,block){const w=createWorld(917),boar=getBody(w,'boar');boar.x=s.a[0];boar.y=s.a[1];boar.z=0;boar.support='ground';w.goal={id:'food',x:s.g[0],y:s.g[1],z:0,eaten:false};
 let edit=null;if(block){edit=placeObject(w,'wall',...s.block);if(!edit.ok)throw Error(JSON.stringify(edit));}
 let firstPath=0,foodAt=null;let start=performance.now();
 for(let i=0;i<1800;i++){let ev=tickWorld(w,{ai:true});if(!firstPath)firstPath=w.nav.path.length;if(ev.some(e=>e.type==='food-reached')){foodAt=w.time;break;}}
 return {eaten:w.goal.eaten,foodAt,firstPath,planned:w.stats.routes,elapsedMs:Math.round(performance.now()-start),edits:w.authored.length};}
const rows=scenarios.map(s=>({name:s.name,withoutWall:solve(s,false),withAuthoredWall:solve(s,true)}));
writeFileSync(new URL('../agency-captures/generalization.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows,null,2));
