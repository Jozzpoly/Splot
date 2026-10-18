import {SIZE,DECK,rampTriangles,DT,createWorld,getBody,solids,surfaces,terrain,imprintAt,raycast,canReach,removeBridge,tickWorld,bodyConflicts,snapshot,restore,walk,placeObject,eraseNear,toggleGrip} from './world.mjs';
const canvas=document.getElementById('world'),mini=document.getElementById('minimap'),ctx=canvas.getContext('2d'),mctx=mini.getContext('2d');
const $=id=>document.getElementById(id), keys=new Set();
let w=createWorld(),selected='player',running=true,showDebug=false,ai=true,viewMode='auto',scenario='przeciaganie',viewW=0,viewH=0,dpr=1;
let cam={x:42,y:27}, scale=45,tone='phys',tool='none',note='Użyj WASD. Sytuacja istnieje wewnątrz świata 84×54, nie w miniaturowym zamienniku.',pulse=[],lastFrame=performance.now(),accumulator=0,lastUi=0,frames=0;
let errors=[];window.addEventListener('error',e=>errors.push(e.message));
let mobileStick={x:0,y:0,id:null},mobileToastAt=0;
function closeMobileMenu(){document.body.classList.remove('mobile-menu-open');$('mobile-options').setAttribute('aria-expanded','false');resetMobileStick();}
function resetMobileStick(){mobileStick.x=mobileStick.y=0;mobileStick.id=null;$('joystick-knob').style.transform='translate(0px,0px)';}
$('mobile-options').addEventListener('click',()=>{if(document.body.classList.contains('mobile-menu-open'))closeMobileMenu();else {resetMobileStick();document.body.classList.add('mobile-menu-open');$('mobile-options').setAttribute('aria-expanded','true');}});
$('mobile-close-menu').addEventListener('click',closeMobileMenu);
function updateMobileStick(e){const r=$('mobile-joystick').getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2;
 const max=r.width*.30,rx=e.clientX-cx,ry=e.clientY-cy,len=Math.hypot(rx,ry),f=len?Math.min(1,max/len):1;
 const x=rx*f,y=ry*f;let nx=x/max,ny=y/max;
 if(Math.hypot(nx,ny)<.14)nx=ny=0;
 mobileStick.x=nx;mobileStick.y=ny;$('joystick-knob').style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;
}
const stick=$('mobile-joystick');
stick.addEventListener('pointerdown',e=>{if(mobileStick.id!==null)return;e.preventDefault();mobileStick.id=e.pointerId;stick.setPointerCapture(e.pointerId);updateMobileStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId!==mobileStick.id)return;e.preventDefault();updateMobileStick(e)});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(ev,e=>{if(mobileStick.id===e.pointerId)resetMobileStick()});
window.addEventListener('blur',()=>{resetMobileStick();keys.clear()});
window.addEventListener('orientationchange',resetMobileStick);
document.addEventListener('contextmenu',e=>{if(matchMedia('(pointer:coarse)').matches&&e.target.closest('.stage'))e.preventDefault();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetMobileStick();keys.clear()}});
// Mobile secondary touches may not synthesize a click while another finger
// holds the joystick. Commit actions on touch pointerdown, suppress duplicate
// synthetic clicks, but retain mouse/keyboard activation for accessibility.
function bindMobileAction(id,desktopId){const el=$(id);let lastTouch=-1e9;
 el.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();lastTouch=performance.now();$(desktopId).click();}});
 el.addEventListener('click',()=>{if(performance.now()-lastTouch>650)$(desktopId).click();});
}
bindMobileAction('mobile-view','viewmode');
bindMobileAction('mobile-grip','grip');
bindMobileAction('mobile-touch-info','actor');

