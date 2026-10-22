import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {BUILDING,buildApartmentHouse} from "./building.js";
import {FreeCamera,normalizedStick} from "./free-camera.js";
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8e9ca9);
scene.fog=new THREE.Fog(0x8e9ca9,185,395);
const camera=new THREE.PerspectiveCamera(43,Math.max(.2,innerWidth/innerHeight),.15,650);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.17;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("stage").appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=true;
controls.minDistance=7;controls.maxDistance=285;controls.maxPolarAngle=Math.PI/2-.025;
controls.target.set(0,8,0);controls.update();
const ambient=new THREE.HemisphereLight(0xb6cbdd,0x626f67,2.1);
scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffb993,2.7);
sun.position.set(-17,30,20);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-72;sun.shadow.camera.right=72;
sun.shadow.camera.top=46;sun.shadow.camera.bottom=-46;
sun.shadow.camera.near=1;sun.shadow.camera.far=95;
sun.shadow.normalBias=.055;sun.target.position.set(0,6,0);
scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0xc5d6dd,1.05);
fill.position.set(35,17,-20);scene.add(fill);
const eveningLamp=new THREE.PointLight(0xffb56e,12,13,2);
eveningLamp.position.set(-15,3.7,13);scene.add(eveningLamp);
const {root,stats,config,roofTop}=buildApartmentHouse(THREE);
scene.add(root);
function plane(w,h,color,x,y,z){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
    new THREE.MeshStandardMaterial({color,roughness:.99}));
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;
}
plane(146,84,0x758178,0,-.08,0);
plane(92,5.7,0x969b98,0,-.054,config.width/2+5.5);
plane(98,8.5,0x495257,0,-.046,config.width/2+13);
const markings=new THREE.Group();scene.add(markings);
const white=new THREE.MeshBasicMaterial({color:0xc8c6ba});
for(let x=-43;x<=43;x+=7){
  const lane=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.08),white);
  lane.rotation.x=-Math.PI/2;lane.position.set(x,-.04,config.width/2+13);
  markings.add(lane);
}
let timeIndex=0,qualityIndex=1,viewName="threequarter";
const modes=[
 {label:"Низкое",pixelRatio:.85,shadows:false,map:512},
 {label:"Среднее",pixelRatio:1.2,shadows:true,map:1024},
 {label:"Высокое",pixelRatio:1.65,shadows:true,map:1536}
];
const lighting=[
 {label:"🌆 Вечер",background:0x8e9ca9,ambient:2.1,sun:2.7,fill:1.05,lamps:true,exposure:1.17},
 {label:"☁️ Дневной осмотр",background:0xb9c4c5,ambient:2.6,sun:2,fill:1.1,lamps:false,exposure:1.23}
];
function applyTime(){
 const l=lighting[timeIndex];scene.background.setHex(l.background);scene.fog.color.setHex(l.background);
 ambient.intensity=l.ambient;sun.intensity=l.sun;fill.intensity=l.fill;
 eveningLamp.visible=l.lamps;renderer.toneMappingExposure=l.exposure;
 $("time").textContent=l.label;
}
function applyQuality(){
 const q=modes[qualityIndex];
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.pixelRatio));
 renderer.shadowMap.enabled=q.shadows;sun.castShadow=q.shadows;
 sun.shadow.mapSize.set(q.map,q.map);
 if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
 $("quality").textContent="⚙ "+q.label;
 $("quality-info").textContent="Качество: "+q.label.toLowerCase();
}
function baseFit(){
 const radius=config.length/2+4;
 const vfov=THREE.MathUtils.degToRad(camera.fov);
 const hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect);
 const d=radius/Math.sin(hfov/2);
 return THREE.MathUtils.clamp(Math.max(d*1.15,roofTop/Math.sin(vfov/2)*.78),54,245);
}
function setView(name){
 const views={front:[0,.2,1],threequarter:[.95,.34,1],end:[1,.21,0],top:[.15,1,.12]};
 const u=views[name]||views.threequarter;
 viewName=name;
 const d=baseFit()*(name==="end"?.79:name==="top"?.72:1);
 const offset=new THREE.Vector3(u[0],u[1],u[2]).normalize().multiplyScalar(d);
 camera.position.copy(controls.target).add(offset);
 controls.update();
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 $("view-label").textContent="Ракурс: "+({front:"фасад",threequarter:"¾",end:"торец",top:"сверху"}[name]);
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
$("time").addEventListener("click",()=>{timeIndex=(timeIndex+1)%lighting.length;applyTime();});
$("quality").addEventListener("click",()=>{qualityIndex=(qualityIndex+1)%modes.length;applyQuality();});
$("reset").addEventListener("click",()=>{if(activeFly())return;controls.target.set(0,8,0);setView("threequarter");});
$("building-info").textContent=config.floors+" этажей · "+stats.entrances+" подъезда · "+stats.balconies+" балконов";

/* 3.1.1: ORBIT is retained, FREE is a separate explicit XYZ inspection mode.
   No change to the building geometry, materials or baseline render budget. */
const free=new FreeCamera(camera,{speed:9,sprint:2.4});
let lookPointer=null,stickPointer=null;
let lookX=0,lookY=0;
const stick=$("stick-zone"),knob=$("stick-knob");
const verticalPressed=new Set();
const activeFly=()=>free.active;
function centerStick(){
  stickPointer=null;
  free.setStick(0,0);
  knob.style.left="50%";knob.style.top="50%";
}
function releaseInputs(){
  lookPointer=null;
  verticalPressed.clear();
  free.setVertical(0);
  free.clearInputs();
  centerStick();
  for(const id of ["fly-up","fly-down"])$(id).classList.remove("held");
  $("fly-boost").classList.remove("active");
  $("fly-boost").setAttribute("aria-pressed","false");
}
function toggleFreeCamera(enabled=!activeFly()){
  if(enabled===activeFly())return;
  // Undo any pointer captures and pressed state before changing modes.
  releaseInputs();
  if(enabled){
    free.start(controls.target);
    controls.enabled=false;
    document.body.classList.add("fly-mode");
    $("freecam-toggle").classList.add("active");
    $("freecam-toggle").setAttribute("aria-pressed","true");
    $("freecam-toggle").textContent="◉ Свободная: ВКЛ";
    $("view-label").textContent="Ракурс: свободный";
    $("telemetry").classList.add("collapsed");
    $("hide-hud").textContent="▸ Показать";
  }else{
    const t=free.targetAt(14);
    free.stop();controls.enabled=true;
    controls.target.set(t.x,t.y,t.z);
    controls.update();
    document.body.classList.remove("fly-mode");
    $("freecam-toggle").classList.remove("active");
    $("freecam-toggle").setAttribute("aria-pressed","false");
    $("freecam-toggle").textContent="✥ Свободная камера";
    $("view-label").textContent="Ракурс: осмотр";
  }
}
$("freecam-toggle").addEventListener("click",()=>toggleFreeCamera());
$("hide-hud").addEventListener("click",()=>{
  const collapsed=$("telemetry").classList.toggle("collapsed");
  $("hide-hud").textContent=collapsed?"▸ Показать":"▾ Свернуть";
});
$("stick-zone").addEventListener("pointerdown",e=>{
  if(!activeFly()||stickPointer!==null)return;
  e.preventDefault();stickPointer=e.pointerId;
  stick.setPointerCapture?.(e.pointerId);
  moveStick(e);
});
function moveStick(e){
  if(e.pointerId!==stickPointer)return;
  const rect=stick.getBoundingClientRect();
  const p=normalizedStick(e.clientX,e.clientY,rect);
  free.setStick(p.x,p.z);
  const r=Math.min(rect.width,rect.height)*.39;
  knob.style.left=(rect.width/2+p.x*r)+"px";
  knob.style.top=(rect.height/2-p.z*r)+"px";
}
$("stick-zone").addEventListener("pointermove",moveStick);
for(const event of ["pointerup","pointercancel","lostpointercapture"]){
  stick.addEventListener(event,e=>{
    if(e.pointerId===stickPointer)centerStick();
  });
}
// Hold-to-elevate works simultaneously with horizontal joystick and look swipe.
function refreshVertical(){
  free.setVertical((verticalPressed.has(1)?1:0)-(verticalPressed.has(-1)?1:0));
}
for(const [id,dir] of [["fly-up",1],["fly-down",-1]]){
  const el=$(id);
  el.addEventListener("pointerdown",e=>{
    if(!activeFly())return;
    e.preventDefault();el.setPointerCapture?.(e.pointerId);
    verticalPressed.add(dir);
    refreshVertical();
    el.classList.add("held");
  });
  for(const event of ["pointerup","pointercancel","lostpointercapture"]){
    el.addEventListener(event,()=>{
      verticalPressed.delete(dir);
      refreshVertical();
      el.classList.remove("held");
    });
  }
}
$("fly-boost").addEventListener("click",()=>{
  free.boost=!free.boost;
  $("fly-boost").classList.toggle("active",free.boost);
  $("fly-boost").setAttribute("aria-pressed",String(free.boost));
});
const stageCanvas=renderer.domElement;
stageCanvas.addEventListener("pointerdown",e=>{
  if(!activeFly()||lookPointer!==null)return;
  e.preventDefault();lookPointer=e.pointerId;
  lookX=e.clientX;lookY=e.clientY;
  stageCanvas.setPointerCapture?.(lookPointer);
});
stageCanvas.addEventListener("pointermove",e=>{
  if(!activeFly()||e.pointerId!==lookPointer)return;
  const dx=e.clientX-lookX,dy=e.clientY-lookY;
  free.look(dx,dy);
  lookX=e.clientX;lookY=e.clientY;
});
for(const name of ["pointerup","pointercancel","lostpointercapture"]){
  stageCanvas.addEventListener(name,e=>{
    if(e.pointerId===lookPointer)lookPointer=null;
  });
}
const movementKeys=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE",
  "Space","ArrowUp","ArrowLeft","ArrowDown","ArrowRight","ControlLeft",
  "ShiftLeft","ShiftRight"]);
