import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {buildIsolatedStreetAsset,ISOLATED_ASSETS} from "./asset.js";
import {mountInspectionFlight} from "../object-viewer/free-flight.js";

const $=id=>document.getElementById(id);
const id=new URL(window.location.href).searchParams.get("model");
if(!Object.hasOwn(ISOLATED_ASSETS,id)){
 $("fail").hidden=false;
 $("fail").textContent="Неизвестная модель. Вернитесь в каталог и выберите объект.";
 throw Error("Unknown isolated asset: "+String(id));
}
const {root,spec}=buildIsolatedStreetAsset(THREE,id);
$("title").textContent="№ "+String(spec.number).padStart(3,"0")+" — "+spec.name;
document.title="MINI CITY — "+spec.name;
$("description").textContent=spec.quantity>0?
 "Реальная геометрия игрового дерева: "+spec.quantity+" экземпляров в городе. Здесь один.":
 "Уникальный вид дерева в отдельной лаборатории; пока не размещён в городе.";
$("back").href="../studio/catalog.html?category="+spec.category;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xa1b4bd);
scene.add(new THREE.HemisphereLight(0xd7f1f1,0x62716e,2.3));
const sun=new THREE.DirectionalLight(0xffdfb2,2.3);
sun.position.set(-4,8,6);scene.add(sun);
const plane=new THREE.Mesh(new THREE.PlaneGeometry(11,11),
 new THREE.MeshStandardMaterial({color:0x8d9d97,roughness:1}));
plane.rotation.x=-Math.PI/2;plane.position.y=-.05;
scene.add(plane);
scene.add(root);
const camera=new THREE.PerspectiveCamera(48,Math.max(.25,innerWidth/innerHeight),.07,90);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.3));
$("stage").append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;orbit.dampingFactor=.09;
orbit.enablePan=true;orbit.screenSpacePanning=true;
orbit.minDistance=.85;orbit.maxDistance=30;
orbit.minPolarAngle=.02;orbit.maxPolarAngle=Math.PI-.12;
const subject=new THREE.Vector3(0,spec.y,0);
function setView(name){
 const angles={threequarter:[1,.54,1],front:[0,.2,1],side:[1,.3,0],top:[.08,1,.08]};
 const v=angles[name];if(!v)return;
 const d=spec.distance*(name==="top"?.90:1);
 const offset=new THREE.Vector3(...v).normalize().multiplyScalar(d);
 orbit.target.copy(subject);camera.position.copy(subject).add(offset);
 orbit.update();
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
$("reset").addEventListener("click",()=>setView("threequarter"));
$("collapse").addEventListener("click",()=>{
 const folded=$("telemetry").classList.toggle("collapsed");
 $("collapse").setAttribute("aria-expanded",String(!folded));
});
setView("threequarter");
const flight=mountInspectionFlight({camera,orbit,canvas:renderer.domElement,
 resetPose:()=>setView("threequarter"),speed:2.4});
let triangles=0;
const used=new Set();
root.traverse(o=>{
 if(!o.isMesh)return;
 const count=o.geometry.index?.count||o.geometry.attributes.position.count;
 triangles+=Math.floor(count/3)*(o.isInstancedMesh?o.count:1);
 const mats=Array.isArray(o.material)?o.material:[o.material];
 mats.forEach(m=>used.add(m));
});
const box=new THREE.Box3().setFromObject(root),sz=box.getSize(new THREE.Vector3());
$("tris").textContent="Треугольники модели: "+triangles;
$("materials").textContent="Материалы модели: "+used.size;
$("size").textContent="Габариты: "+sz.x.toFixed(2)+" × "+sz.y.toFixed(2)+" × "+sz.z.toFixed(2)+" м";
$("scene-status").textContent=spec.quantity>0?
 "В городе: "+spec.quantity+" шт. · просмотр одного дерева":
 "Прототип отдельного дерева · пока нет в городе";
function resize(){
 camera.aspect=Math.max(.25,innerWidth/innerHeight);
 camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);
}
window.addEventListener("resize",resize);resize();
let count=0,start=performance.now(),last=start;
function tick(now){
 requestAnimationFrame(tick);
 const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;
 if(flight.active)flight.update(dt);else orbit.update();
 renderer.render(scene,camera);
 count++;
 if(now-start>=1000){
  $("fps").textContent="FPS: "+Math.round(count*1000/(now-start));
  $("calls").textContent="Вызовы сцены: "+renderer.info.render.calls+
    " · трис. сцены: "+renderer.info.render.triangles;
  start=now;count=0;
 }
}
requestAnimationFrame(tick);