const color={player:'#79dbc3',scout:'#e5b878',boar:'#cf8670',crate:'#bd9473','deck-crate':'#bd9473'};
function syncButtons(){ $('mobile-level').textContent=(selected==='player'?'DÓŁ':'GÓRA')+' · '+(getBody(w,selected)?.z??0).toFixed(1)+' m';$('mobile-grip').textContent=w.grips?.[selected]?'Puść':'Chwyt'; $('play').textContent=running?'Pauza':'Uruchom'; $('actor').textContent=selected==='player'?'Postać: dół':'Postać: góra'; $('debug').textContent=showDebug?'Debug: tak':'Debug: nie';$('ai').textContent=ai?'Dzik: działa':'Dzik: stop'; $('remove').disabled=!w.deck; $('viewmode').textContent='Widok: '+(viewMode==='auto'?'automatyczny':viewMode==='cut'?'przekrój':'pełna bryła')+' (C)'; }
function msg(t){note=t;$('status').textContent=t;const el=$('mobile-toast');el.textContent=t;el.classList.add('shown');mobileToastAt=performance.now();}
function setScenario(type){closeMobileMenu();w=createWorld();selected='player';scenario=type;running=true;ai=true;
 if(type==='skrot'){
  Object.assign(getBody(w,'player'),{x:46.7,y:27.93,z:0,support:'ground'});
  Object.assign(getBody(w,'crate'),{x:47.75,y:27.93,z:0,support:'ground'});
  Object.assign(getBody(w,'boar'),{x:43.8,y:27.93,z:0,support:'ground'});
  w.goal={id:'food',x:50.2,y:27.93,z:0,eaten:false};
  msg('SKRÓT: skrzynia blokuje przejście. Dzik ma długie obejście. Złap E, odciągnij skrzynię na bok, obserwuj nową trasę (H).');
 }else if(type==='przeciaganie'){
  Object.assign(getBody(w,'player'),{x:42.0,y:27,z:0,support:'ground'});
  msg('CHWYT: E chwyta skrzynię obok. WASD przeciąga ją po gruncie, E puszcza. Zbuduj przeszkodę edytorem i sprawdź opór.');
 }else if(type==='zrzut'){
  selected='scout';ai=false;
  Object.assign(getBody(w,'scout'),{x:45.88,y:27.95,z:2.60,support:'bridge',heading:0});
  Object.assign(getBody(w,'deck-crate'),{x:46.83,y:27.95,z:2.60,support:'bridge'});
  msg('ZRZUT: jesteś na moście. E łapie skrzynię, D przeciąga ją za krawędź. Chwyt puści ciężar, a skrzynia naprawdę spadnie.');
 }else if(type==='kontakt'){
  Object.assign(getBody(w,'player'),{x:42.15,y:27,heading:0});Object.assign(getBody(w,'crate'),{x:43,y:27});
  Object.assign(getBody(w,'boar'),{x:42.52,y:27.66});ai=false;
  msg('KONTAKT: Postać napiera na skrzynię, ale przeszkoda blokuje ruch. Odrzucone pchnięcie NIE może przesunąć skrzyni.');
 }else if(type==='upadek'){
  selected='scout';removeBridge(w);msg('UPADEK: most usunięty. Obserwuj proces spadania i nieprzekraczanie brył. Stan na głowie innej postaci jest znanym błędem modelu.');
 }else if(type==='blokada'){
  Object.assign(getBody(w,'player'),{x:46.4,y:27.93,heading:0});Object.assign(getBody(w,'crate'),{x:47.76,y:27.93});
  ai=true;msg('BLOKADA: Skrzynia zatkała wąski prześwit. Wypchnij ją na wschód i obserwuj, jak dzik przelicza drogę (H).');
 }else if(type==='zagroda'){
  const boar=getBody(w,'boar');Object.assign(boar,{x:40,y:35,z:0,support:'ground'});
  Object.assign(getBody(w,'player'),{x:43.4,y:37.2,z:0,support:'ground'});
  w.goal={id:'food',x:45,y:35,z:0,eaten:false};
  for(let i=0;i<=4;i++)for(let j=0;j<=4;j++)if(i===0||i===4||j===0||j===4)
   placeObject(w,'wall',38.4+i*.8,33.4+j*.8);
  msg('ZAGRODA: Zwierzę jest w środku rzeczywiście zamkniętej konstrukcji. Edytuj mury (5), zostaw otwór i obserwuj — bez specjalnej reguły ucieczki.');
 }else if(type==='obchodzenie'){
  ai=true;msg('OBCHODZENIE: dzik szuka drogi do pokarmu za ścianą. Uproszczony A* zna mapę — to nie jest percepcja zwierzęcia.');
 }else msg('PRZĘSŁO: dwie postacie na tym samym XY, ale różne Z i podpory. Spróbuj przejść pod mostem i wejść rampą.');
 document.querySelector('.corner').textContent=type.toUpperCase()+' / ŚWIAT XYZ';
 $('mobile-toast').classList.remove('shown');mobileToastAt=0;
 cam=type==='zagroda'?{x:43.4,y:37.2}:type==='skrot'?{x:47,y:27.93}:type==='zrzut'?{x:45.4,y:27.8}:{x:42,y:27};pulse=[];setTool('none');syncButtons();}
