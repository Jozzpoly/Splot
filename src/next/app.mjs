import {makeCamera,projectPoint,sceneTriangles,trianglesFor,pickPixel,insertElement,removeElement,supportCandidates,clearanceAt,occlusionToPoint} from './spatial-core.mjs';
import {createLiveWorld,getBody,stepLive,toggleGrip,addCrate} from './spatial-sim.mjs';
import {createRenderer} from './render.mjs';
import {createRapierBridge} from './rapier-live.mjs';
import {createBox3DBridge} from './box3d-live.mjs';
import {createPlaytestJournal} from './playtest-journal.mjs';
import {partMotionMode,setBoxMotion} from './part-lifecycle.mjs';
import {crateTriangles,crateTopHits,crateSurfaceHits} from './crate-visual.mjs';
import {summarizePerfFrames} from './perf-metrics.mjs';
import {restoreResearchWorld,nextAuthoringSequence} from './scene-restore.mjs';
import {createEditHistory,translatedElement,screenOnHeightPlane,uniquePartHits} from './authoring-editor.mjs';
import {advanceCameraTarget} from './camera-timing.mjs';
import {createSceneVisualCache} from './scene-visual-cache.mjs';
const $=s=>document.querySelector(s),canvas=$('#world'),hud=$('#hud'),toolLabel=$('#active-mode'),message=$('#notice'),buttons=[...document.querySelectorAll('[data-mode]')];
let world=createLiveWorld(),renderer=createRenderer(canvas),mode='move',selection=0,selected=null,startPanel=null,buildHeight=0,buildWidth=2.0,rot=0,pitch=1.03,zoom=1,renderScale=1;
let camTarget=[14.5,14,0],cam=null,last=performance.now(),acc=0,lastHud=0,lastNotice=0,sequence=10,paused=false,frameCount=0;
let bridge=null,rapierLibrary=null,box3dLibrary=null,physicsState='legacy',physicsMessage='';
const editHistory=createEditHistory(256);let editSelectedId=null,editDrag=null; // bounded per-intent snapshots: Owner-scale creator sessions
const sceneVisual=createSceneVisualCache({exteriorBoxes:new URLSearchParams(location.search).get('faces')==='exterior-boxes',
 plankSeams:new URLSearchParams(location.search).get('surfaces')==='planks'});
const researchArgs=new URLSearchParams(location.search);
renderScale=researchArgs.get('pixels')==='50'?.5:researchArgs.get('pixels')==='75'?.75:1;
const engineState=$('#engine-state');
const showEngine=(kind,label)=>{engineState.dataset.state=kind;engineState.textContent=label;};
const facingActors=researchArgs.get('actorvisual')==='facing'; // R&D presentation only
const timeCamera=researchArgs.get('camera')==='seconds'; // explicit A/B, legacy default
const ownPresenceExperiment=researchArgs.get('visibility')==='player-occlusion'; // R&D only, never default
let lastPresenceProbe=-Infinity,presenceInfo=null;
// Prevent all background stepping while an external WASM module is fetched.
if(['ascent','fall','edit','grip','material','material-stack'].includes(researchArgs.get('probe'))){paused=true;world.paused=true;$('#pause').textContent='Uruchom';}
const box3dOptions={gripLaw:researchArgs.get('griplaw')==='baseline'?'baseline':'intent-force',actorContact:researchArgs.get('actors')==='compliant'?'compliant':'ghost',boarMode:researchArgs.get('boar')==='responsive-los-crates'?'responsive-los-crates':researchArgs.get('boar')==='responsive-los'?'responsive-los':researchArgs.get('boar')==='responsive'?'responsive':'forage',
  substeps:['8','12','16'].includes(researchArgs.get('substeps'))?Number(researchArgs.get('substeps')):4,
  actorFacing:facingActors};
