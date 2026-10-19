// Research-only evidence generator. NEVER interpret green test status as proof
// that a surface graph, perception system or multi-body dynamics exists.
import {createWorld, getBody, placeScaffold, surfaces, raycast,
  bodyConflicts, walk, gravityStep, tickWorld} from '../src/world.mjs';

function stacked(height=1.8) {
 const w=createWorld();const edited=placeScaffold(w,17,15,{turns:0,height});
 if(!edited.ok)throw Error(`fixture invalid: ${JSON.stringify(edited)}`);
 const p=w.constructions[1],x=(p.ax+p.bx)/2,y=(p.ay+p.by)/2;
 const b=getBody(w,'boar'),human=getBody(w,'scout');
 Object.assign(b,{x,y,z:0,support:'ground',vz:0});
 Object.assign(human,{x,y,z:height,support:p.id,vz:0});
 w.goal={id:'food',x,y,z:height,eaten:false};
 const facts={height,xy:{x,y},surfaces:surfaces(w,x,y),
  lowerUpperBodyOverlap:bodyConflicts(w,b).includes('scout')||bodyConflicts(w,human).includes('boar'),
  ray:raycast(w,{x,y,z:height+.75},{x,y,z:.75},{ignore:w.bodies.map(b=>b.id)})?.id??null};
 for(let i=0;i<600;i++)tickWorld(w,{ai:true});
 facts.after={boarSupport:b.support,boarHeight:b.z,boarPosition:[b.x,b.y],goalEaten:w.goal.eaten,
  flatPlannerExecutions:w.stats.routes,remainingFlatWaypoints:w.nav.path.length};
 return facts;
}
function slopeBody(kind,height){
 const w=createWorld(),res=placeScaffold(w,17,15,{height});if(!res.ok)throw Error('invalid slope fixture');
 const b=getBody(w,kind);Object.assign(b,{x:16.6,y:15,z:0,support:'ground'});
 let firstBlock=null;
 for(let i=0;i<90;i++){
  const q=walk(w,kind,.075,0,{emit:false});gravityStep(w);
  if(q.blocked&&firstBlock===null)firstBlock={step:i,x:b.x,z:b.z,support:b.support};
 }
 return {kind,height,platformReached:b.support===w.constructions[1].id,
  position:{x:b.x,z:b.z,support:b.support},firstBlock};
}
const observations={kind:'research-diagnostic-not-product-pass',
 note:'World physical queries and flat AI navigation have different capabilities. These are controlled configurations, not Owner gameplay measurements.',
 stacked:[stacked(1.2),stacked(1.8),stacked(2.6)],
 locomotion:[...['player','boar'].flatMap(kind=>[1.2,1.8,2.2,2.6,3.0].map(h=>slopeBody(kind,h)))]};
console.log(JSON.stringify(observations,null,2));
