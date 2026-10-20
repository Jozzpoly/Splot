import {makeCamera,projectPoint,sceneTriangles,trianglesFor,pickPixel,insertElement,removeElement,supportCandidates,clearanceAt} from './spatial-core.mjs';
import {createLiveWorld,getBody,stepLive,toggleGrip,addCrate} from './spatial-sim.mjs';
import {createRenderer} from './render.mjs';
import {createRapierBridge} from './rapier-live.mjs';
import {createBox3DBridge} from './box3d-live.mjs';
import {createPlaytestJournal} from './playtest-journal.mjs';
import {partMotionMode,setBoxMotion} from './part-lifecycle.mjs';
import {crateTriangles} from './crate-visual.mjs';
import {summarizePerfFrames} from './perf-metrics.mjs';
const $=s=>document.querySelector(s),canvas=$('#world'),hud=$('#hud'),toolLabel=$('#active-mode'),message=$('#notice'),buttons=[...document.querySelectorAll('[data-mode]')];
let world=createLiveWorld(),renderer=createRenderer(canvas),mode='move',selection=0,selected=null,startPanel=null,buildHeight=0,buildWidth=2.0,rot=0,zoom=1;
let camTarget=[14.5,14,0],cam=null,last=performance.now(),acc=0,lastHud=0,lastNotice=0,sequence=10,paused=false,frameCount=0;
let bridge=null,rapierLibrary=null,box3dLibrary=null,physicsState='legacy',physicsMessage='';
const researchArgs=new URLSearchParams(location.search);
// Prevent all background stepping while an external WASM module is fetched.
if(['ascent','fall','edit','grip','material','material-stack'].includes(researchArgs.get('probe'))){paused=true;world.paused=true;$('#pause').textContent='Uruchom';}
const box3dOptions={gripLaw:researchArgs.get('griplaw')==='intent-force'?'intent-force':'baseline',actorContact:researchArgs.get('actors')==='compliant'?'compliant':'ghost',boarMode:researchArgs.get('boar')==='responsive'?'responsive':'forage'};
const keys=new Set(),stick={active:null,x:0,y:0},look={id:null,lastX:0};
const paletteColor=e=>e.material||'stone';
const playtest=createPlaytestJournal();
for(const name of ['pointerdown','keydown','wheel']){
 document.addEventListener(name,e=>{
  if(e.isTrusted)playtest.interact(name==='keydown'?'keyboard':name==='wheel'?'wheel':'pointer');
 },{capture:true,passive:true});
}
function refreshMaterialUI(){
 const btn=document.querySelector('[data-mode="material"]');
 const can=physicsState==='box3d'&&!!bridge?.syncStatics;
 btn.disabled=!can;
 btn.title=can?'Wskaż bryłę, aby uwolnić lub zakotwiczyć w bieżącym położeniu':'Dostępne tylko w Box3D R&D';
 if(!can&&mode==='material')setMode('move');
}
function refreshActorContactUI(){
 const btn=$('#actor-contact'),supported=physicsState==='box3d'&&Boolean(bridge?.setActorContactMode);
 btn.disabled=!supported;
 const mode=supported?bridge.actorContactMode:box3dOptions.actorContact;
 btn.textContent=supported?(mode==='compliant'?'Impuls R&D: ON':'Kontakt: swobodny'):'Kontakt: Box3D';
 btn.classList.toggle('active',supported&&mode==='compliant');
}
$('#actor-contact').onclick=()=>{
 if(physicsState!=='box3d'||!bridge?.setActorContactMode)return;
 const next=bridge.actorContactMode==='ghost'?'compliant':'ghost';
 bridge.setActorContactMode(next);box3dOptions.actorContact=next;
 playtest.event('actor-contact-mode',{mode:next});
 actionText(next==='compliant'?
  'Próba impulsu R&D; w testach nadal występuje silne przenikanie. Nie jest to naprawa kolizji.':
  'Swobodne mijanie aktorów — kontrola.');
 refreshActorContactUI();
};
function refreshBoarUI(){
 const btn=$('#boar-behavior'),supported=physicsState==='box3d'&&Boolean(bridge?.setBoarMode);
 btn.disabled=!supported;
 const mode=supported?bridge.boarMode:box3dOptions.boarMode;
 btn.textContent=supported?(mode==='responsive'?'Dzik: reaguje':'Dzik: żeruje'):'Dzik: Box3D';
 btn.classList.toggle('active',supported&&mode==='responsive');
}
$('#boar-behavior').onclick=()=>{
 if(physicsState!=='box3d'||!bridge?.setBoarMode)return;
 const mode=bridge.boarMode==='forage'?'responsive':'forage';
 bridge.setBoarMode(mode);box3dOptions.boarMode=mode;
 playtest.event('boar-behavior-mode',{mode});
 actionText(mode==='responsive'?
  'Dzik reaguje na bliskiego gracza, nie otrzymuje twardej kolizji.':
  'Dzik wraca do jedzenia; przy pokarmie odpoczywa.');
 refreshBoarUI();
};
function updatePlaytestStatus(){
 $('#test-status').textContent=playtest.status({visible:!document.hidden,focused:document.hasFocus()}).label;
}
$('#test-toggle').onclick=()=>{
 if(playtest.recording){
  playtest.stop();$('#test-toggle').textContent='Nowy test';
  actionText('Lokalny test zakończony. Raport pozostaje w tej karcie.');
 }else{
  playtest.start({engine:physicsState,scenario:researchArgs.get('probe')?'automated-probe':'free-play'});
  $('#test-toggle').textContent='Zakończ test';
  actionText('Rejestrowanie włączone tylko w tej karcie. Bez wysyłania danych.');
 }
 $('#test-export').disabled=false;updatePlaytestStatus();
};
$('#test-export').onclick=()=>{
 const report=playtest.report(),blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
 const link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download='Splot_Sesja_Badawcza.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
};
const actionText=t=>{message.textContent=t;message.classList.add('show');lastNotice=performance.now()};
function setMode(m){if(m==='material'&&physicsState!=='box3d'){actionText('Uwalnianie brył wymaga Box3D R&D.');return;}playtest.event('tool',{mode:m});mode=m;startPanel=null;selection=0;selected=null;toolLabel.textContent=({move:'Ruch i kontakt',panel:'Rysuj belkę / płytę',box:'Postaw bryłę',crate:'Postaw skrzynię',erase:'Usuń wskazaną część',material:'Kotwica / uwolnij bryłę'}[m]||m);document.body.classList.remove('menu-open');
 for(const b of buttons)b.classList.toggle('active',b.dataset.mode===m);
}
for(const b of buttons)b.addEventListener('click',()=>setMode(b.dataset.mode));
$('#mobile-menu').onclick=()=>document.body.classList.toggle('menu-open');$('#active-mode').onclick=()=>setMode('move');
const rotate=d=>{rot+=d;actionText('Kamera · obrót '+Math.round(rot*180/Math.PI)+'°')};
$('#turn-left').onclick=()=>rotate(-Math.PI/6);$('#turn-right').onclick=()=>rotate(Math.PI/6);
$('#pause').onclick=()=>{paused=!paused;world.paused=paused;$('#pause').textContent=paused?'Uruchom':'Pauza'};
$('#grip').onclick=()=>{const r=toggleGrip(world);playtest.event('grip-action',{ok:r.ok,gripped:r.gripped??null});actionText(r.ok?(r.gripped?'Trzymasz skrzynię.':'Puściłeś skrzynię.'): 'Poza zasięgiem lub inną wysokością.')};
$('#height').onclick=()=>{const a=[0,1.2,2.4,3.6],i=a.indexOf(buildHeight);buildHeight=a[(i+1)%a.length];$('#height').textContent='Podnieś: +'+buildHeight.toFixed(1)+' m';};
$('#width').onclick=()=>{buildWidth=buildWidth===2?3:buildWidth===3?1.2:2;$('#width').textContent='Szer.: '+buildWidth+' m';};
$('#layer').onclick=()=>{selection++;refreshSelection();};
$('#reset').onclick=()=>{playtest.event('reset',{engine:physicsState});bridge?.dispose?.();if(bridge?.engine?.free)bridge.engine.free();bridge=null;world=createLiveWorld();
 try{if(rapierLibrary&&physicsState==='rapier')bridge=createRapierBridge(world,rapierLibrary);
  if(box3dLibrary&&physicsState==='box3d')bridge=createBox3DBridge(world,box3dLibrary,box3dOptions);
 }catch(e){bridge=null;physicsState='legacy-fallback';physicsMessage='Physics reset failed: '+e.message;}
 camTarget=[14.5,14,0];paused=false;world.paused=false;$('#pause').textContent='Pauza';setMode('move');refreshActorContactUI();refreshBoarUI();refreshMaterialUI();actionText('Świat odtworzony · fizyka '+physicsState+'.')};