window.addEventListener("keydown",e=>{
  if(!activeFly()||!movementKeys.has(e.code))return;
  e.preventDefault();free.keys.add(e.code);
});
window.addEventListener("keyup",e=>free.keys.delete(e.code));
window.addEventListener("blur",releaseInputs);
// Reset is intentionally different by mode: free mode resets to a safe pose
// and stays free; orbit mode returns to ¾.
$("reset").addEventListener("click",()=>{
  if(!activeFly())return;
  free.stop();controls.enabled=true;
  controls.target.set(0,8,0);setView("threequarter");
  free.start(controls.target);controls.enabled=false;
  $("view-label").textContent="Ракурс: свободный";
  releaseInputs();
});

const status=$("status");
if(stats.entrances!==4||stats.balconies<10||stats.windows<200){
 status.hidden=false;status.textContent="Ошибка геометрического контракта";
}
function resize(){
 camera.aspect=Math.max(.2,innerWidth/innerHeight);camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
 applyQuality();setView(viewName);
}
window.addEventListener("resize",resize);
window.addEventListener("orientationchange",()=>setTimeout(resize,200));
applyTime();resize();
let frameAt=performance.now(),frames=0,lastTick=performance.now();
function animate(){
 requestAnimationFrame(animate);
 const current=performance.now();
 const dt=Math.min(.05,Math.max(0,(current-lastTick)/1000));
 lastTick=current;
 if(activeFly()){
   free.update(dt);
   $("free-position").textContent="XYZ: "+
     camera.position.x.toFixed(1)+" / "+camera.position.y.toFixed(1)+" / "+camera.position.z.toFixed(1);
 }else{
   controls.update();
   $("free-position").textContent="";
 }
 renderer.render(scene,camera);frames++;
 const now=performance.now();
 if(now-frameAt>1100){
  $("fps").textContent="FPS: "+Math.round(frames*1000/(now-frameAt));
  $("render").textContent="Рис.: "+renderer.info.render.calls+" · Трис.: "+Math.round(renderer.info.render.triangles/1000)+"k";
  frames=0;frameAt=now;
 }
}
animate();window.buildingLabReady=true;