const keys=new Set(),stick={active:null,x:0,y:0},look={id:null,lastX:0,lastY:0};
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
 btn.textContent=supported?(mode==='responsive-los-crates'?'Dzik: widzi skrzynie (R&D)':mode==='responsive-los'?'Dzik: widzi części (R&D)':mode==='responsive'?'Dzik: reaguje':'Dzik: żeruje'):'Dzik: Box3D';
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
function setMode(m){if(m==='material'&&physicsState!=='box3d'){actionText('Uwalnianie brył wymaga Box3D R&D.');return;}playtest.event('tool',{mode:m});mode=m;startPanel=null;selection=0;targetSetSignature=null;selected=null;editDrag=null;editSelectedId=null;creationForeground=null;toolLabel.textContent=({move:'Ruch i kontakt',panel:'Rysuj belkę / płytę',box:'Postaw bryłę',crate:'Postaw skrzynię',erase:'Usuń wskazaną część',material:'Kotwica / uwolnij bryłę',edit:'Popraw zakotwiczoną część'}[m]||m);document.body.classList.remove('menu-open');document.body.classList.toggle('editing',m==='edit');
 for(const b of buttons)b.classList.toggle('active',b.dataset.mode===m);refreshEditButtons();
}
function refreshEditButtons(){
 const current=world.scene.elements.find(e=>e.id===editSelectedId);
 const editable=mode==='edit'&&current&&!(current.kind==='box'&&current.motionType==='dynamic');
 $('#edit-up').disabled=$('#edit-down').disabled=!editable;
 $('#undo').disabled=$('[data-mobile-action="undo"]').disabled=!editHistory.canUndo;
 $('#redo').disabled=$('[data-mobile-action="redo"]').disabled=!editHistory.canRedo;
}
function commitPartEdit(from,to,reason='move'){
 const r=editHistory.apply(world.scene,from,to);
 if(r.ok){
  bridge?.syncStatics?.();playtest.event('part-edit',{id:to?.id||from?.id,operation:reason});
  actionText('Zmieniono część '+(to?.id||from?.id)+'. Można cofnąć.');
 }else actionText('Edycja nieudana: '+r.reason);
 refreshEditButtons();return r;
}
for(const [id,dz] of [['#edit-up',.25],['#edit-down',-.25]]){
 $(id).onclick=()=>{
  const e=world.scene.elements.find(x=>x.id===editSelectedId);
  if(!e)return;
  commitPartEdit(e,translatedElement(e,[0,0,dz]),'raise');
 };
}
for(const [id,op] of [['#undo','undo'],['#redo','redo']]){
 $(id).onclick=()=>{
  editDrag=null;
  const r=editHistory[op](world);
  if(r.ok){
   if(r.kind==='crate')bridge?.syncBodies?.();
   else bridge?.syncStatics?.();
   selection=0;refreshSelection();
   playtest.event('authoring-history',{action:op,kind:r.kind,id:r.id});
   actionText(op==='undo'?'Cofnięto '+(r.kind==='crate'?'operację na skrzyni':'edycję części')+'.':
    'Ponowiono '+(r.kind==='crate'?'operację na skrzyni':'edycję części')+'.');
  }
  else actionText('Nie można '+(op==='undo'?'cofnąć':'ponowić')+': '+r.reason);
  refreshEditButtons();
 };
}
for(const b of buttons)b.addEventListener('click',()=>setMode(b.dataset.mode));
$('#mobile-menu').onclick=()=>document.body.classList.toggle('menu-open');$('#active-mode').onclick=()=>setMode('move');
const rotate=d=>{rot+=d;actionText('Kamera · obrót '+Math.round(rot*180/Math.PI)+'°')};
$('#turn-left').onclick=()=>rotate(-Math.PI/6);$('#turn-right').onclick=()=>rotate(Math.PI/6);
const quality=$('#quality');
const labelRenderScale=()=>{quality.textContent='Obraz: '+Math.round(renderScale*100)+'%';};
labelRenderScale();
quality.onclick=()=>{
 renderScale=renderScale===1?.75:renderScale===.75?.5:1;
 labelRenderScale();
 playtest.event('render-resolution',{scale:renderScale});
 actionText('Obraz '+Math.round(renderScale*100)+'% · tylko rozdzielczość; świat i Box3D bez zmian.');
};
const syncMobilePause=()=>{
 const control=$('#mobile-pause');
 control.textContent=paused?'▶':'⏸';
 control.setAttribute('aria-label',paused?'Uruchom symulację':'Zatrzymaj symulację');
 control.setAttribute('aria-pressed',String(paused));
 control.title=paused?'Uruchom':'Pauza';
};
$('#mobile-pause').onclick=()=>$('#pause').click();
$('#pause').onclick=()=>{if(physicsState.startsWith('loading-'))return;paused=!paused;world.paused=paused;$('#pause').textContent=paused?'Uruchom':'Pauza';
 syncMobilePause();
 actionText(paused?'Świat zatrzymany — możesz budować i poprawiać.':'Symulacja uruchomiona — materia znów reaguje.');};
syncMobilePause();
$('#grip').onclick=()=>{if(physicsState.startsWith('loading-')){actionText('Fizyka wczytuje się.');return;}const r=toggleGrip(world);playtest.event('grip-action',{ok:r.ok,gripped:r.gripped??null});actionText(r.ok?(r.gripped?'Trzymasz skrzynię.':'Puściłeś skrzynię.'): 'Poza zasięgiem lub inną wysokością.')};
$('#height').onclick=()=>{const a=[0,1.2,2.4,3.6],i=a.indexOf(buildHeight);buildHeight=a[(i+1)%a.length];$('#height').textContent='Podnieś: +'+buildHeight.toFixed(1)+' m';};
$('#width').onclick=()=>{buildWidth=buildWidth===2?3:buildWidth===3?1.2:2;$('#width').textContent='Szer.: '+buildWidth+' m';};
$('#layer').onclick=()=>{selection++;refreshSelection();};
// The second finger on a touch action must fire even while joystick owns
// the first pointer. Compatibility click may not be generated in multitouch;
// if generated after touch, it must not toggle the action twice.
for(const [name,target] of [['grip','#grip'],['layer','#layer'],['undo','#undo'],['redo','#redo']]){
 const button=$('[data-mobile-action="'+name+'"]');
 const activate=()=>$(target).click();
 button.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'||event.pointerType==='pen'){
   event.preventDefault();
   activate();
  }
 });
 button.addEventListener('click',event=>{
  if(event.pointerType==='touch'||event.pointerType==='pen')return;
  activate();
 });
}
let resetArmedUntil=0;
$('#reset').onclick=()=>{
 if(physicsState.startsWith('loading-')){actionText('Reset po załadowaniu właściwej fizyki.');return;}
 // The current scene may contain hours of unsaved construction; one stray
 // R beside WASD must never wipe it. Confirmation is limited to RESET,
 // not to experimental geometry, overlapping materials or other play.
 const now=performance.now();
 if(now>resetArmedUntil){
  resetArmedUntil=now+6000;
  const armed=resetArmedUntil;
  $('#reset').textContent='Potwierdź reset';
  actionText('Reset usunie bieżący świat i historię cofania. Ponów w ciągu 6 s, aby potwierdzić. Zapisz JSON, jeśli chcesz zachować konstrukcję.');
  setTimeout(()=>{if(resetArmedUntil===armed){resetArmedUntil=0;$('#reset').textContent='Reset';}},6000);
  return;
 }
 resetArmedUntil=0;$('#reset').textContent='Reset';
 playtest.event('reset',{engine:physicsState});bridge?.dispose?.();if(bridge?.engine?.free)bridge.engine.free();bridge=null;world=createLiveWorld();editHistory.clear();editSelectedId=null;editDrag=null;
 try{if(rapierLibrary&&physicsState==='rapier')bridge=createRapierBridge(world,rapierLibrary);
  if(box3dLibrary&&physicsState==='box3d')bridge=createBox3DBridge(world,box3dLibrary,box3dOptions);
 }catch(e){bridge=null;physicsState='legacy-fallback';physicsMessage='Physics reset failed: '+e.message;}
 camTarget=[14.5,14,0];paused=false;world.paused=false;$('#pause').textContent='Pauza';syncMobilePause();setMode('move');refreshActorContactUI();refreshBoarUI();refreshMaterialUI();actionText('Świat odtworzony · fizyka '+physicsState+'.')};