$('#save').onclick=()=>{const state={format:'splot-next-live-research-1',scene:world.scene,bodies:world.bodies,time:world.time};
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download='Splot_Nowy_Rozdzial.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
};
function cursorPos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.x)/r.width*canvas.width,y:(e.clientY-r.y)/r.height*canvas.height};}
let cursor=null;
function refreshSelection(){if(!cam||!cursor)return;const hits=pickPixel(world.scene,cam,cursor.x,cursor.y);
 selected=hits.length?hits[selection%hits.length]:null;
 const a=selected;$('#target').textContent=a?`${a.id} • ${a.point[2].toFixed(2)} m • warstwa ${selection%hits.length+1}/${hits.length}`:'Brak powierzchni pod kursorem';
}
function clickWorld(p){cursor=p;refreshSelection();const a=selected;
 if(mode==='move')return;
 if(!a){actionText('Nie wskazano fizycznej powierzchni.');return;}
 if(mode==='panel'){
  const xyz=[...a.point];xyz[2]+=buildHeight;
  if(!startPanel){startPanel=xyz;actionText('Pierwszy koniec ustawiony. Wskaż drugi punkt.');return;}
  const e={id:'part-'+sequence++,kind:'panel',a:startPanel,b:xyz,width:buildWidth,thickness:.26,material:'wood'};
  const result=insertElement(world.scene,e);playtest.event('build-panel',{ok:result.ok,id:e.id});startPanel=null;
  actionText(result.ok?'Powstał niezależny element XYZ.':'Odmowa: '+result.reason);return;
 }
 if(mode==='box'){
  const [x,y,z]=a.point,r=insertElement(world.scene,{id:'block-'+sequence++,kind:'box',min:[x-.6,y-.6,z+buildHeight],max:[x+.6,y+.6,z+buildHeight+1.1],material:'stone'});
  playtest.event('build-box',{ok:r.ok,reason:r.reason??null});actionText(r.ok?'Bryła ma rzeczywisty obrys, kontakt i powierzchnię.':'Odmowa: '+r.reason);return;
 }
 if(mode==='material'){
  if(!bridge?.syncStatics){actionText('Fizyka części wymaga aktywnego Box3D.');return;}
  const e=world.scene.elements.find(x=>x.id===a.id);
  if(!e||e.kind!=='box'){
   actionText('Na tym etapie można uwolnić tylko bryłę. Płyty wymagają modelu rotacji i momentu.');return;
  }
  const old=partMotionMode(e),next=old==='dynamic'?'anchored':'dynamic';
  const r=setBoxMotion(world.scene,e.id,next);
  if(r.ok){bridge.syncStatics();playtest.event('part-motion-change',{id:e.id,from:old,to:next});
   actionText(next==='dynamic'?'Uwolniono bryłę. Box3D prowadzi grawitację i kontakt; obrót jest świadomie zablokowany.':
    'Zakotwiczono bryłę w aktualnym miejscu.');}
  else actionText('Błąd zmiany stanu: '+r.reason);
  return;
 }
 if(mode==='crate'){const r=addCrate(world,a.point[0],a.point[1],a.point[2]);playtest.event('build-crate',{ok:r.ok,reason:r.reason??null});actionText(r.ok?'Nowa skrzynia w świecie.':'Odmowa: '+r.reason);return;}
 if(mode==='erase'){
  if(a.id==='ground'){actionText('Grunt nie jest elementem edytora.');return;}
  const r=removeElement(world.scene,a.id);playtest.event('delete-part',{ok:r.ok,id:a.id});
  actionText(r.ok?'Element usunięty; ciała zareagują na utratę podparcia.':'Odmowa: '+r.reason);
 }
}
canvas.addEventListener('pointermove',e=>{
 if(look.id===e.pointerId){rotate((e.clientX-look.lastX)*.009);look.lastX=e.clientX;return;}
 if(mode!=='move'){cursor=cursorPos(e);refreshSelection();}
});
canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(e.button===2){look.id=e.pointerId;look.lastX=e.clientX;canvas.setPointerCapture(e.pointerId);return;}
 clickWorld(cursorPos(e));});
