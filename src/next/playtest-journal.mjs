// Splot research: local-only observation, never networked.
// A user's explicit session toggle authorizes storing a bounded interaction
// trace in THIS TAB ONLY. Inferred activity != identity or availability.
// Untrusted/programmatic events may resemble input: report as "UI input".
export function createPlaytestJournal({clock=()=>performance.now(),iso=()=>new Date().toISOString()}={}){
 let recording=false,startedAt=null,endedAt=null,startedMs=0;
 let lastInput=-Infinity,lastInputEvent=-Infinity,lastSample=-Infinity;
 let previousWorld=null,eventOffset=0,wasNear=false,nearPasses=0;
 const entries=[];const cap=1500;
 const num=(x)=>Number.isFinite(x)?Math.round(x*100)/100:null;
 function append(type,data={}){
  if(!recording)return;
  entries.push({sec:num((clock()-startedMs)/1000),type,data});
  if(entries.length>cap)entries.shift();
 }
 function interact(kind){
  lastInput=clock();
  if(recording&&lastInput-lastInputEvent>800){
   append('ui-input',{kind});lastInputEvent=lastInput;
  }
 }
 function start({engine='unknown',scenario='live'}={}){
  if(recording)return false;
  recording=true;startedAt=iso();endedAt=null;startedMs=clock();
  lastInputEvent=-Infinity;lastSample=-Infinity;
  previousWorld=null;eventOffset=0;wasNear=false;nearPasses=0;entries.length=0;
  append('session-start',{engine,scenario});
  return true;
 }
 function stop(){
  if(!recording)return false;
  append('session-stop');recording=false;endedAt=iso();
  return true;
 }
 function event(type,data={}){
  // Only compact, self-authored signals; never raw pointer paths or key values.
  append(type,data);
 }
 function observe(world,{engine='unknown'}={}){
  if(!recording||!world)return;
  if(world!==previousWorld){
   previousWorld=world;eventOffset=0;wasNear=false;
   append('world-reset',{parts:world.scene?.elements?.length??0,engine});
  }
  const events=world.events||[];
  if(eventOffset>events.length)eventOffset=0;
  for(const e of events.slice(eventOffset)){
   append('world-event',{kind:String(e.type||'unknown'),id:e.id??null,
    reason:e.reason??null,on:e.on??null});
  }
  eventOffset=events.length;
  if(clock()-lastSample<500)return;
  lastSample=clock();
  const human=world.bodies?.find(b=>b.id==='human');
  const boar=world.bodies?.find(b=>b.id==='boar');
  const crate=world.bodies?.find(b=>b.id==='crate-1');
  if(!human)return;
  const point=b=>b?{x:num(b.x),y:num(b.y),z:num(b.z)}:null;
  let boarGap=null;
  if(boar){
   const planar=Math.hypot(human.x-boar.x,human.y-boar.y);
   const vertical=human.z<boar.z+boar.h&&boar.z<human.z+human.h;
   boarGap=vertical?num(planar-human.r-boar.r):null;
   const near=vertical&&planar<human.r+boar.r+.1;
   if(near&&!wasNear){
    nearPasses++;
    append('actor-proximity',{gap:boarGap,engine});
   }
   wasNear=near;
  }
  append('sample',{engine,t:num(world.time),player:point(human),boar:point(boar),
   crate:point(crate),boarSurfaceGap:boarGap,grip:world.grip??null,
   parts:world.scene?.elements?.length??0});
 }
 function status({visible=true,focused=true}={}){
  const ago=clock()-lastInput;
  const activity=Number.isFinite(ago)&&ago<30000?'interakcje w ostatnich 30 s':
   Number.isFinite(ago)?'brak świeżych interakcji':'bez zaobserwowanego wejścia';
  return {recording,activity,secondsSinceInput:Number.isFinite(ago)?Math.floor(ago/1000):null,
   pageVisible:visible,pageFocused:focused,nearPasses,events:entries.length,
   // These are page signals, not a claim that the Owner is busy or present.
   label:(recording?'Test rejestrowany':'Test niezarejestrowany')+' · '+activity+
    (visible?' · karta widoczna':' · karta w tle')};
 }
 function report(){
  return {format:'splot-playtest-local-v1',source:'Splot Next',startedAt,endedAt,
   inProgress:recording,summary:{nearPasses,eventCount:entries.length},
   caveats:['Local browser events do not establish user identity or attention',
    'Sampled actor proximity is not proof of collision or physical impulse',
    'No telemetry is uploaded automatically'],events:entries.map(e=>({...e}))};
 }
 return {interact,start,stop,event,observe,status,report,get recording(){return recording}};
}
