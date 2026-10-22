import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {BUILDING,buildApartmentHouse} from "./building.js";
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
$("reset").addEventListener("click",()=>{controls.target.set(0,8,0);setView("threequarter");});
$("building-info").textContent=config.floors+" этажей · "+stats.entrances+" подъезда · "+stats.balconies+" балконов";
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
let frameAt=performance.now(),frames=0;
function animate(){
 requestAnimationFrame(animate);
 controls.update();renderer.render(scene,camera);frames++;
 const now=performance.now();
 if(now-frameAt>1100){
  $("fps").textContent="FPS: "+Math.round(frames*1000/(now-frameAt));
  $("render").textContent="Рис.: "+renderer.info.render.calls+" · Трис.: "+Math.round(renderer.info.render.triangles/1000)+"k";
  frames=0;frameAt=now;
 }
}
animate();window.buildingLabReady=true;