// Authoring mode is an explicit debug/editor privilege, NOT an in-world hand/grab.
// Pointer positions are mapped through the same CSS-pixel projection as drawScene.
function setTool(k){tool=k;for(const b of document.querySelectorAll('[data-tool]')){b.setAttribute('aria-pressed',String(b.dataset.tool===k));b.style.borderColor=b.dataset.tool===k?'#e8b97f':'';} }
for(const b of document.querySelectorAll('[data-tool]'))b.addEventListener('click',()=>{setTool(b.dataset.tool);closeMobileMenu();});
canvas.addEventListener('pointerdown',e=>{
 if(tool==='none')return;
 e.preventDefault();const r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 const b=getBody(w,selected),level=b?.support==='bridge'?'bridge':'ground',z=level==='bridge'?2.6:0;
 const x=cam.x+(sx-viewW*.51)/scale,y=cam.y+(sy-viewH*.57+z*scale*.53)/(scale*.67);
 const result=tool==='erase'?eraseNear(w,x,y,{level}):placeObject(w,tool,x,y,{level});
 msg(result.ok?`EDYTOR: ${tool==='erase'?'Usunięto':'Dodano'} ${result.id}. Obiekt uczestniczy w kolizji, promieniach, nawigacji i zapisie.`:
  `EDYTOR: odmowa (${result.reason}${result.hits?.length?': '+result.hits.join(', '):''}). Świat nie został zmieniony.`);updateUI();
});
$('export-world').onclick=()=>{const data=new Blob([snapshot(w)],{type:'application/json'}),url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download='Splot_Forge_Authored_World.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);msg('Wyeksportowano świat. To zapis badawczy Forge, nie save produkcyjny.');};
$('import-world').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const replacement=restore(await file.text());w=replacement;selected='player';cam={x:getBody(w,selected).x,y:getBody(w,selected).y};syncButtons();updateUI();msg('Import przyjęty — geometria zapisu przeszła walidację.');}catch(err){msg('Import odrzucony: '+err.message);}finally{e.target.value='';}});
$('cycle').onclick=()=>{const scenes=['skrot','przeciaganie','zrzut','przeslo','kontakt','upadek','obchodzenie','blokada','zagroda'];setScenario(scenes[(scenes.indexOf(scenario)+1)%scenes.length])};$('reset').onclick=()=>setScenario(scenario);$('actor').onclick=()=>{selected=selected==='player'?'scout':'player';msg('Sterujesz postacią '+(selected==='player'?'na dole':'na górze')+'.');syncButtons()};
$('remove').onclick=()=>{removeBridge(w);msg('Usunięto most; grawitacja działa w czasie, a nowe kontakty wynikają z geometrii.');syncButtons()};
$('viewmode').onclick=()=>{viewMode=viewMode==='auto'?'cut':viewMode==='cut'?'solid':'auto';syncButtons()};
$('play').onclick=()=>{running=!running;syncButtons()};$('debug').onclick=()=>{showDebug=!showDebug;syncButtons()};$('ai').onclick=()=>{ai=!ai;syncButtons()};
$('grip').onclick=()=>{const r=toggleGrip(w,selected);msg(r.ok?(w.grips?.[selected]?`CHWYT: ${r.crate}. Skrzynia pozostaje na podłożu; przesuwasz oba ciała wspólnie.`:`PUSZCZONO: ${r.crate}.`):`CHWYT: odmowa (${r.reason}). Zbliż się do skrzyni na tym samym podłożu.`);updateUI()};
$('reach').onclick=()=>{const a=getBody(w,selected),objs=w.bodies.filter(x=>x.kind==='crate').sort((a,b)=>Math.hypot(a.x-getBody(w,selected).x,a.y-getBody(w,selected).y)-Math.hypot(b.x-getBody(w,selected).x,b.y-getBody(w,selected).y));const r=canReach(w,selected,objs[0].id);msg('Próba zasięgu do '+objs[0].id+': '+(r.ok?'kontakt możliwy':'brak kontaktu — '+r.reason));};
for(const n of document.querySelectorAll('[data-scenario]'))n.onclick=()=>setScenario(n.dataset.scenario);
function down(k){keys.add(k);}function up(k){keys.delete(k);}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d',' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k))e.preventDefault();if(e.repeat&&['tab',' ','x','r','h','e','1','2','3','4','5','0'].includes(k))return;
 if(k==='tab'){$('actor').click();return;}if(k===' ') {$('play').click();return;}if(k==='x'){$('remove').click();return;}if(k==='r'){$('reset').click();return;}if(k==='h'){$('debug').click();return;}if(k==='e'){$('grip').click();return;}if(k==='c'){$('viewmode').click();return;}if(k==='3'){setTool('crate');return;}if(k==='4'){setTool('wall');return;}if(k==='5'){setTool('erase');return;}if(k==='0'){setTool('none');return;}if(k==='1'||k==='2'){selected=k==='1'?'player':'scout';syncButtons();return;}down(k);
});addEventListener('keyup',e=>up(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
for(const el of document.querySelectorAll('[data-dir]')){const k=el.dataset.dir;el.addEventListener('pointerdown',e=>{e.preventDefault();down(k);el.setPointerCapture(e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>up(k));}
function resize(){dpr=Math.min(2.5,devicePixelRatio||1);let r=canvas.getBoundingClientRect();viewW=r.width;viewH=r.height;canvas.width=Math.max(1,Math.round(viewW*dpr));canvas.height=Math.max(1,Math.round(viewH*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',resize);resize();
function shade(col,a=1){return col}const between=(a,b,t)=>a+(b-a)*t;
function visualHash(x,y,z=0){let n=(Math.imul(Math.floor(x)*374761393,1)^Math.imul(Math.floor(y)*668265263,1)^Math.imul(z*1903,1))|0;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;}
function XY(x,y,z=0){return {x:viewW*.51+(x-cam.x)*scale,y:viewH*.57+(y-cam.y)*scale*.67-z*scale*.53};}
function path(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
function line(a,b,col,w=1,ds=[]){ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=w;ctx.setLineDash(ds);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
function disk(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function polygonXY(box,z=0){return [XY(box.minX,box.minY,z),XY(box.maxX,box.minY,z),XY(box.maxX,box.maxY,z),XY(box.minX,box.maxY,z)];}
function blockVolume(b,material='#52625e',opacity=1){const base=polygonXY(b,b.minZ),top=polygonXY(b,b.maxZ);ctx.save();ctx.globalAlpha=opacity;
 path([base[2],base[3],top[3],top[2]],'#233b40');path([base[1],base[2],top[2],top[1]],'#293e42');path(top,material,'#b7a68c',1);
 const c=XY((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,b.maxZ);if(showDebug){ctx.fillStyle='#f1d4a2';ctx.font='9px monospace';ctx.fillText(b.id,c.x-18,c.y-3);}ctx.restore();}
function background(){rect(0,0,viewW,viewH,'#102b31');
 // Draw the same 84×54 world; only the camera clips its current region.
 const x0=Math.max(0,Math.floor(cam.x-viewW/(2*scale)-3)),x1=Math.min(84,Math.ceil(cam.x+viewW/(2*scale)+3));
 const y0=Math.max(0,Math.floor(cam.y-viewH/(1.34*scale)-3)),y1=Math.min(54,Math.ceil(cam.y+viewH/(1.34*scale)+3));
 for(let j=y0;j<y1;j++)for(let i=x0;i<x1;i++){
  const p=XY(i,j),t=terrain(i,j,w.seed),h=hash(i,j,w.seed);
  const c=t==='grass'?(h%4===0?'#31504a':'#2d4945'):t==='soil'?'#415048':'#3c4e50';rect(p.x,p.y,scale+1,scale*.67+1,c);
  const k=visualHash(i*2,j*2,917);if(k%4!==0)continue;
  ctx.strokeStyle=t==='grass'?'rgba(161,184,125,.30)':'rgba(181,176,137,.17)';ctx.lineWidth=1.3;
  for(let n=0;n<2;n++){let a=XY(i+.25+(k%19)/36+n*.18,j+.3+n*.12),tip={x:a.x+(k%7-3)*.7,y:a.y-3-(k%5)};line(a,tip,ctx.strokeStyle,1.2)}
 }
 // Material biography: visible, persistent and mechanical. Only committed
 // ground contacts may alter these cells. The renderer never writes them.
 for(const [k,v] of Object.entries(w.imprints)){
  const [gx,gy]=k.split(',').map(Number);const x=(gx+.5)/2.5,y=(gy+.5)/2.5;
  if(x<x0-1||x>x1+1||y<y0-1||y>y1+1)continue;
  const p=XY(x,y);ctx.fillStyle=`rgba(178,139,91,${Math.min(.5,v*.56)})`;
  ctx.beginPath();ctx.ellipse(p.x,p.y,scale*.38,scale*.22,0,0,Math.PI*2);ctx.fill();
 }
 // Material distinct and positionally stable: path to bridge and old stone site.
 for(let x=34;x<52;x+=.38){let p=XY(x,27.2+Math.sin(x*.72)*.15),r=visualHash(x*8,1,17);disk(p.x,p.y,2.1+(r%2),'rgba(176,149,105,.10)')}
 const bounds=[XY(0,0),XY(84,0),XY(84,54),XY(0,54)];path(bounds,null,'rgba(236,221,167,.25)',2);
}
function groundDetails(){
 const g=XY(w.goal.x,w.goal.y,0);if(!w.goal.eaten){disk(g.x,g.y,14,'rgba(211,172,76,.09)');disk(g.x,g.y,5.3,'#d4a85b');disk(g.x-2,g.y-3,2,'#f0d69b');}
 // Structural shadow visually follows the same bridge footprint.
 if(w.deck){const under=polygonXY(DECK,0);path(under,'rgba(2,16,20,.22)');}
}
function bridge(){if(!w.deck)return;
 const selectedBody=getBody(w,selected),under=selectedBody.z<DECK.minZ-.01;
 const top=polygonXY(DECK,DECK.maxZ),base=polygonXY(DECK,DECK.minZ);
 const focusUnder=viewMode==='auto'&&under&&selectedBody.x>DECK.minX-.45&&selectedBody.x<DECK.maxX+.45&&selectedBody.y>DECK.minY-.45&&selectedBody.y<DECK.maxY+.45;
 const center=XY(selectedBody.x,selectedBody.y,selectedBody.z);
 // A deliberate, *local* visual cutaway. Surface material remains visible as a
 // faint projection where the selected actor is occluded. World physics, nav,
 // picking and save are independent of this camera mode.
 const deckPass=(alpha,region)=>{ctx.save();
  if(region){ctx.beginPath();
   if(region==='outside')ctx.rect(0,0,viewW,viewH);
   ctx.moveTo(center.x+scale*1.45,center.y-13);
   ctx.ellipse(center.x,center.y-13,scale*1.45,scale*1.18,0,0,Math.PI*2);
   ctx.clip(region==='outside'?'evenodd':'nonzero');
  }
  ctx.globalAlpha=alpha;
  path([base[2],base[3],top[3],top[2]],'#574d44');path([base[1],base[2],top[2],top[1]],'#594c3c');path(top,'#ac895e','#e5c795',2);
  for(let x=37.5;x<47;x+=.85){const a=XY(x,24,2.6),b=XY(x,30,2.6);line(a,b,'rgba(59,65,59,.38)',1.3);}
  ctx.restore();
 };
 deckPass(viewMode==='cut'?.19:.98,focusUnder?'outside':null);
 if(focusUnder){deckPass(.20,'inside');
  ctx.save();ctx.strokeStyle='#e6d0a299';ctx.setLineDash([5,5]);ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(center.x,center.y-13,scale*1.45,scale*1.18,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 // Do not keep a second, hand-drawn definition of the sloped surface.
 // These faces are the same 3D triangles used by world-space raycasting.
 const triangles=rampTriangles(),rampTopVertices=[triangles[2][0],triangles[2][1],triangles[2][2],triangles[3][2]];
 const rim=[triangles[3][2],triangles[2][2],triangles[1][2],triangles[1][1]];
 path(rim.map(v=>XY(v.x,v.y,v.z)),'#655644','#ac926e',1);
 path(rampTopVertices.map(v=>XY(v.x,v.y,v.z)),'#8a785a','#cfb994',1.5);
}
function actor(b){const p=XY(b.x,b.y,b.z),shadow=XY(b.x,b.y,b.support==='bridge'||b.support==='ramp'?b.z:0),s=scale*.65,clr=color[b.id]||'#b2baa7';ctx.save();
 // This sprite stays upright; world-space heading and gaze are not screen rotation.
 if(b.support===null&&b.z>.15){
  const anchor=XY(b.x,b.y,0);ctx.strokeStyle='rgba(221,220,185,.35)';ctx.lineWidth=1.2;ctx.setLineDash([2,5]);
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(anchor.x,anchor.y);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='rgba(7,18,20,.25)';ctx.beginPath();ctx.ellipse(anchor.x+4,anchor.y+4,b.r*scale*.8,b.r*scale*.34,0,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle='rgba(0,12,17,.38)';ctx.beginPath();ctx.ellipse(shadow.x+2,shadow.y+2,b.r*scale*.82,b.r*scale*.38,0,0,Math.PI*2);ctx.fill();
 if(b.kind==='crate'){
  const h=Math.max(12,b.h*scale*.58),r=b.r*scale*.89;
  rect(p.x-r,p.y-h,r*2,h,'#ad8a65');rect(p.x-r,p.y-h,r*2,3,'#dcc49e');line({x:p.x-r+2,y:p.y-h+5},{x:p.x+r-2,y:p.y-4},'#6e5748',2);
  line({x:p.x+r-2,y:p.y-h+5},{x:p.x-r+2,y:p.y-4},'#6e5748',2);ctx.strokeStyle='#4d3e32';ctx.lineWidth=2;ctx.strokeRect(p.x-r,p.y-h,r*2,h);
 }else if(b.kind==='boar'){
  const s=scale*.75,dir=Math.cos(b.heading)>=0?1:-1;
  disk(p.x-dir*5,p.y-14,s*.43,'#9b7765');disk(p.x+dir*5,p.y-16,s*.34,'#c08f70');rect(p.x-dir*13,p.y-10,4,9,'#644e44');rect(p.x+dir*8,p.y-10,4,9,'#644e44');
  disk(p.x+dir*15,p.y-15,5,'#d5ac88');disk(p.x+dir*9,p.y-20,2,'#201b1b');
 }else{
  const bodyTop=p.y-b.h*scale*.56,headY=bodyTop+9,front=Math.sin(b.heading)>=.27,back=Math.sin(b.heading)<=-.27,side=!front&&!back,dir=Math.cos(b.heading)>=0?1:-1;
  const phase=Math.sin((b.walk||0)*8.6),stride=(b.support===null?0:phase)*5;
  line({x:p.x-5,y:p.y-2},{x:p.x-5+stride,y:p.y-18},'#2f3e43',5);line({x:p.x+5,y:p.y-2},{x:p.x+5-stride,y:p.y-18},'#344449',5);
  path([{x:p.x-10,y:headY+18},{x:p.x+10,y:headY+18},{x:p.x+12,y:p.y-16},{x:p.x-12,y:p.y-16}],clr,'#182c30',2);
  const arm=phase*4;line({x:p.x-10,y:headY+23},{x:p.x-14,y:p.y-23+arm},'#bf967c',4);line({x:p.x+10,y:headY+23},{x:p.x+14,y:p.y-23-arm},'#bf967c',4);
  disk(p.x,headY,10,'#cbaa8f');path([{x:p.x-10,y:headY-2},{x:p.x-7,y:headY-10},{x:p.x+7,y:headY-10},{x:p.x+10,y:headY-2}], '#4b413f');
  if(front){disk(p.x-4,headY+2,1.4,'#263338');disk(p.x+4,headY+2,1.4,'#263338');}
  if(side){disk(p.x+dir*5,headY+1,1.6,'#263338');}if(back){rect(p.x-8,headY-2,16,3,'#584f49')}
 }
 if(w.grips?.[selected]===b.id){const holder=getBody(w,selected),hp=XY(holder.x,holder.y,holder.z);line({x:hp.x,y:hp.y-holder.h*scale*.27},{x:p.x,y:p.y-b.h*scale*.3},'#f3ca86',3);}
 if(b.id===selected){ctx.strokeStyle='#f2d5a1';ctx.lineWidth=1.7;ctx.setLineDash([3,4]);ctx.beginPath();ctx.ellipse(p.x,p.y-16,Math.max(22,b.r*scale+11),b.kind==='crate'?18:31,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
 if(showDebug){line(p,XY(b.x,b.y,0),clr,1.2,[3,4]);ctx.font='11px ui-monospace,monospace';ctx.fillStyle='#f2e4be';ctx.fillText(`${b.id} ${b.z.toFixed(2)} / ${b.support||'FALL'}`,p.x-32,p.y-b.h*scale*.56-13)}
 ctx.restore();}
function groundOverlay(){for(const v of solids(w).filter(s=>!s.id.startsWith('slab')))blockVolume(v,v.id.startsWith('pillar')?'#766c58':'#5a6664',1)}
function drawPulses(){
 pulse=pulse.filter(p=>w.time-p.last<.40);
 for(const p of pulse){const age=(w.time-p.last)/.40,pt=XY(p.x,p.y,p.z),radius=10+Math.min(7,Math.log1p(p.count)*1.8);
  ctx.save();ctx.globalAlpha=Math.max(0,(1-age)*.42);ctx.strokeStyle=p.type==='push'?'#f3bb83':'#9bdebd';ctx.lineWidth=1.7;
  ctx.beginPath();ctx.ellipse(pt.x,pt.y,radius,radius*.45,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
}
function drawScene(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewW,viewH);background();groundDetails();
 // The deck is a real occluder in the painter's order. Lower bodies render
 // BEFORE it; upper bodies AFTER it. Transparent cutaway remains a deliberate
 // view aid, never a physical change to the bridge.
 groundOverlay();
 const ordered=[...w.bodies].sort((a,b)=>a.y-b.y);
 for(const b of ordered.filter(b=>b.z+b.h<DECK.minZ+.035))actor(b);
 bridge();
 for(const b of ordered.filter(b=>b.z+b.h>=DECK.minZ+.035))actor(b);
 drawPulses();
 if(showDebug){if(w.nav.path.length){ctx.strokeStyle='#ffd19a';ctx.lineWidth=1.5;ctx.setLineDash([3,4]);ctx.beginPath();w.nav.path.forEach((v,i)=>{const p=XY(v.x,v.y,0);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke();ctx.setLineDash([])}
 const p=getBody(w,selected);ctx.fillStyle='#f3dcaa';ctx.font='12px monospace';ctx.fillText(`KANON XYZ x:${p.x.toFixed(2)} y:${p.y.toFixed(2)} z:${p.z.toFixed(2)}`,18,22);}
}
function drawMini(){let width=mini.width,height=mini.height;mctx.fillStyle='#223c3b';mctx.fillRect(0,0,width,height);const ox=3,oy=3,sx=(width-6)/SIZE.w,sy=(height-6)/SIZE.h;for(let j=0;j<SIZE.h;j+=2)for(let i=0;i<SIZE.w;i+=2){mctx.fillStyle=terrain(i,j,w.seed)==='grass'?'#355b4c':'#4d5449';mctx.fillRect(ox+i*sx,oy+j*sy,sx*2+1,sy*2+1)}
 if(w.deck){mctx.fillStyle='#cb9c67';mctx.fillRect(ox+37*sx,oy+24*sy,10*sx,6*sy)} for(const b of w.authored){mctx.fillStyle='#b78c66';mctx.fillRect(ox+b.minX*sx,oy+b.minY*sy,(b.maxX-b.minX)*sx,(b.maxY-b.minY)*sy)}
 for(const b of w.bodies){mctx.fillStyle=color[b.id];mctx.fillRect(ox+b.x*sx-2,oy+b.y*sy-2,4,4)}let c=getBody(w,selected);mctx.strokeStyle='#f3deb6';mctx.strokeRect(ox+(cam.x-9)*sx,oy+(cam.y-6)*sy,18*sx,12*sy);
}
function updateUI(){let b=getBody(w,selected);$('mobile-level').textContent=(selected==='player'?'DÓŁ':'GÓRA')+' · '+b.z.toFixed(1)+' m'+(tool!=='none'?' · '+({crate:'SKRZYNIA',wall:'MUR',erase:'USUŃ'}[tool]||tool):'');$('mobile-grip').textContent=w.grips?.[selected]?'Puść':'Chwyt';$('clock').textContent=w.time.toFixed(1)+' s';$('height').textContent=b.z.toFixed(2)+' m';$('support').textContent=b.support||'w powietrzu';$('stats').textContent=`Ruchy skrzyń: ${w.stats.pushes}  ·  Odmowy: ${w.stats.blocked}  ·  Lądowania: ${w.stats.lands}  ·  Planowania: ${w.stats.routes}  ·  Przeciąganie: ${w.stats.drags||0}`;
 $('grip').textContent=w.grips?.[selected]?'Puść skrzynię (E)':'Chwyć skrzynię (E)';
 $('builder-info').textContent=`Mury: ${w.authored.length} · dodatkowe skrzynie: ${w.bodies.filter(b=>b.id.startsWith('made-crate-')).length} · rewizja: ${w.revision}`;
 $('events').replaceChildren(...w.history.slice(-5).reverse().map(e=>{let d=document.createElement('div');d.className='event';d.textContent=`${(e.tick/60).toFixed(1)}s  ${e.type} ${e.id||e.actor||e.by||''}`;return d}));}
function loop(t){let dt=Math.min(.1,(t-lastFrame)/1000);lastFrame=t;if(running){accumulator+=dt;for(let i=0;accumulator>=DT&&i<6;i++,accumulator-=DT){let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);if(!dx&&!dy){dx=mobileStick.x;dy=mobileStick.y;}let ev=tickWorld(w,{selected,move:[dx,dy],precision:keys.has('shift'),ai});for(const e of ev){
  if(e.type==='grip-released'&&e.reason==='edge-lost-support')
   msg('KRAWĘDŹ: skrzynia straciła podparcie; chwyt nie utrzymał jej ciężaru.');
  if(e.type==='land'&&e.id?.includes('crate'))
   msg('LĄDOWANIE: skrzynia osiadła na '+(e.on==='ground'?'gruncie':e.on)+'.');
  if(e.type==='push'||e.type==='land'||e.type==='blocked'||e.type==='drag'){
 const id=e.actor||e.id||selected,b=getBody(w,id);if(!b)continue;
 const existing=pulse.find(p=>p.type===e.type&&p.id===id&&w.time-p.last<.33);
 if(existing){existing.x=b.x;existing.y=b.y;existing.z=b.z;existing.count++;existing.last=w.time;}
 else pulse.push({id,type:e.type,x:b.x,y:b.y,z:b.z,count:1,last:w.time});
 }}}}
 if(mobileToastAt&&t-mobileToastAt>2700){$('mobile-toast').classList.remove('shown');mobileToastAt=0;}
 const actorB=getBody(w,selected);cam.x=between(cam.x,actorB.x,.09);cam.y=between(cam.y,actorB.y,.09);drawScene();if(t-lastUi>170){drawMini();updateUI();lastUi=t;}frames++;requestAnimationFrame(loop);}
setScenario('przeciaganie');requestAnimationFrame(loop);
window.__forge={get world(){return w},get selected(){return selected},choose:id=>{selected=id;syncButtons()},scenario:setScenario,runSteps:(n,command)=>{for(let i=0;i<n;i++)tickWorld(w,command||{ai:false})},remove:()=>removeBridge(w),pause:()=>{running=false;syncButtons()},grip:(actorId='player',targetId=null)=>toggleGrip(w,actorId,targetId),place:(kind,x,y,level='ground')=>placeObject(w,kind,x,y,{level}),erase:(id)=>eraseNear(w,id.x,id.y,{level:id.level||'ground'}),get tool(){return tool},get viewMode(){return viewMode},get diagnostics(){return {viewW,viewH,dpr,canvasW:canvas.width,canvasH:canvas.height,errors,stats:w.stats,mobileStick:{...mobileStick},menuOpen:document.body.classList.contains('mobile-menu-open')}},state:()=>snapshot(w),reset:()=>setScenario('przeslo')};