canvas.addEventListener('pointerup',e=>{if(look.id===e.pointerId)look.id=null;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(2.3,zoom*(e.deltaY<0?1.09:.91)));},{passive:false});
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab'].includes(k))e.preventDefault();
 if(e.repeat&&['e','q','z','x','v','p','r','1','2','3','4','5',' '].includes(k))return;
 if(k==='e')$('#grip').click();else if(k==='q')$('#layer').click();
 else if(k==='z')$('#turn-left').click();else if(k==='x')$('#turn-right').click();
 else if(k===' '){$('#pause').click()}else if(k==='r')$('#reset').click();
 else if('123456'.includes(k))setMode(['move','panel','box','crate','erase','material'][Number(k)-1]);
 else keys.add(k);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();stick.active=null;stick.x=stick.y=0;});
const joystick=$('#joystick'),knob=$('#knob');
function stickMove(e){const r=joystick.getBoundingClientRect(),x=e.clientX-r.x-r.width/2,y=e.clientY-r.y-r.height/2;
 const max=r.width*.34,dist=Math.hypot(x,y),k=dist>max?max/dist:1;
 stick.x=x*k/max;stick.y=-y*k/max;knob.style.transform=`translate(${x*k}px,${y*k}px)`;}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();if(stick.active!==null)return;stick.active=e.pointerId;joystick.setPointerCapture(e.pointerId);stickMove(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stick.active)stickMove(e)});
