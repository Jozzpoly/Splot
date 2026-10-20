// Splot R&D: tiny local causal behavior, not an NPC architecture.
// No physics ownership; only chooses a desired movement direction.
// Existing food-seeking behavior stays the default (forage).
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const normalized=(x,y)=>{const d=Math.hypot(x,y);return d>1e-7?[x/d,y/d]:[0,0];};
export function createBoarIntent({mode='forage'}={}){
 if(!['forage','responsive'].includes(mode))throw Error('unsupported boar mode');
 let selected=mode,phase='travel',alertUntil=-Infinity;
 let transitions=0;
 function choose({boar,player,food,time=0}){
  if(!boar||!food)throw Error('boar and food required');
  const foodDistance=dist(boar,food);
  const vertical=player&&boar.z<player.z+player.h&&player.z<boar.z+boar.h;
  const playerDistance=vertical?dist(boar,player):Infinity;
  let next;
  if(selected==='responsive'){
   const trigger=playerDistance<2.4;
   const maintain=(phase==='wary'&&playerDistance<3.3&&time<alertUntil+5);
   if(trigger||maintain){
    alertUntil=Math.max(alertUntil,trigger?time+1.0:alertUntil);
    next='wary';
   }else next=foodDistance>.8?'travel':'feeding';
  }else next=foodDistance>.8?'travel':'feeding';
  const changed=phase!==next;
  if(changed){phase=next;transitions++;}
  let dir=[0,0];
  if(next==='travel')dir=normalized(food.x-boar.x,food.y-boar.y);
  if(next==='wary'){
   let dx=boar.x-player.x,dy=boar.y-player.y;
   if(Math.hypot(dx,dy)<1e-7){
    dx=boar.x-food.x;dy=boar.y-food.y;
    if(Math.hypot(dx,dy)<1e-7){dx=1;dy=0;}
   }
   dir=normalized(dx,dy);
  }
  return {dir,phase,changed,goal:next==='wary'?'distance-from-player':'food',
   playerDistance:Number.isFinite(playerDistance)?playerDistance:null,
   foodDistance,transitions};
 }
 return {choose,setMode(next){
  if(!['forage','responsive'].includes(next))throw Error('unsupported boar mode');
  selected=next;phase='travel';alertUntil=-Infinity;
 },get mode(){return selected},get phase(){return phase}};
}
