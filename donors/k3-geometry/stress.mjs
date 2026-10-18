import {makeWorld,makeConstruction,move,gravityStep,conflicts,raycast,surfaceCandidates} from './geometry.mjs';
let checks=0, mismatches=[],penetrations=[];
for(let j=0;j<48;j++){
 const a=j*Math.PI/24,h=1.05+j*.057,l=2+j*.12;
 const c=makeConstruction({id:'random-'+j,x:0,y:0,angle:a,length:l,width:1.4+(j%5)*.19,height:h,rampLength:2.5+j*.015,rampWidth:1.2,material:['stone','metal','timber'][j%3],withPosts:false});
 const w={constructions:[c],bodies:[],events:[],tick:0};
 const r=c.shapes[1];let c0=Math.cos(a),s0=Math.sin(a);
 for(let i=0;i<20;i++){
  let u=-r.length*.49+r.length*.98*(i+.5)/20,x=r.x+u*c0,y=r.y+u*s0,z=surfaceCandidates(w,x,y).find(q=>q.id===r.id)?.z;
  const hit=raycast(w,{x,y,z:h+2},{x,y,z:-1});checks++;
  if(!hit||hit.id!==r.id||Math.abs(hit.at.z-z)>1e-6)mismatches.push({j,i,hit,z});
 }
}
for(const start of [[2.2,0],[2.5,.4],[1.9,1],[2,1.2],[2.75,0],[0,1.45]]){
 const w=makeWorld(),b=w.bodies.find(b=>b.id==='scout');w.bodies=[b];b.x=start[0];b.y=start[1];b.z=2.6;b.support='stone-arch:deck';
 for(let k=0;k<320;k++){
  if(b.support!==null)move(w,b.id,.033,0);
  gravityStep(w);checks++;
  const hit=conflicts(w,b);if(hit.length){penetrations.push({start,k,x:b.x,y:b.y,z:b.z,support:b.support,hit});break;}
 }
}
console.log(JSON.stringify({checks,rayMismatches:mismatches.slice(0,5),rayMismatchCount:mismatches.length,penetrationExamples:penetrations,pass:mismatches.length===0&&penetrations.length===0},null,2));
if(mismatches.length||penetrations.length)process.exitCode=1;
