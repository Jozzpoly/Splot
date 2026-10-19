import {makeCamera,projectPoint,sceneTriangles,trianglesFor,pickPixel,insertElement,removeElement,supportCandidates,clearanceAt} from './spatial-core.mjs';
import {createLiveWorld,getBody,stepLive,toggleGrip,addCrate} from './spatial-sim.mjs';
import {createRenderer} from './render.mjs';
import {createRapierBridge} from './rapier-live.mjs';
const $=s=>document.querySelector(s),canvas=$('#world'),hud=$('#hud'),toolLabel=$('#active-mode'),message=$('#notice'),buttons=[...document.querySelectorAll('[data-mode]')];
let world=createLiveWorld(),renderer=createRenderer(canvas),mode='move',selection=0,selected=null,startPanel=null,buildHeight=0,buildWidth=2.0,rot=0,zoom=1;
let camTarget=[14.5,14,0],cam=null,last=performance.now(),acc=0,lastHud=0,lastNotice=0,sequence=10,paused=false,frameCount=0;
let bridge=null,rapierLibrary=null,physicsState='legacy',physicsMessage='';
const researchArgs=new URLSearchParams(location.search);
const keys=new Set(),stick={active:null,x:0,y:0},look={id:null,lastX:0};
const paletteColor=e=>e.material||'stone';
const actionText=t=>{message.textContent=t;message.classList.add('show');lastNotice=performance.now()};
function setMode(m){mode=m;startPanel=null;selection=0;selected=null;toolLabel.textContent=({move:'Ruch i kontakt',panel:'Rysuj belkę / płytę',box:'Postaw bryłę',crate:'Postaw skrzynię',erase:'Usuń wskazaną część'}[m]||m);document.body.classList.remove('menu-open');
 for(const b of buttons)b.classList.toggle('active',b.dataset.mode===m);
}
for(const b of buttons)b.addEventListener('click',()=>setMode(b.dataset.mode));
$('#mobile-menu').onclick=()=>document.body.classList.toggle('menu-open');$('#active-mode').onclick=()=>setMode('move');
const rotate=d=>{rot+=d;actionText('Kamera · obrót '+Math.round(rot*180/Math.PI)+'°')};
$('#turn-left').onclick=()=>rotate(-Math.PI/6);$('#turn-right').onclick=()=>rotate(Math.PI/6);
$('#pause').onclick=()=>{paused=!paused;world.paused=paused;$('#pause').textContent=paused?'Uruchom':'Pauza'};
$('#grip').onclick=()=>{const r=toggleGrip(world);actionText(r.ok?(r.gripped?'Trzymasz skrzynię.':'Puściłeś skrzynię.'): 'Poza zasięgiem lub inną wysokością.')};
$('#height').onclick=()=>{const a=[0,1.2,2.4,3.6],i=a.indexOf(buildHeight);buildHeight=a[(i+1)%a.length];$('#height').textContent='Podnieś: +'+buildHeight.toFixed(1)+' m';};
$('#width').onclick=()=>{buildWidth=buildWidth===2?3:buildWidth===3?1.2:2;$('#width').textContent='Szer.: '+buildWidth+' m';};
$('#layer').onclick=()=>{selection++;refreshSelection();};
$('#reset').onclick=()=>{if(bridge?.engine?.free)bridge.engine.free();world=createLiveWorld();
 if(rapierLibrary&&physicsState==='rapier'){try{bridge=createRapierBridge(world,rapierLibrary);}catch(e){bridge=null;physicsState='legacy';physicsMessage='Rapier reset failed: '+e.message;}}
 camTarget=[14.5,14,0];setMode('move');actionText('Świat odtworzony · fizyka '+physicsState+'.')};
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
  const result=insertElement(world.scene,e);startPanel=null;
  actionText(result.ok?'Powstał niezależny element XYZ.':'Odmowa: '+result.reason);return;
 }
 if(mode==='box'){
  const [x,y,z]=a.point,r=insertElement(world.scene,{id:'block-'+sequence++,kind:'box',min:[x-.6,y-.6,z],max:[x+.6,y+.6,z+1.1],material:'stone'});
  actionText(r.ok?'Bryła ma rzeczywisty obrys, kontakt i powierzchnię.':'Odmowa: '+r.reason);return;
 }
 if(mode==='crate'){const r=addCrate(world,a.point[0],a.point[1],a.point[2]);actionText(r.ok?'Nowa skrzynia w świecie.':'Odmowa: '+r.reason);return;}
 if(mode==='erase'){
  if(a.id==='ground'){actionText('Grunt nie jest elementem edytora.');return;}
  const r=removeElement(world.scene,a.id);
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
 else if('12345'.includes(k))setMode(['move','panel','box','crate','erase'][Number(k)-1]);
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
   out.push(...box(b.x,b.y,b.z,b.r,b.r,b.h,'crate'));
   out.push(...box(b.x,b.y,b.z+b.h-.07,b.r+.018,b.r+.018,.07,'wood'));
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
function frame(t){let elapsed=Math.min(.08,(t-last)/1000);last=t;acc+=elapsed;
 const info=viewport(),p=getBody(world,'human');
 camTarget[0]+=(p.x-camTarget[0])*.16;camTarget[1]+=(p.y-camTarget[1])*.16;camTarget[2]+=(p.z+.7-camTarget[2])*.10;
 cam=makeCamera({target:camTarget,azimuth:rot,elevation:1.03,...info});
 if(!paused){let iter=0;while(acc>=1/60&&iter<4){
  if(bridge)bridge.advance(1/60,keyDirection());else stepLive(world,1/60,keyDirection());
  acc-=1/60;iter++;}}
 else {acc=0;if(bridge){bridge.syncStatics();bridge.syncBodies();}}
 const tris=floorGeometry.concat(sceneTriangles(world.scene).map(t=>({...t,material:paletteColor(world.scene.elements.find(x=>x.id===t.owner)||{})})),actorsMesh());
 renderer.render(tris,cam);renderOverlay(cam);
 if(t-lastHud>260){const a=getBody(world,'human');hud.textContent=`Z ${a.z.toFixed(2)} m · ${a.support??'spadanie'} · ${renderer.mode} · ${physicsState} · ${world.scene.elements.length} części · ${renderer.lastCost.toFixed(0)} ms CPU`;
  if(t-lastNotice>2900&&researchArgs.get('probe')!=='ascent')message.classList.remove('show');lastHud=t;}
 frameCount++;requestAnimationFrame(frame);
}
setMode('move');actionText('Splot Next: ruszaj, pchaj, chwytaj, konstruuj. Wszystko w tej samej przestrzeni XYZ.');
async function startPhysicsChallenger(){
 if(researchArgs.get('physics')!=='rapier')return;
 physicsState='loading-rapier';actionText('Ładowanie badawczej fizyki Rapier 0.21.0. Nadal możesz grać.');
 try{
  const module=await import('https://esm.sh/@dimforge/rapier3d-compat@0.21.0?bundle');
  const R=module.default||module;
  if(typeof R.init==='function')await R.init();
  rapierLibrary=R;bridge=createRapierBridge(world,R);physicsState='rapier';
  actionText('Rapier aktywny · ta sama gra i grafika · zmieniona warstwa kontaktu (R&D).');
  if(researchArgs.get('probe')==='ascent'){
   const human=getBody(world,'human');human.x=12;human.y=13;human.z=0;human.support='ground';
   if(bridge?.engine?.free)bridge.engine.free();bridge=createRapierBridge(world,R);world.paused=false;
   for(let i=0;i<225;i++)bridge.advance(1/60,[1,0]);paused=true;world.paused=true;
   const b=getBody(world,'human'),ok=b.x>19&&b.z>1.8;
   physicsMessage=(ok?'PASS':'FAIL')+' / live ramp→deck / x='+b.x.toFixed(2)+' z='+b.z.toFixed(2);
   actionText(physicsMessage);
  }
 }catch(err){bridge=null;physicsState='legacy-fallback';physicsMessage=String(err?.message||err);
  actionText('Rapier niedostępny. Pozostaje stary solver. '+physicsMessage.slice(0,130));}
}
requestAnimationFrame(frame);void startPhysicsChallenger();
window.__splotNext={get world(){return world},get renderer(){return renderer.mode},get mode(){return mode},get camera(){return cam},get physics(){return physicsState},get physicsMessage(){return physicsMessage},get challenger(){return bridge},get errors(){return []},setMode,reset:()=>$('#reset').click(),pause:()=>$('#pause').click(),step:(n,dir=[0,0])=>{for(let i=0;i<n;i++){if(bridge)bridge.advance(1/60,dir);else stepLive(world,1/60,dir)}},build:(element)=>insertElement(world.scene,element)};
