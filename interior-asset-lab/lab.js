import * as THREE from "three";
import {INTERIOR_ASSET_BY_ID,buildIsolatedInteriorModel} from
  "../models/interior-assets.js?v=50";
const $=id=>document.getElementById(id);
const id=new URL(location.href).searchParams.get("model");
const item=INTERIOR_ASSET_BY_ID[id];
if(!item){
  $("fail").hidden=false;$("fail").textContent="Модель не найдена: "+(id||"без ID");
  throw Error("Unknown interior model: "+id);
}
$("title").textContent=item.name;
$("info").textContent="№ "+String(item.modelNumber).padStart(3,"0")+
 " · размер "+item.w.toFixed(2)+" × "+item.d.toFixed(2)+" × "+
 item.h.toFixed(2)+" м · процедурная модель MINI CITY";
const scene=new THREE.Scene();scene.background=new THREE.Color(0x91a2a4);
const camera=new THREE.PerspectiveCamera(50,1,.07,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
$("stage").appendChild(renderer.domElement);
const body=buildIsolatedInteriorModel(THREE,id).root;
scene.add(body);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(7,7),
  new THREE.MeshStandardMaterial({color:0x829795,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
scene.add(new THREE.HemisphereLight(0xdde8e3,0x62716d,2.3));
const sun=new THREE.DirectionalLight(0xffe8c4,2.8);
sun.position.set(-3,7,5);scene.add(sun);
const centre=new THREE.Vector3(0,Math.max(.3,item.h*.48),0);
let radius=Math.max(2.6,Math.max(item.w,item.d,item.h)*2.2);
let az=.65,elev=.50;
function updateCamera(){
 const dx=Math.cos(elev)*Math.sin(az),dy=Math.sin(elev),
   dz=Math.cos(elev)*Math.cos(az);
 camera.position.copy(centre).add(new THREE.Vector3(dx,dy,dz).multiplyScalar(radius));
 camera.lookAt(centre);
}
updateCamera();
const setView=v=>{
 const viewpoints={front:[0,.20],side:[Math.PI/2,.20],
  top:[0,1.44],three:[.65,.50]};
 const pos=viewpoints[v]||viewpoints.three;[az,elev]=pos;updateCamera();
};
for(const b of document.querySelectorAll("[data-view]"))
 b.addEventListener("click",()=>setView(b.dataset.view));
let pressed=null,pinchDistance=0;
const canvas=renderer.domElement;
canvas.addEventListener("pointerdown",e=>{
 canvas.setPointerCapture(e.pointerId);pressed={x:e.clientX,y:e.clientY,id:e.pointerId};});
canvas.addEventListener("pointermove",e=>{
 if(!pressed||e.pointerId!==pressed.id)return;
 az+=(e.clientX-pressed.x)*.009;
 elev=Math.min(1.49,Math.max(-.10,elev+(e.clientY-pressed.y)*.007));
 pressed.x=e.clientX;pressed.y=e.clientY;updateCamera();
});
canvas.addEventListener("pointerup",()=>pressed=null);
canvas.addEventListener("pointercancel",()=>pressed=null);
canvas.addEventListener("wheel",e=>{e.preventDefault();radius=Math.max(1,Math.min(15,radius+e.deltaY*.004));updateCamera();},{passive:false});
function resize(){
 const w=window.innerWidth,h=window.innerHeight;
 renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener("resize",resize);resize();
function frame(){requestAnimationFrame(frame);renderer.render(scene,camera);}
frame();