$('#save').onclick=()=>{const state={format:'splot-next-live-research-1',scene:world.scene,bodies:world.bodies,time:world.time};
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),link=document.createElement('a'),url=URL.createObjectURL(blob);
 link.href=url;link.download='Splot_Nowy_Rozdzial.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
};
// A local exported JSON restarts PHYSICS from these positions, not velocities.
// Create the new physics while the previous world is still owned. A malformed
// file or constructor failure cannot destroy an active Owner experiment.
$('#load').onclick=()=>$('#load-file').click();
$('#load-file').onchange=async()=>{
 const file=$('#load-file').files?.[0];
 if(!file)return;
 try{
  if(file.size>8*1024*1024)throw Error('Plik większy niż 8 MB; nie wczytano.');
  if(physicsState.startsWith('loading-'))throw Error('Poczekaj na załadowanie fizyki.');
  const nextWorld=restoreResearchWorld(await file.text());
  // Import is a destructive swap, not an automatic consequence of file selection.
  // The active world, solver and undo history survive a declined confirmation.
  if(!window.confirm('Wczytanie pliku zastąpi cały bieżący świat i wyczyści historię cofania. Niezapisane zmiany zostaną utracone. Kontynuować?')){
   actionText('Anulowano wczytywanie. Bieżący świat pozostał bez zmian.');
   return;
  }
  let nextBridge=null;
  if(physicsState==='box3d'){
   if(!box3dLibrary)throw Error('Box3D nie jest gotowy.');
   nextBridge=createBox3DBridge(nextWorld,box3dLibrary,box3dOptions);
  }else if(physicsState==='rapier'){
   if(!rapierLibrary)throw Error('Rapier nie jest gotowy.');
   nextBridge=createRapierBridge(nextWorld,rapierLibrary);
  }
  const old=bridge;bridge=nextBridge;world=nextWorld;
   editHistory.clear();editSelectedId=null;editDrag=null;
  old?.dispose?.();if(old?.engine?.free)old.engine.free();
  sequence=nextAuthoringSequence(world);
  acc=0;last=performance.now();frameMetrics.length=0;prevMetricFrame=0;latestPerf=null;
  const human=getBody(world,'human');
  camTarget=[human.x,human.y,human.z+.7];
  keys.clear();stick.x=0;stick.y=0;stick.active=null;look.id=null;
  selected=null;cursor=null;cursorUv=null;selection=0;startPanel=null;
  paused=true;world.paused=true;$('#pause').textContent='Uruchom';syncMobilePause();
  setMode('move');refreshActorContactUI();refreshBoarUI();refreshMaterialUI();
  playtest.event('scene-loaded',{parts:world.scene.elements.length,bodies:world.bodies.length,
   mode:'fresh-physics-paused'});
  actionText('Wczytano '+world.scene.elements.length+' części i '+world.bodies.length+
   ' ciał. Świat zatrzymany — fizyka ruszy od nowa po „Uruchom”.');
 }catch(err){
  actionText('Nie wczytano świata: '+String(err.message||err).slice(0,190));
 }finally{$('#load-file').value='';}
};
// CSS-normalized pointer position is independent of image render quality.
let cursorUv=null;
function cursorPos(e){
 const r=canvas.getBoundingClientRect();
 cursorUv=[(e.clientX-r.x)/r.width,(e.clientY-r.y)/r.height];
 return {x:cursorUv[0]*canvas.width,y:cursorUv[1]*canvas.height};
}
let cursor=null,targetSetSignature=null,creationForeground=null;
let lastHoverRecheckAt=0,lastHoverWorldSignature=null;
let autoGripReleaseWorld=world,lastAutoGripRelease=null;
function refreshSelection(){if(!cam||!cursor)return;
 // The backing canvas size can change without another pointer event.
 // Reproject the LAST CSS position into its current render-resolution pixels.
 if(cursorUv){cursor.x=cursorUv[0]*canvas.width;cursor.y=cursorUv[1]*canvas.height;}
 const rawHits=pickPixel(world.scene,cam,cursor.x,cursor.y);
 // Authored editing still selects authored identities; ONLY physical
 // crate placement additionally sees other physical crate tops.
 // Placement sees support tops; removal sees the whole visible crate skin.
 // Depth-ordered authored hits still allow deliberate deeper Q selection.
 const crateHits=physicsState==='box3d'
  ?mode==='crate'?crateTopHits(world.bodies,cam,cursor.x,cursor.y)
   :['edit','erase','material'].includes(mode)
    ?crateSurfaceHits(world.bodies,cam,cursor.x,cursor.y):[]
  :[];
 const ordered=crateHits.length?
  [...rawHits,...crateHits].sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id)):rawHits;
 // Construction deliberately still targets the authored surface BEHIND a
 // physical crate: no implicit static-on-dynamic joint or collision ban.
 // But the Owner must see that foreground material before committing.
 const frontCrate=(physicsState==='box3d'&&['box','panel'].includes(mode))
  ?crateSurfaceHits(world.bodies,cam,cursor.x,cursor.y)[0]:null;
 creationForeground=frontCrate&&
  (!ordered.length||frontCrate.distance+1e-5<ordered[0].distance)?frontCrate:null;
 const partTool=['edit','erase','material'].includes(mode);
 const hits=partTool?uniquePartHits(ordered):ordered;
 // Q selects a layer inside the current depth-ordered material hit group.
 // Never carry an invisible second-layer target into a different pile.
 if(partTool){
  const signature=hits.map(hit=>hit.id).join('|');
  if(targetSetSignature!==null&&signature!==targetSetSignature)selection=0;
  targetSetSignature=signature;
 }
 selected=hits.length?hits[selection%hits.length]:null;
 const a=selected;$('#target').textContent=a?`${a.id} • Z ${a.point[2].toFixed(2)} m • ${partTool?'element':'warstwa'} ${selection%hits.length+1}/${hits.length}`:
  (partTool?'Brak części pod kursorem':'Brak powierzchni pod kursorem');
 if(creationForeground)
  $('#target').textContent='Przed: '+creationForeground.id+
   ' · cel ZA: '+(a?.id||'brak')+(a?' · Z '+a.point[2].toFixed(2)+' m':'');
}
function clickWorld(p){if(physicsState.startsWith('loading-')){actionText('Ładowanie fizyki — świat jeszcze zatrzymany.');return;}cursor=p;refreshSelection();const a=selected;
 if(mode==='move')return;
 if(!a){actionText('Nie wskazano fizycznej powierzchni.');return;}
 if(mode==='panel'){
  const xyz=[...a.point];xyz[2]+=buildHeight;
  if(!startPanel){startPanel=xyz;actionText('Pierwszy koniec ustawiony. Wskaż drugi punkt.');return;}
  const e={id:'part-'+sequence++,kind:'panel',a:startPanel,b:xyz,width:buildWidth,thickness:.26,material:'wood'};
  const result=editHistory.apply(world.scene,null,e);refreshEditButtons();playtest.event('build-panel',{ok:result.ok,id:e.id});startPanel=null;
  actionText(result.ok?'Powstał niezależny element XYZ.':'Odmowa: '+result.reason);return;
 }
 if(mode==='box'){
  const [x,y,z]=a.point,r=editHistory.apply(world.scene,null,{id:'block-'+sequence++,kind:'box',min:[x-.6,y-.6,z+buildHeight],max:[x+.6,y+.6,z+buildHeight+1.1],material:'stone'});refreshEditButtons();
  playtest.event('build-box',{ok:r.ok,reason:r.reason??null});actionText(r.ok?'Bryła ma rzeczywisty obrys, kontakt i powierzchnię.':'Odmowa: '+r.reason);return;
 }
 if(mode==='material'){
  if(!bridge?.syncStatics){actionText('Fizyka części wymaga aktywnego Box3D.');return;}
  const e=world.scene.elements.find(x=>x.id===a.id);
  if(!e||e.kind!=='box'){
   actionText(world.bodies.some(b=>b.kind==='crate'&&b.id===a.id)?
    'Skrzynia już podlega Box3D. Q pozwala wskazać część konstrukcji za nią.':
    'Na tym etapie można uwolnić tylko bryłę. Płyty wymagają modelu rotacji i momentu.');return;
  }
  const old=partMotionMode(e),next=old==='dynamic'?'anchored':'dynamic';
  const r=setBoxMotion(world.scene,e.id,next);
  if(r.ok){editHistory.invalidateId(e.id);refreshEditButtons();bridge.syncStatics();playtest.event('part-motion-change',{id:e.id,from:old,to:next});
   actionText(next==='dynamic'?'Uwolniono bryłę. Box3D prowadzi grawitację i kontakt; obrót jest świadomie zablokowany.':
    'Zakotwiczono bryłę w aktualnym miejscu.');}
  else actionText('Błąd zmiany stanu: '+r.reason);
  return;
 }
 if(mode==='crate'){
  const r=addCrate(world,a.point[0],a.point[1],a.point[2],
   {admission:physicsState==='box3d'&&researchArgs.get('admission')!=='legacy'?'solver':'legacy'});
  if(r.ok){editHistory.recordBodyAdded(world,r.id);bridge?.syncBodies?.();selection=0;refreshSelection();}
  refreshEditButtons();
  playtest.event('build-crate',{ok:r.ok,reason:r.reason??null});
  actionText(r.ok?'Nowa skrzynia w świecie. Można cofnąć.':'Odmowa: '+r.reason);return;
 }
 if(mode==='edit'){actionText('Zaznacz i przeciągnij zakotwiczoną część. Pion: przyciski ±0,25 m.');return;}
 if(mode==='erase'){
  const crateIndex=world.bodies.findIndex(b=>b.kind==='crate'&&b.id===a.id);
  if(crateIndex!==-1){
   const crate=world.bodies[crateIndex],r=editHistory.removeBody(world,crate.id);
   if(r.ok){bridge?.syncBodies?.();selection=0;refreshSelection();}
   refreshEditButtons();
   playtest.event('delete-crate',{id:crate.id,ok:r.ok});
   actionText(r.ok?'Skrzynia usunięta. Można cofnąć bez cofania fizyki.':
    'Nie udało się usunąć skrzyni: '+r.reason);
   return;
  }
  if(a.id==='ground'){actionText('Grunt nie jest elementem edytora.');return;}
  const e=world.scene.elements.find(x=>x.id===a.id);
  const external=e?.kind==='box'&&e.motionType==='dynamic';
  const r=external?removeElement(world.scene,a.id):editHistory.apply(world.scene,e||null,null);
  if(r.ok&&external)editHistory.invalidateId(a.id);
  if(r.ok){selection=0;refreshSelection();}
  refreshEditButtons();playtest.event('delete-part',{ok:r.ok,id:a.id});
  actionText(r.ok?'Element usunięty; ciała zareagują na utratę podparcia.':'Odmowa: '+r.reason);
 }
}
canvas.addEventListener('pointermove',e=>{
 if(look.id===e.pointerId){
  const dx=e.clientX-look.lastX,dy=e.clientY-look.lastY;
  rot+=dx*.009;
  // Drag up to inspect top faces, down to inspect side faces.
  // Stay clear of invalid camera poles (including ray picking).
  pitch=Math.max(.38,Math.min(1.43,pitch-dy*.007));
  look.lastX=e.clientX;look.lastY=e.clientY;
  return;
 }
 if(editDrag?.pointerId===e.pointerId){
  const p=cursorPos(e),q=screenOnHeightPlane(cam,p.x,p.y,editDrag.planeZ);
  if(q)editDrag.delta=[q[0]-editDrag.origin[0],q[1]-editDrag.origin[1],0];
  return;
 }
 if(mode!=='move'){cursor=cursorPos(e);refreshSelection();}
});
canvas.addEventListener('pointerdown',e=>{
 e.preventDefault();
 if(physicsState.startsWith('loading-')){actionText('Najpierw wczytaj fizykę.');return;}
 if(e.button===2){look.id=e.pointerId;look.lastX=e.clientX;look.lastY=e.clientY;canvas.setPointerCapture(e.pointerId);return;}
 // On a phone the free play canvas is the natural camera control.
 // Right-mouse orbit remains intact; authoring touch still targets parts.
 // A captured joystick uses a DIFFERENT pointer on its own element.
 if(mode==='move'&&(e.pointerType==='touch'||e.pointerType==='pen')){
  if(look.id!==null)return;
  look.id=e.pointerId;look.lastX=e.clientX;look.lastY=e.clientY;
  canvas.setPointerCapture(e.pointerId);
  return;
 }
 if(mode==='edit'){
  cursor=cursorPos(e);refreshSelection();
  const a=selected,part=a&&world.scene.elements.find(p=>p.id===a.id);
  if(!part){editSelectedId=null;
   actionText(a&&world.bodies.some(b=>b.kind==='crate'&&b.id===a.id)?
    'Wskazano fizyczną skrzynię. Chwytaj ją lub wybierz Q część za nią.':
    'Wskaż część konstrukcji, nie grunt.');
   refreshEditButtons();return;}
  if(part.kind==='box'&&part.motionType==='dynamic'){
   editSelectedId=null;actionText('Część dynamiczną prowadzi Box3D — zakotwicz ją przed edycją.');refreshEditButtons();return;
  }
  editSelectedId=part.id;refreshEditButtons();
  const origin=screenOnHeightPlane(cam,cursor.x,cursor.y,a.point[2]);
  if(origin){editDrag={pointerId:e.pointerId,id:part.id,from:JSON.parse(JSON.stringify(part)),
   origin,planeZ:a.point[2],delta:[0,0,0]};canvas.setPointerCapture(e.pointerId);}
  actionText('Zaznaczono '+part.id+'. Przeciągnij, aby przesunąć.');
  return;
 }
 clickWorld(cursorPos(e));
});
function finishEditDrag(e,commit){
 if(!editDrag||editDrag.pointerId!==e.pointerId)return;
 const d=editDrag;editDrag=null;
 if(commit&&Math.hypot(d.delta[0],d.delta[1])>.035)
  commitPartEdit(d.from,translatedElement(d.from,d.delta),'drag');
 refreshEditButtons();
}
canvas.addEventListener('pointerup',e=>{if(look.id===e.pointerId)look.id=null;finishEditDrag(e,true);});
canvas.addEventListener('pointercancel',e=>{if(look.id===e.pointerId)look.id=null;finishEditDrag(e,false);});

canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(2.3,zoom*(e.deltaY<0?1.09:.91)));},{passive:false});
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','tab'].includes(k))e.preventDefault();
 if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();$(e.shiftKey?'#redo':'#undo').click();return;}
 if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();$('#redo').click();return;}
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
// Same triangles, same material and silhouette parts. Orientation alters
// visible pose only; solver-owned collision shapes are never rotated here.
function faceActorTriangles(tris,b){
 const a=bridge?.visualBoarYaw;
 if(!facingActors||!Number.isFinite(a))return tris;
 const c=Math.cos(a),s=Math.sin(a);
 const point=p=>{
  const x=p[0]-b.x,y=p[1]-b.y;
  return [b.x+x*c-y*s,b.y+x*s+y*c,p[2]];
 };
 return tris.map(t=>({...t,a:point(t.a),b:point(t.b),c:point(t.c),
  normal:[t.normal[0]*c-t.normal[1]*s,t.normal[0]*s+t.normal[1]*c,t.normal[2]]}));
}
function actorsMesh(){let out=[];
 for(const b of world.bodies){
  if(b.kind==='crate'){
   out.push(...crateTriangles(b));
  }else if(b.kind==='boar'){
   const mesh=[
    ...box(b.x,b.y,b.z+.15,.42,.3,.55,'boar'),
    ...box(b.x+.32,b.y,b.z+.25,.25,.24,.28,'skin'),
    ...box(b.x-.26,b.y-.23,b.z,.1,.08,.25,'boar'),
    ...box(b.x+.25,b.y+.23,b.z,.1,.08,.25,'boar')];
   out.push(...faceActorTriangles(mesh,b));
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
 // Research-only own-player position cue when an authored solid is truly
 // between the camera and the player's torso. Never expose hidden NPCs.
 // Does NOT remove any depth-tested faces or alter actual ray picking.
 if(ownPresenceExperiment&&presenceInfo?.occluded){
  const actor=getBody(world,'human'),k=w/cam.width;
  if(actor){
   const feet=projectPoint(cam,[actor.x,actor.y,actor.z]);
   const top=projectPoint(cam,[actor.x,actor.y,actor.z+actor.h]);
   const cx=(feet.x+top.x)*.5*k,cy=(feet.y+top.y)*.5*k;
   const span=Math.hypot(top.x-feet.x,top.y-feet.y)*k;
   ctx.save();
   ctx.fillStyle='rgba(169,224,189,.11)';
   ctx.strokeStyle='rgba(190,240,208,.92)';
   ctx.lineWidth=Math.max(1.5,1.8*k);
   ctx.setLineDash([5*k,4*k]);
   ctx.beginPath();ctx.ellipse(cx,cy,Math.max(10*k,span*.25),Math.max(16*k,span*.65),0,0,Math.PI*2);
   ctx.fill();ctx.stroke();ctx.setLineDash([]);
   ctx.beginPath();ctx.arc(top.x*k,top.y*k,Math.max(4*k,span*.11),0,Math.PI*2);ctx.stroke();
   ctx.font=`${Math.max(10,11*k)}px system-ui`;
   ctx.fillStyle='rgba(211,246,220,.95)';
   ctx.fillText('POSTAĆ ZA: '+String(presenceInfo.blocker||'?').slice(0,24),
    Math.max(8*k,Math.min(w-180*k,cx+16*k)),Math.max(20*k,cy-12*k));
   ctx.restore();
  }
 }
 if(selected&&mode!=='move'){const p=projectPoint(cam,selected.point),k=$('#overlay').width/cam.width;
  ctx.beginPath();ctx.arc(p.x*k,p.y*k,9*k,0,Math.PI*2);ctx.strokeStyle='#ffd59e';ctx.lineWidth=2*k;ctx.stroke();
 }
 // A persistent selected-part outline, distinct from the drag's proposed pose.
 // These are visual cues only: the scene and Box3D collider change on commit.
 const outline=(e,color,dashed=false)=>{
  let pts,edges;
  if(e.kind==='box'){
   pts=[[e.min[0],e.min[1],e.min[2]],[e.max[0],e.min[1],e.min[2]],
    [e.max[0],e.max[1],e.min[2]],[e.min[0],e.max[1],e.min[2]],
    [e.min[0],e.min[1],e.max[2]],[e.max[0],e.min[1],e.max[2]],
    [e.max[0],e.max[1],e.max[2]],[e.min[0],e.max[1],e.max[2]]];
   edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  }else{
   const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],len=Math.hypot(dx,dy);
   if(len<1e-8)return;
   const sx=-dy/len*e.width/2,sy=dx/len*e.width/2;
   pts=[[e.a[0]-sx,e.a[1]-sy,e.a[2]],[e.b[0]-sx,e.b[1]-sy,e.b[2]],
    [e.b[0]+sx,e.b[1]+sy,e.b[2]],[e.a[0]+sx,e.a[1]+sy,e.a[2]]];
   edges=[[0,1],[1,2],[2,3],[3,0]];
  }
  const k=$('#overlay').width/cam.width;
  ctx.strokeStyle=color;ctx.lineWidth=2*k;
  ctx.setLineDash(dashed?[6*k,3*k]:[]);
  for(const [a,b] of edges){
   const x=projectPoint(cam,pts[a]),y=projectPoint(cam,pts[b]);
   ctx.beginPath();ctx.moveTo(x.x*k,x.y*k);ctx.lineTo(y.x*k,y.y*k);ctx.stroke();
  }
  ctx.setLineDash([]);
 };
 if(mode==='edit'&&editSelectedId){
  const e=world.scene.elements.find(p=>p.id===editSelectedId);
  if(e)outline(e,'#ffd59e');
 }
 // The click target is a MATERIAL OBJECT, not the small point on its surface.
 // Highlight the full currently targeted body before erase/material actions,
 // including solver-owned crates; selecting another Q-layer updates this cue.
 if(selected&&['erase','material','edit','crate'].includes(mode)){
  const crate=world.bodies.find(b=>b.kind==='crate'&&b.id===selected.id);
  if(crate){
   const r=crate.r;
   outline({kind:'box',min:[crate.x-r,crate.y-r,crate.z],
    max:[crate.x+r,crate.y+r,crate.z+crate.h]},
    '#ffd59e',selection>0);
  }else if(['erase','material','edit'].includes(mode)){
   const part=world.scene.elements.find(e=>e.id===selected.id);
   // Expose the full material identity BEFORE committing an edit gesture.
   // Keep the already-chosen part distinct when pointing at another object.
   if(part&&!(mode==='edit'&&part.id===editSelectedId))
    outline(part,mode==='edit'?'#bdf1d0':'#ffd59e',selection>0);
  }
 }
 // Dashed foreground crate warns that the actual build point is BEHIND it.
 // It is not an edit selection and does not change the intended action.
 if(creationForeground&&['box','panel'].includes(mode)){
  const b=world.bodies.find(q=>q.kind==='crate'&&q.id===creationForeground.id);
  if(b)outline({kind:'box',min:[b.x-b.r,b.y-b.r,b.z],
   max:[b.x+b.r,b.y+b.r,b.z+b.h]},'#e3b794',true);
 }
 if(editDrag&&Math.hypot(...editDrag.delta)>.035)
  outline(translatedElement(editDrag.from,editDrag.delta),'#d7f4bd',true);
 if(startPanel){const p=projectPoint(cam,startPanel),k=$('#overlay').width/cam.width;ctx.beginPath();ctx.arc(p.x*k,p.y*k,7*k,0,Math.PI*2);ctx.strokeStyle='#d6e3bf';ctx.stroke();}
}
function viewport(){const r=canvas.getBoundingClientRect(),gl=renderer.mode==='webgl-depth';const ratio=(gl?Math.min(window.devicePixelRatio||1,2):Math.min(.75,Math.max(.46,.70/(Math.max(1,(r.width*r.height)/(970*700))))))*renderScale;
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
function profile(){return {...summarizePerfFrames(frameMetrics),renderer:renderer.mode,renderScale,canvasPixels:canvas.width*canvas.height,cameraMode:timeCamera?'seconds':'legacy'};}
function frame(t){
 const rafMs=prevMetricFrame?t-prevMetricFrame:NaN;prevMetricFrame=t;
 let elapsed=Math.min(.08,(t-last)/1000);last=t;acc+=elapsed;
 const info=viewport(),p=getBody(world,'human');
 if(timeCamera)camTarget=advanceCameraTarget(camTarget,[p.x,p.y,p.z+.7],elapsed);
 else {camTarget[0]+=(p.x-camTarget[0])*.16;camTarget[1]+=(p.y-camTarget[1])*.16;camTarget[2]+=(p.z+.7-camTarget[2])*.10;}
 cam=makeCamera({target:camTarget,azimuth:rot,elevation:pitch,...info});
 const physicsStart=performance.now();
 let physicsSteps=0;
 if(!paused){let iter=0;while(acc>=1/60&&iter<4){
  if(bridge)bridge.advance(1/60,keyDirection());else stepLive(world,1/60,keyDirection());
  acc-=1/60;iter++;physicsSteps++;}}
 else {acc=0;if(bridge){bridge.syncStatics();bridge.syncBodies();}}
 // Real solver motion can break a grasp without a second press of E.
 // Report the material event once; stale "Trzymasz skrzynię" feedback is
 // deceptive during uninterrupted player-controlled transport.
 const release=world.events.findLast(e=>e.type==='release'&&
  ['separation','contact'].includes(e.reason));
 if(autoGripReleaseWorld!==world){
  autoGripReleaseWorld=world;lastAutoGripRelease=release;
 }else if(release&&release!==lastAutoGripRelease){
  lastAutoGripRelease=release;
  const reason=release.reason==='contact'?'kontakt z przeszkodą':'skrzynia za daleko';
  actionText('Chwyt zerwany — '+reason+'. Podejdź bliżej i naciśnij E.');
  playtest.event('auto-grip-release',{id:release.id||null,reason:release.reason});
 }
 // Camera and solver material can move under a stationary pointer.
 // Do not raycast every render frame; probe only during authoring and at 8 Hz.
 if(cursor&&mode!=='move'&&!editDrag&&look.id===null&&t>=lastHoverRecheckAt){
  lastHoverRecheckAt=t+125;
  let cratePose='';
  for(const b of world.bodies)if(b.kind==='crate')
   cratePose+=b.id+':'+Math.round(b.x*100)+','+Math.round(b.y*100)+','+Math.round(b.z*100)+';';
  const signature=[mode,rot,pitch,zoom,info.width,info.height,
   ...camTarget.map(v=>v.toFixed(3)),world.scene.revision,world.scene.motionRevision||0,
   cratePose].join('|');
  if(signature!==lastHoverWorldSignature){
   refreshSelection();
   lastHoverWorldSignature=signature;
  }
 }
 const simulationCpuMs=performance.now()-physicsStart;
 // 8 Hz bounded material-occlusion query in the OPT-IN presence experiment,
 // not one expensive raycast per render frame or one per actor.
 if(ownPresenceExperiment&&t-lastPresenceProbe>=125){
  const actor=getBody(world,'human');
  const c=actor?occlusionToPoint(world.scene,cam,
   [actor.x,actor.y,actor.z+actor.h*.55]):null;
  presenceInfo={occluded:!!c&&!c.visible,blocker:c?.blocker?.id||null};
  lastPresenceProbe=t;
 }
 const geometryStart=performance.now();
 const tris=floorGeometry.concat(sceneVisual.triangles(world.scene),actorsMesh());
 const geometryCpuMs=performance.now()-geometryStart;
 const drawStart=performance.now();
 renderer.render(tris,cam);renderOverlay(cam);
 const drawSubmissionCpuMs=performance.now()-drawStart;
 frameMetrics.push({frameTimeMs:t,rafMs,physicsSteps,simulationCpuMs,geometryCpuMs,drawSubmissionCpuMs,triangles:tris.length});
 // A fixed number of frames meant 0.75 s at 240 Hz, 3 s at 60 Hz.
 // Keep a time-based ~2 s window; bound memory even under odd clocks.
 while(frameMetrics.length&&(frameMetrics[0].frameTimeMs<t-2000||frameMetrics.length>1000))frameMetrics.shift();
 // Profile is derived twice per second, not sorted once per render frame.
 if(t-lastHud>260)latestPerf=profile();
 playtest.observe(world,{engine:physicsState,camera:cam,performance:latestPerf});
 if(t-lastHud>260){
  updatePlaytestStatus();const a=getBody(world,'human');
  const debug=researchArgs.get('perf')==='1',m=latestPerf;
  const suffix=debug&&m?` · physics ${m.physics.cpuMsPerStep?.toFixed(2)??'n/a'} ms/krok (${m.physics.steps} kroków) · geometry ${m.geometryCpuMs.median?.toFixed(1)} ms/kl · submit ${m.drawSubmissionCpuMs.median?.toFixed(1)} ms/kl · rAF ${m.rafMs.median?.toFixed(1)} ms`:'';
  // On a phone, engine identity lives in its own status row. A full
  // research HUD would obscure the mode/menu controls on a 320px viewport.
  hud.textContent=window.innerWidth<=760&&!debug?
   `Z ${a.z.toFixed(1)} m · ${world.scene.elements.length} części`:
   `Z ${a.z.toFixed(2)} m · ${a.support??'spadanie'} · ${renderer.mode} · ${physicsState} · ${world.scene.elements.length} części${suffix}`;
  if(t-lastNotice>2900&&!researchArgs.get('probe'))message.classList.remove('show');lastHud=t;}
 frameCount++;requestAnimationFrame(frame);
}
setMode('move');actionText('Splot Next: ruszaj, pchaj, chwytaj, konstruuj. Wszystko w tej samej przestrzeni XYZ.');
async function startPhysicsChallenger(){
 // Box3D is the playable R&D default. Legacy remains deliberately
 // selectable for A/B, never an accidental alternative interpretation.
 const requested=researchArgs.get('physics');
 const choice=requested==='legacy'?'legacy':requested==='rapier'?'rapier':'box3d';
 if(choice==='legacy'){
  showEngine('legacy','LEGACY · fizyka porównawcza (wybrana ręcznie)');
  actionText('Tryb legacy — tylko porównanie. Splot Box3D uruchomisz bez parametru.');
  return;
 }
 const initialPaused=paused,pauseButton=$('#pause'),resetButton=$('#reset');
 // No unrecorded legacy sim time or movement while fetching WebAssembly.
 paused=true;world.paused=true;acc=0;
 pauseButton.disabled=true;resetButton.disabled=true;pauseButton.textContent='Ładowanie…';
 physicsState='loading-'+choice;
 showEngine('loading','Ładowanie '+(choice==='box3d'?'Box3D':'Rapier')+' · świat zatrzymany');
 actionText('Ładowanie '+choice+' · zaczekaj na właściwą fizykę.');
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
  showEngine('ready',(choice==='box3d'?'Box3D':'Rapier')+' · aktywna fizyka badawcza');
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
  if(!['ascent','fall','edit','grip','material','material-stack'].includes(probe)){
   paused=initialPaused;world.paused=initialPaused;acc=0;
  }
  pauseButton.disabled=false;resetButton.disabled=false;pauseButton.textContent=paused?'Uruchom':'Pauza';
 }catch(err){
  bridge?.dispose?.();bridge=null;physicsState='legacy-fallback';refreshActorContactUI();refreshBoarUI();refreshMaterialUI();
  paused=initialPaused;world.paused=initialPaused;acc=0;
  pauseButton.disabled=false;resetButton.disabled=false;pauseButton.textContent=paused?'Uruchom':'Pauza';
  showEngine('fallback','AWARIA '+(choice==='box3d'?'Box3D':'Rapier')+' · starsza fizyka AWARYJNA');
  physicsMessage=String(err?.stack||err);
  actionText('AWARIA '+choice+': uruchomiono fizykę awaryjną (legacy). '+physicsMessage.slice(0,120));
 }
}
refreshActorContactUI();refreshBoarUI();refreshMaterialUI();requestAnimationFrame(frame);void startPhysicsChallenger();
window.__splotNext={get world(){return world},get renderer(){return renderer.mode},get mode(){return mode},get camera(){return cam},get physics(){return physicsState},get renderScale(){return renderScale},get physicsMessage(){return physicsMessage},get challenger(){return bridge},get playtest(){return {status:playtest.status({visible:!document.hidden,focused:document.hasFocus()}),report:playtest.report()}},get errors(){return []},profile,get visualStats(){return sceneVisual.stats()},get actorMesh(){return actorsMesh()},get presenceInfo(){return presenceInfo},clearProfile:()=>{frameMetrics.length=0;prevMetricFrame=0},setMode,partMotion:(id,action)=>{if(physicsState!=='box3d'||!bridge)return {ok:false,reason:'box3d-only'};const r=setBoxMotion(world.scene,id,action);if(r.ok){editHistory.invalidateId(id);refreshEditButtons();bridge.syncStatics();}return r},reset:()=>$('#reset').click(),pause:()=>$('#pause').click(),step:(n,dir=[0,0])=>{for(let i=0;i<n;i++){if(bridge)bridge.advance(1/60,dir);else stepLive(world,1/60,dir)}},build:(element)=>insertElement(world.scene,element)};