for(const n of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(n,e=>{if(e.pointerId===stick.active){stick.active=null;stick.x=stick.y=0;knob.style.transform='translate(0,0)';}});
const rand=i=>{let k=Math.imul(i^0x51f15,2246822519);k=Math.imul(k^(k>>>13),3266489917);return ((k^(k>>>16))>>>0)/4294967295;};
function tri(a,b,c,material){const v=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
 const n=[v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],v[0]*w[1]-v[1]*w[0]];
 const len=Math.hypot(...n)||1;return {a,b,c,normal:n.map(x=>x/len),material};}
const quad=(a,b,c,d,material)=>[tri(a,b,c,material),tri(a,c,d,material)];
function groundMesh(){const result=[];
 result.push(...quad([0,0,-.012],[42,0,-.012],[42,32,-.012],[0,32,-.012],'soil'));
 for(let i=0;i<170;i++){
  const x=rand(i*7+4)*41+.5,y=rand(i*13+11)*31+.5,w=.2+.5*rand(i*37),l=.16+.35*rand(i*29),z=.006+i*.000001;
  result.push(...quad([x-w,y-l,z],[x+w,y-l,z],[x+w,y+l,z],[x-w,y+l,z],i%3?'leaf':'soil'));
 }
 // Repeated chips create material texture and local orientation, not fake physics.
 for(let i=0;i<70;i++){
  const x=12+rand(i*17)*20,y=12+rand(i*47)*8,z=.017;
  result.push(...quad([x,y,z],[x+.13,y,z],[x+.13,y+.05,z],[x,y+.05,z],'stone'));
 }
 return result;
}
const floorGeometry=groundMesh();
function box(x,y,z,rx,ry,h,material){return trianglesFor({kind:'box',id:'visual-body',min:[x-rx,y-ry,z],max:[x+rx,y+ry,z+h]}).map(t=>({...t,material}));}
function actorsMesh(){let out=[];
 for(const b of world.bodies){
  if(b.kind==='crate'){
   out.push(...crateTriangles(b));
  }else if(b.kind==='boar'){
   out.push(...box(b.x,b.y,b.z+.15,.42,.3,.55,'boar'));
   out.push(...box(b.x+.32,b.y,b.z+.25,.25,.24,.28,'skin'));
   out.push(...box(b.x-.26,b.y-.23,b.z,.1,.08,.25,'boar'),...box(b.x+.25,b.y+.23,b.z,.1,.08,.25,'boar'));
  }else{
   out.push(...box(b.x,b.y,b.z,.24,.23,.92,'player'));
   out.push(...box(b.x,b.y,b.z+1.00,.19,.19,.44,'skin'));
   out.push(...box(b.x-.14,b.y,b.z,.095,.11,.45,'stone'),...box(b.x+.14,b.y,b.z,.095,.11,.45,'stone'));
  }
 }
 // Food is gameplay stimulus; do not multiply diagnostic icons.
 out.push(...box(world.food.x,world.food.y,world.food.z,.20,.20,.25,'leaf'));
 return out;
}
function renderOverlay(cam){const ctx=$('#overlay').getContext('2d'),w=$('#overlay').width,h=$('#overlay').height;
 ctx.clearRect(0,0,w,h);
 if(selected&&mode!=='move'){const p=projectPoint(cam,selected.point),k=$('#overlay').width/cam.width;
  ctx.beginPath();ctx.arc(p.x*k,p.y*k,9*k,0,Math.PI*2);ctx.strokeStyle='#ffd59e';ctx.lineWidth=2*k;ctx.stroke();
 }
 if(startPanel){const p=projectPoint(cam,startPanel),k=$('#overlay').width/cam.width;ctx.beginPath();ctx.arc(p.x*k,p.y*k,7*k,0,Math.PI*2);ctx.strokeStyle='#d6e3bf';ctx.stroke();}
}
function viewport(){const r=canvas.getBoundingClientRect(),gl=renderer.mode==='webgl-depth';const ratio=gl?Math.min(window.devicePixelRatio||1,2):Math.min(.75,Math.max(.46,.70/(Math.max(1,(r.width*r.height)/(970*700)))));
 const w=Math.max(100,Math.round(r.width*ratio)),h=Math.max(100,Math.round(r.height*ratio));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const overlay=$('#overlay'),dpr=window.devicePixelRatio||1;
 if(overlay.width!==Math.round(r.width*dpr)||overlay.height!==Math.round(r.height*dpr)){overlay.width=Math.round(r.width*dpr);overlay.height=Math.round(r.height*dpr);}
 return {width:w,height:h,pixelsPerMeter:(r.height>r.width*1.15?Math.max(w/17,h/26):Math.min(w/28,h/18))*zoom};
}
function keyDirection(){let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
 let dy=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
 if(!dx&&!dy){dx=stick.x;dy=stick.y;}if(!cam)return [0,0];
 const right=cam.right,up=cam.up;let vx=right[0]*dx+up[0]*dy,vy=right[1]*dx+up[1]*dy;
 const len=Math.hypot(vx,vy),power=Math.min(1,Math.hypot(dx,dy));return len?[vx/len*power,vy/len*power]:[0,0];
}
// Read-only rolling diagnostic. Rendering cost measures CPU submission;
// rAF frame spacing is not a GPU timestamp and not an isolated physics rate.
const frameMetrics=[];let prevMetricFrame=0,latestPerf=null;
function profile(){return {...summarizePerfFrames(frameMetrics),renderer:renderer.mode};}
function frame(t){
 const rafMs=prevMetricFrame?t-prevMetricFrame:NaN;prevMetricFrame=t;
 let elapsed=Math.min(.08,(t-last)/1000);last=t;acc+=elapsed;
 const info=viewport(),p=getBody(world,'human');
 camTarget[0]+=(p.x-camTarget[0])*.16;camTarget[1]+=(p.y-camTarget[1])*.16;camTarget[2]+=(p.z+.7-camTarget[2])*.10;
 cam=makeCamera({target:camTarget,azimuth:rot,elevation:1.03,...info});
 const physicsStart=performance.now();
 let physicsSteps=0;
 if(!paused){let iter=0;while(acc>=1/60&&iter<4){
  if(bridge)bridge.advance(1/60,keyDirection());else stepLive(world,1/60,keyDirection());
  acc-=1/60;iter++;physicsSteps++;}}
 else {acc=0;if(bridge){bridge.syncStatics();bridge.syncBodies();}}
 const simulationCpuMs=performance.now()-physicsStart;
 const geometryStart=performance.now();
 const tris=floorGeometry.concat(sceneTriangles(world.scene).map(t=>({...t,material:paletteColor(world.scene.elements.find(x=>x.id===t.owner)||{})})),actorsMesh());
 const geometryCpuMs=performance.now()-geometryStart;
 const drawStart=performance.now();
 renderer.render(tris,cam);renderOverlay(cam);
 const drawSubmissionCpuMs=performance.now()-drawStart;
 frameMetrics.push({rafMs,physicsSteps,simulationCpuMs,geometryCpuMs,drawSubmissionCpuMs,triangles:tris.length});
 if(frameMetrics.length>180)frameMetrics.shift();
 // Profile is derived twice per second, not sorted once per render frame.
 if(t-lastHud>260)latestPerf=profile();
 playtest.observe(world,{engine:physicsState,camera:cam,performance:latestPerf});
 if(t-lastHud>260){
  updatePlaytestStatus();const a=getBody(world,'human');
  const debug=researchArgs.get('perf')==='1',m=latestPerf;
  const suffix=debug&&m?` · physics ${m.physics.cpuMsPerStep?.toFixed(2)??'n/a'} ms/krok (${m.physics.steps} kroków) · geometry ${m.geometryCpuMs.median?.toFixed(1)} ms/kl · submit ${m.drawSubmissionCpuMs.median?.toFixed(1)} ms/kl · rAF ${m.rafMs.median?.toFixed(1)} ms`:'';
  hud.textContent=`Z ${a.z.toFixed(2)} m · ${a.support??'spadanie'} · ${renderer.mode} · ${physicsState} · ${world.scene.elements.length} części${suffix}`;
  if(t-lastNotice>2900&&!researchArgs.get('probe'))message.classList.remove('show');lastHud=t;}
 frameCount++;requestAnimationFrame(frame);
}
setMode('move');actionText('Splot Next: ruszaj, pchaj, chwytaj, konstruuj. Wszystko w tej samej przestrzeni XYZ.');
async function startPhysicsChallenger(){
 const choice=researchArgs.get('physics');
 if(choice!=='rapier'&&choice!=='box3d')return;
 physicsState='loading-'+choice;actionText('Ładowanie '+choice+' · badawcza fizyka, ta sama gra.');
 try{
  if(choice==='rapier'){
   const module=await import('https://esm.sh/@dimforge/rapier3d-compat@0.21.0?bundle');
   const R=module.default||module;if(typeof R.init==='function')await R.init();
   rapierLibrary=R;bridge=createRapierBridge(world,R);
  }else{
   const module=await import('https://esm.sh/box3d.js@0.1.1/inline?bundle');
   if(typeof module.default!=='function')throw Error('Box3D inline initializer unavailable');
   box3dLibrary=await module.default();
   bridge=createBox3DBridge(world,box3dLibrary,box3dOptions);
  }
  physicsState=choice;
  refreshActorContactUI();refreshBoarUI();refreshMaterialUI();
  actionText(choice+' aktywny · kontakt R&D, ten sam renderer/edytor. Nie jest to zatwierdzony solver.');
  const probe=researchArgs.get('probe');
  if(['ascent','fall','edit','grip','material','material-stack'].includes(probe)){
   bridge?.dispose?.();if(bridge?.engine?.free)bridge.engine.free();
   world=createLiveWorld(); // identical deterministic setup for every backend
   const human=getBody(world,'human'),crate=getBody(world,'crate-1');
   if(probe==='ascent')Object.assign(human,{x:12,y:13,z:0,support:'ground'});
   if(probe==='fall')Object.assign(human,{x:23,y:13,z:2.4,support:'footbridge-deck'});
   if(probe==='grip')Object.assign(human,{x:15.28,y:15.2,z:0,support:'ground'});
   bridge=choice==='rapier'?createRapierBridge(world,rapierLibrary):createBox3DBridge(world,box3dLibrary,box3dOptions);
   world.paused=false;
   let ok=false,detail='';
   if(probe==='material-stack'){
    if(choice==='box3d'){
     // Falsifies a falling-only "success": one player-authored object
     // must support another, then lose that support when removed.
     const baseId='stack-base',topId='stack-top';
     const lower=insertElement(world.scene,{id:baseId,kind:'box',
      min:[9,6,1],max:[10.2,7.2,2],material:'stone'});
     const upper=insertElement(world.scene,{id:topId,kind:'box',
      min:[9,6,4],max:[10.2,7.2,5.1],material:'wood'});
     bridge.syncStatics();
     for(let i=0;i<30;i++)bridge.advance(1/60,[0,0]);
     const up=setBoxMotion(world.scene,topId,'dynamic');bridge.syncStatics();
     for(let i=0;i<180;i++)bridge.advance(1/60,[0,0]);
     const held=world.scene.elements.find(e=>e.id===topId),onBase=held?.min[2];
     const removed=removeElement(world.scene,baseId);bridge.syncStatics();
     for(let i=0;i<180;i++)bridge.advance(1/60,[0,0]);
     const falling=world.scene.elements.find(e=>e.id===topId),onGround=falling?.min[2];
     const groundedSupport=supportCandidates(world.scene,9.6,6.6)
      .some(h=>h.id===topId&&Math.abs(h.z-1.1)<.12);
     const stop=setBoxMotion(world.scene,topId,'anchored');bridge.syncStatics();
     const fixedBottom=world.scene.elements.find(e=>e.id===topId)?.min[2];
     for(let i=0;i<60;i++)bridge.advance(1/60,[0,0]);
     const finalBottom=world.scene.elements.find(e=>e.id===topId)?.min[2];
     ok=lower.ok&&upper.ok&&up.ok&&removed.ok&&stop.ok&&
      Math.abs(onBase-2)<.12&&Math.abs(onGround)<.12&&
      groundedSupport&&Math.abs(fixedBottom-finalBottom)<.02;
     detail='stack-top-on-base='+onBase?.toFixed(2)+
      ' after-support-removal='+onGround?.toFixed(2)+
      ' reanchor='+finalBottom?.toFixed(2)+
      ' shared-support-query='+groundedSupport;
    }else{ok=false;detail='material-stack unsupported by Rapier';}
   }else if(probe==='material'){
    if(choice==='box3d'){
     const id='research-falling-block';
     insertElement(world.scene,{id,kind:'box',min:[9,6,4],max:[10.2,7.2,5.1],material:'wood'});
     bridge.syncStatics();
     for(let i=0;i<60;i++)bridge.advance(1/60,[0,0]);
     const initial=world.scene.elements.find(e=>e.id===id),stationary=initial?.min[2];
     const oldRevision=world.scene.revision;
     const released=setBoxMotion(world.scene,id,'dynamic');bridge.syncStatics();
     const editRevision=world.scene.revision;
     for(let i=0;i<180;i++)bridge.advance(1/60,[0,0]);
     const moved=world.scene.elements.find(e=>e.id===id);
     const bottom=moved?.min[2],stableId=moved?.id===id;
     const postPhysicsRevision=world.scene.revision;
     const anchored=setBoxMotion(world.scene,id,'anchored');bridge.syncStatics();
     const anchoredBottom=world.scene.elements.find(e=>e.id===id)?.min[2];
     for(let i=0;i<60;i++)bridge.advance(1/60,[0,0]);
     const finalBottom=world.scene.elements.find(e=>e.id===id)?.min[2];
     ok=released.ok&&anchored.ok&&stableId&&Math.abs(stationary-4)<.001&&
      Math.abs(bottom)<.10&&Math.abs(anchoredBottom-finalBottom)<.02&&
      editRevision===oldRevision+1&&postPhysicsRevision===editRevision;
     detail='static-z='+stationary?.toFixed(2)+' fall-z='+bottom?.toFixed(2)+
      ' reanchor-z='+finalBottom?.toFixed(2)+' id='+stableId+' auth-revision='+postPhysicsRevision;
    }else{ok=false;detail='material lifecycle unsupported by Rapier';}
   }else if(probe==='ascent'){
    for(let i=0;i<225;i++)bridge.advance(1/60,[1,0]);
    ok=human.x>19&&human.z>1.8;
    detail='ramp→deck / x='+human.x.toFixed(2)+' z='+human.z.toFixed(2)+' support='+human.support;
   }else if(probe==='fall'){
    removeElement(world.scene,'footbridge-deck');
    for(let i=0;i<140;i++)bridge.advance(1/60,[0,0]);
    ok=human.z<.2&&human.support==='ground';
    detail='support removal / z='+human.z.toFixed(2)+' support='+human.support;
   }else if(probe==='edit'){
    const part={id:'probe-overlap',kind:'box',
     min:[human.x-.4,human.y-.4,0],max:[human.x+.4,human.y+.4,1.3],material:'stone'};
    const placed=insertElement(world.scene,part);
    bridge.syncStatics();bridge.advance(1/60,[0,0]);
    const q=clearanceAt(world.scene,{x:human.x,y:human.y,z:human.z,r:human.r,h:human.h,supportId:human.support});
    ok=placed.ok&&q.free&&world.events.some(e=>e.type==='authoring-contact-resolved');
    detail='authoring / clearance='+q.free+' events='+world.events.at(-1)?.type;
   }else if(probe==='grip'){
    const grabbed=toggleGrip(world),before=crate.x;let maxGap=0,releaseAt=-1;
    for(let i=0;i<100;i++){bridge.advance(1/60,[1,0]);
     const gap=Math.hypot(human.x-crate.x,human.y-crate.y);
     if(world.grip==='crate-1')maxGap=Math.max(maxGap,gap);
     else if(releaseAt<0)releaseAt=i;}
    ok=grabbed.ok&&human.x>18.5&&crate.x>before+1.8&&world.grip==='crate-1'&&maxGap<1.9;
    detail='grip / human='+human.x.toFixed(2)+' crate='+crate.x.toFixed(2)+' held-max-gap='+maxGap.toFixed(2)+' released-at='+releaseAt;
   }
   paused=true;world.paused=true;
   physicsMessage=(ok?'PASS':'FAIL')+' / '+choice+' / '+detail;actionText(physicsMessage);
  }
 }catch(err){
  bridge?.dispose?.();bridge=null;physicsState='legacy-fallback';refreshActorContactUI();refreshBoarUI();refreshMaterialUI();
  physicsMessage=String(err?.stack||err);
  actionText(choice+' nieudany; fallback to legacy. '+physicsMessage.slice(0,130));
 }
}
refreshActorContactUI();refreshBoarUI();refreshMaterialUI();requestAnimationFrame(frame);void startPhysicsChallenger();
window.__splotNext={get world(){return world},get renderer(){return renderer.mode},get mode(){return mode},get camera(){return cam},get physics(){return physicsState},get physicsMessage(){return physicsMessage},get challenger(){return bridge},get playtest(){return {status:playtest.status({visible:!document.hidden,focused:document.hasFocus()}),report:playtest.report()}},get errors(){return []},profile,clearProfile:()=>{frameMetrics.length=0;prevMetricFrame=0},setMode,partMotion:(id,action)=>{if(physicsState!=='box3d'||!bridge)return {ok:false,reason:'box3d-only'};const r=setBoxMotion(world.scene,id,action);if(r.ok)bridge.syncStatics();return r},reset:()=>$('#reset').click(),pause:()=>$('#pause').click(),step:(n,dir=[0,0])=>{for(let i=0;i<n;i++){if(bridge)bridge.advance(1/60,dir);else stepLive(world,1/60,dir)}},build:(element)=>insertElement(world.scene,element)};
