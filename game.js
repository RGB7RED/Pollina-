import * as THREE from "three";
import { buildDistrictBuildings, buildDistrictProps, decorateCentralBlocks } from "./district.js";
import { ENTRANCES, FLOOR_HEIGHT, indoorBlocked, indoorFloorHeight, nearIndoorObject, buildInteriors } from "./interiors.js";
import { createCharacterFactory } from "./characters.js";

const $ = (id) => document.getElementById(id);
const host = $("screen");
const ui = $("ui");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
let renderScale=Math.min(window.devicePixelRatio||1,1.35);
renderer.setPixelRatio(renderScale);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(innerWidth<innerHeight?63:59, innerWidth / innerHeight, .12, 260);
const hemi = new THREE.HemisphereLight(0xe7f3ff, 0x4e5763, 2.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b5, 2.8);
sun.position.set(45, 84, 28);
sun.castShadow = true;
sun.shadow.mapSize.set(768, 768);
sun.shadow.camera.left = -65; sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65; sun.shadow.camera.bottom = -65;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 190;
sun.shadow.bias = -.0004;
scene.add(sun, sun.target);
scene.fog = new THREE.Fog(0xbdd9e3, 85, 160);
const world = new THREE.Group();
scene.add(world);

let seed = 731;
function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .91, ...extra });
const M = {
  grass: mat(0x718566), asphalt: mat(0x343c43), curb: mat(0xc2c5b7),
  pavement: mat(0xa4aea5), white: mat(0xf1e4be), dark: mat(0x233044),
  window: mat(0x263e53, { metalness: .13, roughness: .26 }),
  glowing: mat(0xfad58b, { emissive: 0xffb755, emissiveIntensity: .08 }),
  trunk: mat(0x655448), leaf: [mat(0x4c7b5d), mat(0x588a69), mat(0x73945f)],
  metal: mat(0x62696f, { metalness: .45 }), tyre: mat(0x202329),
  roof: mat(0x595c59), sidewalkLine: mat(0xd8d5c2),
  skin: mat(0xf4b896), hair: mat(0x30262b), shoes: mat(0x2b3038),
};
const geomBox = new THREE.BoxGeometry(1, 1, 1);
const geomSphere = new THREE.SphereGeometry(1, 9, 7);
const geomCylinder = new THREE.CylinderGeometry(1, 1, 1, 9);
const colliders = [];
const cameraObstacles = [];
function box(w, h, d, material, x = 0, y = 0, z = 0, parent = world, solid = false) {
  const mesh = new THREE.Mesh(geomBox, material);
  mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
  mesh.receiveShadow = true; mesh.castShadow = h > 1.3;
  parent.add(mesh);
  if (solid) { colliders.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2 }); cameraObstacles.push(mesh); }
  return mesh;
}
// Merge static facade details into InstancedMesh batches (few draw calls on iPhone).
const decoBatches=new Map();
const decorDummy=new THREE.Object3D();
function decorationBox(w,h,d,material,x=0,y=0,z=0,parent=world){
  if(parent!==world)return box(w,h,d,material,x,y,z,parent,false);
  decorDummy.position.set(x,y,z);decorDummy.rotation.set(0,0,0);
  decorDummy.scale.set(w,h,d);decorDummy.updateMatrix();
  if(!decoBatches.has(material))decoBatches.set(material,[]);
  decoBatches.get(material).push(decorDummy.matrix.clone());
  return null;
}
function flushDecorationBoxes(){
  for(const [material,list] of decoBatches){
    if(!list.length)continue;
    const mesh=new THREE.InstancedMesh(geomBox,material,list.length);
    for(let i=0;i<list.length;i++)mesh.setMatrixAt(i,list[i]);
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=true;
    world.add(mesh);
  }
  decoBatches.clear();
}

function cyl(rt, rb, height, material, x, y, z, parent = world) {
  const mesh = new THREE.Mesh(geomCylinder, material);
  mesh.scale.set(rt, height, rb); // used for circular poles with equal radii
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function orb(r, material, x, y, z, parent = world) {
  const mesh = new THREE.Mesh(geomSphere, material);
  mesh.scale.setScalar(r); mesh.position.set(x, y, z); mesh.castShadow = true;
  parent.add(mesh); return mesh;
}
// 0.2.1: Roads, sidewalks and markings used to be hundreds of individual
// meshes/draw calls. Accumulate fixed floor geometry per material and render
// each group as one instanced mesh.
const flatBatches=new Map();
const flatDummy=new THREE.Object3D();
function flat(w,d,material,x,z,y=.022){
  flatDummy.position.set(x,y,z);
  flatDummy.rotation.set(0,0,0);
  flatDummy.scale.set(w,.035,d);
  flatDummy.updateMatrix();
  if(!flatBatches.has(material))flatBatches.set(material,[]);
  flatBatches.get(material).push(flatDummy.matrix.clone());
}
function flushFlats(){
  for(const [material,instances] of flatBatches){
    const mesh=new THREE.InstancedMesh(geomBox,material,instances.length);
    instances.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.instanceMatrix.needsUpdate=true;
    mesh.receiveShadow=true;mesh.castShadow=false;
    mesh.computeBoundingSphere();
    world.add(mesh);
  }
  flatBatches.clear();
}
function label(text, color = "#f9eed5", bg = "#1b3543", width = 4.6, height = .9) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = "#ffffff44"; g.lineWidth = 7; g.strokeRect(5, 5, 502, 118);
  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "800 47px system-ui, sans-serif"; g.fillText(text, 256, 69, 480);
  const texture = new THREE.CanvasTexture(cv); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide }));
  const other=mesh.clone(); other.rotation.y=Math.PI;
  const sign=new THREE.Group();sign.add(mesh,other);
  return sign;
}

function street() {
  // Nine junctions, three north–south and three east–west roads.
  // Approximately 3.6x the land area of the 0.1 prototype.
  flat(328, 328, M.grass, 0, 0, -.08);
  const avenues=[-91,0,91];
  const segments=[[-126,56],[-45.5,76],[45.5,76],[126,56]];
  for(const road of avenues){
    flat(14,310,M.asphalt,road,0,.012);
    flat(310,14,M.asphalt,0,road,.013);
    for(const side of [-1,1]){
      for(const [center,len] of segments){
        flat(4,len,M.pavement,road+side*9.2,center,.073);
        flat(len,4,M.pavement,center,road+side*9.2,.074);
        flat(.22,len,M.curb,road+side*7.15,center,.112);
        flat(len,.22,M.curb,center,road+side*7.15,.112);
      }
    }
    for(let v=-149;v<150;v+=10){
      if(avenues.some(c=>Math.abs(v-c)<12))continue;
      flat(.18,4.3,M.white,road,v,.065);
      flat(4.3,.18,M.white,v,road,.065);
    }
  }
  // Crossing stripes at intersections; finite parts stay clear of the carriageway.
  for(const cx of avenues)for(const cz of avenues){
    for(let t=-5;t<=5;t+=2){
      flat(1.05,.49,M.white,cx+t,cz-8.3,.09);
      flat(1.05,.49,M.white,cx+t,cz+8.3,.09);
      flat(.49,1.05,M.white,cx-8.3,cz+t,.09);
      flat(.49,1.05,M.white,cx+8.3,cz+t,.09);
    }
  }
  const paving=mat(0x9b9c90);
  for(const [x,z] of [[-47,77],[48,-77],[121,-77],[-121,77]]){
    flat(21,12,paving,x,z,.025);
  }
}
street();

const walls = [mat(0xaaa99c), mat(0xc1b29d), mat(0x94a8a0), mat(0xd2b6a7), mat(0xb4ab99), mat(0xc0bfaa)];
const brick = mat(0x7b6259);
const litWindows = [];
const darkWindows = [];
const wallTexture = new THREE.Matrix4();
const dummy = new THREE.Object3D();
function queueWindow(x, y, z, facing, lit) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, facing, 0);
  dummy.scale.set(.95, 1.12, .09);
  dummy.updateMatrix();
  (lit ? litWindows : darkWindows).push(dummy.matrix.clone());
}
const doors = [];
function building(x, z, w, d, floors, style, shop = false) {
  const h = floors * 3.05;
  const body = box(w, h, d, walls[style % walls.length], x, h / 2, z, world, true);
  body.castShadow = true;
  box(w + .5, .5, d + .5, M.roof, x, h + .25, z);
  for (let f = 1; f < floors; f++) {
    decorationBox(w + .07, .11, d + .07, brick, x, f * 3.05, z);
  }
  const alongX = Math.floor((w - 2.8) / 2.55);
  const alongZ = Math.floor((d - 2.8) / 2.6);
  for (let f = 0; f < floors; f++) {
    if (shop && f === 0) continue;
    const y = f * 3.05 + 1.82;
    for (let i = 0; i < alongX; i++) {
      const xx = x + (i - (alongX - 1) / 2) * 2.55;
      queueWindow(xx, y, z - d / 2 - .07, 0, rand() < .25);
      queueWindow(xx, y, z + d / 2 + .07, 0, rand() < .22);
    }
    for (let i = 0; i < alongZ; i++) {
      const zz = z + (i - (alongZ - 1) / 2) * 2.6;
      queueWindow(x - w / 2 - .07, y, zz, Math.PI / 2, rand() < .2);
      queueWindow(x + w / 2 + .07, y, zz, Math.PI / 2, rand() < .2);
    }
  }
  const frontZ = z - d / 2;
  if (shop) {
    box(w - .2, 3.1, .18, M.dark, x, 1.52, frontZ - .17);
    const sign = label("ПРОДУКТЫ 24", "#ffe9ae", "#354e59", 6.5, 1);
    sign.position.set(x, 2.65, frontZ - .33); sign.rotation.y=Math.PI; world.add(sign);
    const dPivot = new THREE.Group();
    dPivot.position.set(x - 1.05, 0, frontZ - .33); world.add(dPivot);
    box(2, 2.25, .13, M.window, 1, 1.14, 0, dPivot);
    orb(.08, M.glowing, 1.84, 1.08, -.10, dPivot);
    doors.push({ pivot: dPivot, x, z: frontZ - 2.1, opened: 0, title: "Магазин" });
    box(2.8, .17, 1.45, M.pavement, x, .11, frontZ - 1.08);
  } else {
    box(2, 2.7, .15, M.dark, x, 1.35, frontZ - .12);
    const awning = box(3.3, .3, 1.5, M.roof, x, 2.85, frontZ - .9);
    awning.castShadow = true;
  }
}
building(-32, -35, 18, 19, 5, 2);
building(-56, -32, 18, 21, 4, 4);
building(-32, 30, 20, 18, 5, 1, true);
building(-58, 36, 16, 21, 3, 0);
building(32, -34, 21, 19, 5, 3);
building(59, -33, 17, 17, 4, 2);
building(34, 37, 18, 22, 5, 5);
building(60, 37, 18, 22, 3, 1);
building(50, 68, 18, 11, 3, 0);
decorateCentralBlocks({box:decorationBox,mat});
const additionalBuildings=buildDistrictBuildings({building,box:decorationBox,flat,mat,world,walls});
function windows(list, material) {
  const mesh = new THREE.InstancedMesh(geomBox, material, list.length);
  list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
  mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); world.add(mesh);
}
windows(darkWindows, M.window);
windows(litWindows, M.glowing);

const grass2 = mat(0x83936c);
const leafLight = mat(0x87a470);
const treeGroups=[];
const streetProps=[];
function tree(x,z,type=0){
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
  const height=3.7+rand()*2;
  cyl(.19,.22,height,M.trunk,0,height/2,0,g);
  const green=M.leaf[type%M.leaf.length];
  const a=orb(1.35,green,0,height+.45,0,g);
  const b=orb(1.15,green,.67,height+.18,.2,g);
  const c=orb(1.05,type%3===0?leafLight:green,-.5,height+.72,-.4,g);
  // Avoid expensive foliage shadow-map casters on mobile; trunks remain.
  a.castShadow=b.castShadow=c.castShadow=false;
  treeGroups.push({g,x,z});
}

const treePositions = [
  [-13,-59],[-13,-44],[-13,-17],[-13,17],[-13,50],[-13,64],
  [13,-61],[13,-45],[13,-17],[13,18],[13,39],[13,60],
  [-64,-15],[-46,-15],[-24,-14],[23,-14],[51,-14],[68,-14],
  [-64,14],[-47,14],[-19,14],[19,15],[47,14],[66,14],
  [48,53],[66,55],[-48,56],[-31,56]
];
treePositions.forEach(([x, z], i) => tree(x, z, i));

const benches=[];
function bench(x, z, rotation = 0) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; world.add(group);
  streetProps.push({g:group,x,z});
  benches.push({group,x,z,rotation});
  box(2.5, .2, .65, mat(0x886d54), 0, .78, 0, group);
  box(2.5, .75, .15, mat(0x886d54), 0, 1.19, .3, group);
  for (const s of [-1, 1]) box(.13, .7, .6, M.metal, s, .38, 0, group);
}
bench(16, 25, Math.PI / 2);
bench(52, 53, 0);
bench(-18, -52, Math.PI / 2);
function lamp(x,z){
  const group=new THREE.Group();group.position.set(x,0,z);world.add(group);
  streetProps.push({g:group,x,z});
  cyl(.10,.10,7.5,M.metal,0,3.75,0,group);
  box(1.4,.11,.11,M.metal,.58,7.4,0,group);
  box(.65,.24,.65,M.glowing,1.1,7.3,0,group);
  const light=new THREE.PointLight(0xffd28d,0,15,2);
  light.position.set(x+1.1,7.2,z);
  light.visible=false;light.castShadow=false;
  world.add(light);nightLights.push(light);
}

const nightLights = [];
// Street lighting
for (const [x,z] of [[-12,-63],[-12,-26],[-12,25],[-12,61],[12,-61],[12,-24],[12,29],[12,64],[-59,12],[-23,12],[24,12],[57,12]]) lamp(x,z);
const signM = mat(0x30405a);
function roadSign(x,z,text) {
  cyl(.095,.095,3.7,M.metal,x,1.85,z);
  const board=label(text, "#ffffff","#2f6499",2.5,.68);
  board.position.set(x,3.25,z); world.add(board);
}
roadSign(-11.7,-8.1,"УЛ. МИРА");
roadSign(17,8.5,"ЦЕНТР");
function trafficLight(x,z) {
  cyl(.11,.11,4.7,M.metal,x,2.35,z);
  box(.72,2.0,.55,signM,x,3.85,z);
  for (let i=0;i<3;i++) orb(.23,mat([0xbe5148,0xb6a15c,0x5b9671][i],{emissive:[0xa62014,0x665c09,0x143c29][i],emissiveIntensity:.4}),x,4.43-i*.63,z+.31);
}
trafficLight(-7.8,-7.8);
trafficLight(7.8,7.8);

function busStop(x,z) {
  box(4.6,.18,2.0,M.dark,x,2.9,z);
  for (const s of [-1,1]) cyl(.085,.085,2.8,M.metal,x+s*2,1.4,z-.72);
  box(4.45,2.5,.08,M.window,x,1.25,z+.92);
  bench(x, z+.05);
  const sign=label("ОСТАНОВКА","#ffffff","#3e6777",3.9,.6);
  sign.position.set(x,2.5,z-.81);world.add(sign);
}
busStop(19,-24);

const carColors = [0xcdb569,0x738ca0,0xb45c5b,0xe4ddd0,0x5a7470];
const cars = [];
function car(x,z,color,rot = 0) {
  const g = new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;world.add(g);
  const bodyMat=mat(color,{metalness:.23,roughness:.44});
  box(2.05,.75,4.05,bodyMat,0,.75,0,g);
  box(1.85,.8,2.05,bodyMat,0,1.44,-.24,g);
  box(1.61,.56,.11,M.window,0,1.47,-1.33,g);
  box(1.61,.56,.11,M.window,0,1.47,.83,g);
  for (const sx of [-1,1]) {
    const side=box(.1,.52,1.5,M.window,sx*.94,1.48,-.25,g);
    for (const sz of [-1.3,1.3]) {
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.22,12),M.tyre);
      wheel.rotation.z=Math.PI/2;wheel.position.set(sx*1.03,.46,sz);g.add(wheel);
    }
  }
  for (const sx of [-.66,.66]) {
    box(.36,.19,.08,M.glowing,sx, .8,-2.06,g);
    box(.36,.19,.08,mat(0xab4648),sx,.8,2.06,g);
  }
  const halfW=rot===0?1.1:2.15, halfD=rot===0?2.15:1.1;
  colliders.push({x1:x-halfW,x2:x+halfW,z1:z-halfD,z2:z+halfD});
  cars.push({g,x,z,rot});
  return g;
}
car(-5.25,-24,carColors[0],0);
car(5.3,36,carColors[2],0);
car(-5.3,58,carColors[4],0);
car(5.2,-53,carColors[1],0);
car(28,5.1,carColors[3],Math.PI/2);
car(-41,-5.1,carColors[1],Math.PI/2);
buildDistrictProps({tree,bench,lamp,car,roadSign,box:decorationBox,flat,mat});
flushDecorationBoxes();
flushFlats();
const lobbies=buildInteriors({THREE,scene,world,box,mat,label,orb});

const human=createCharacterFactory(THREE);
const player = human(0);
player.g.position.set(0,0,15);
scene.add(player.g);
const avatar = {x:0,y:0,z:15,vy:0,angle:0,inCar:null,inLobby:null,sitting:null};
const smoothVelocity=new THREE.Vector2(0,0);
function animateHuman(h,velocity,t,seated=false,dt=.016) {
  h.setPose(velocity,t,seated,dt);
}
const npcs = [];
for (let i=0;i<5;i++) {
  const person=human(i+1);
  const vertical=i<3;
  const lane=vertical?(i%2?12.0:-12.3):0;
  const first=vertical ? (i===0?-58:i===1?19:48) : (i===3?-63:27);
  const fixed=vertical?lane:(i===3?-12.1:12.4);
  const from=first, to=first+(i%2?15:-18);
  person.g.position.set(vertical?fixed:from,0,vertical?from:fixed);
  scene.add(person.g);
  npcs.push({person, vertical, fixed, from, to, progress:rand(), dir:i%2?1:-1, speed:.65+rand()*.45});
}

// Additional small groups of residents, distributed across outer districts.
// Update budget is distance-aware; more complex schedules arrive in 0.3.
for(let i=0;i<12;i++){
  const person=human(i+2);
  const vertical=(i%2===0);
  const fixed=([-103,-12.3,12.3,103][i%4]);
  const from=[-134,-118,-58,-41,39,58,118,135][i%8];
  const to=from+(i%3===0?20:-23);
  person.g.position.set(vertical?fixed:from,0,vertical?from:fixed);
  scene.add(person.g);
  npcs.push({person,vertical,fixed,from,to,progress:rand(),dir:i%2?1:-1,speed:.7+rand()*.6,pause:rand()*2});
}

// Two citizens prefer to rest on courtyard benches rather than patrol.
const benchResidents=[{index:6,x:52,z:53,rotation:0},{index:11,x:-18,z:-52,rotation:Math.PI/2}];
for(const rest of benchResidents){
  const n=npcs[rest.index];
  if(!n)continue;
  n.role="rest";
  n.restAt=rest;
  n.person.g.position.set(rest.x,-.16,rest.z);
  n.person.g.rotation.y=rest.rotation;
  n.person.setPose(0,0,true,1);
}

const poiDefs=[
  {title:"МАГАЗИН",x:-31,z:13.8},
  {title:"ОСТАНОВКА",x:19,z:-24},
  {title:"ДВОР",x:48,z:52},
];
const markerMat=mat(0xffce75,{emissive:0xffb74b,emissiveIntensity:1.2});
const foundMarker=mat(0x76d3ac,{emissive:0x35cc83,emissiveIntensity:.6});
const pois=poiDefs.map((p)=>{
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.2,.065,6,32),markerMat);
  ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.18,p.z);world.add(ring);
  const dot=orb(.23,markerMat,p.x,2.3,p.z);
  return {...p,found:false,ring,dot};
});
const questLine=$("quest-line"),questFill=$("quest-fill");
function notice(msg, duration=3000) {
  const toast=$("toast");toast.textContent=msg;toast.classList.add("show");
  clearTimeout(notice.timer);notice.timer=setTimeout(()=>toast.classList.remove("show"),duration);
}
function lookForPlaces() {
  for (const p of pois) {
    if (!p.found && Math.hypot(p.x-avatar.x,p.z-avatar.z)<4) {
      p.found=true;p.ring.material=foundMarker;p.dot.material=foundMarker;
      const count=pois.filter(v=>v.found).length;
      questLine.textContent="Найдено мест: "+count+" / 3";
      questFill.style.width=(count/3*100)+"%";
      notice(count===3?"🏆 Район исследован! Гуляй дальше.":"📍 Открыто место: "+p.title,3800);
    }
  }
}
const timeModes=[
  {name:"☀️ ДЕНЬ",sky:0xbdd9e3,ambient:2.2,sun:2.8,night:0, tint:0xffe2b5,fog:0xbdd9e3, exposure:1.22},
  {name:"🌇 ВЕЧЕР",sky:0xcb8e82,ambient:1.4,sun:1.9,night:.6,tint:0xffa36d,fog:0xd49e91, exposure:1.2},
  {name:"🌙 НОЧЬ",sky:0x172638,ambient:.6,sun:.42,night:1.8,tint:0x779ac7,fog:0x233850, exposure:1.4},
  {name:"🌅 УТРО",sky:0xbcc8dd,ambient:1.7,sun:2.0,night:.25,tint:0xffc99a,fog:0xb9c8d4, exposure:1.24}
];
let timeIndex=0;
// Limit expensive dynamic point lights to the four closest lamps.
// Street-lamp emissive geometry stays visible everywhere.
let lightUpdateAt=-10;
function refreshStreetLights(){
  if(!nightLights.length)return;
  const intensity=timeModes[timeIndex].night;
  if(intensity<=0){
    for(const light of nightLights){light.intensity=0;light.visible=false;}
    return;
  }
  const closest=nightLights.map(light=>({
    light,
    distance:(light.position.x-avatar.x)**2+(light.position.z-avatar.z)**2
  })).filter(item=>item.distance<43*43).sort((a,b)=>a.distance-b.distance);
  const selected=new Set(closest.slice(0,4).map(item=>item.light));
  for(const light of nightLights){
    light.visible=selected.has(light);
    light.intensity=light.visible?intensity:0;
  }
}

function setTime(index){
  timeIndex=index%timeModes.length;
  const t=timeModes[timeIndex];
  scene.background=new THREE.Color(t.sky);scene.fog.color.setHex(t.fog);
  hemi.intensity=t.ambient;sun.intensity=t.sun;sun.color.setHex(t.tint);
  sun.position.set(avatar.x+(timeIndex===2?-25:45),timeIndex===1?35:84,avatar.z+28);
  sun.target.position.set(avatar.x,0,avatar.z);
  sun.target.updateMatrixWorld();
  refreshStreetLights();
  M.glowing.emissiveIntensity=.08+t.night*.65;
  renderer.toneMappingExposure=t.exposure;
  $("btn-time").textContent=t.name;
}
setTime(0);

const joystick=$("joystick"),stick=$("stick");
const joy={x:0,y:0,id:null};
function joyAt(e) {
  const b=joystick.getBoundingClientRect();
  const cx=b.left+b.width/2,cy=b.top+b.height/2;
  const max=b.width*.33;
  const dx=e.clientX-cx,dy=e.clientY-cy;
  const n=Math.max(1,Math.hypot(dx,dy)/max);
  joy.x=dx/n/max;joy.y=dy/n/max;
  stick.style.left=(50+joy.x*33)+"%";stick.style.top=(50+joy.y*33)+"%";
}
joystick.addEventListener("pointerdown",e=>{e.preventDefault();if(joy.id!==null)return;joy.id=e.pointerId;joystick.setPointerCapture(e.pointerId);joyAt(e);});
joystick.addEventListener("pointermove",e=>{if(joy.id===e.pointerId){e.preventDefault();joyAt(e);}});
function clearJoy(e){if(joy.id!==e.pointerId)return;joy.id=null;joy.x=joy.y=0;stick.style.left="50%";stick.style.top="50%";}
joystick.addEventListener("pointerup",clearJoy);joystick.addEventListener("pointercancel",clearJoy);
let yaw=.43,pitch=.26,zoom=innerWidth<innerHeight?12.1:10.5;
const pointers=new Map();
let drag=null,pinch=null;
const surface=renderer.domElement;
surface.addEventListener("pointerdown",e=>{
  if(!running)return;
  e.preventDefault();surface.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)drag={id:e.pointerId,x:e.clientX,y:e.clientY};
  if(pointers.size===2){
    const [p,q]=[...pointers.values()];
    pinch={distance:Math.max(8,Math.hypot(p.x-q.x,p.y-q.y)),zoom};
    drag=null;
  }
});
surface.addEventListener("pointermove",e=>{
  if(!pointers.has(e.pointerId))return;
  e.preventDefault();
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2&&pinch){
    const [p,q]=[...pointers.values()];
    const d=Math.max(8,Math.hypot(p.x-q.x,p.y-q.y));
    zoom=THREE.MathUtils.clamp(pinch.zoom*pinch.distance/d,5.6,19);
    return;
  }
  if(drag?.id===e.pointerId){
    yaw-=(e.clientX-drag.x)*.0055;
    pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.0045,.11,1.0);
    drag.x=e.clientX;drag.y=e.clientY;
  }
});
function releaseCameraPointer(e){
  pointers.delete(e.pointerId);
  if(pointers.size===1){
    const [id,p]=[...pointers.entries()][0];drag={id,x:p.x,y:p.y};pinch=null;
  }else if(pointers.size===0){drag=null;pinch=null;}
}
surface.addEventListener("pointerup",releaseCameraPointer);
surface.addEventListener("pointercancel",releaseCameraPointer);
surface.addEventListener("lostpointercapture",releaseCameraPointer);
surface.addEventListener("wheel",e=>{if(!running)return;e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+Math.sign(e.deltaY)*.9,5.6,19);},{passive:false});
const pressed=new Set();
window.addEventListener("keydown",e=>{if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();pressed.add(e.code);if(!e.repeat&&e.code==="Space")jump();if(!e.repeat&&e.code==="KeyE")interact();});
window.addEventListener("keyup",e=>pressed.delete(e.code));
window.addEventListener("blur",()=>{pressed.clear();holdRun=false;joy.x=joy.y=0;stick.style.left="50%";stick.style.top="50%";});
let holdRun=false;
$("btn-run").addEventListener("pointerdown",e=>{e.preventDefault();holdRun=true;$("btn-run").classList.add("active");$("btn-run").setPointerCapture(e.pointerId);});
for(const ev of ["pointerup","pointercancel","lostpointercapture"]){$("btn-run").addEventListener(ev,()=>{holdRun=false;$("btn-run").classList.remove("active");});}
$("btn-jump").addEventListener("pointerdown",e=>{e.preventDefault();jump();});
$("btn-action").addEventListener("pointerdown",e=>{e.preventDefault();interact();});
$("btn-time").addEventListener("click",()=>{setTime(timeIndex+1);notice("Время суток изменено");});
let soundEnabled=true;
$("btn-sound").addEventListener("click",()=>{soundEnabled=!soundEnabled;$("btn-sound").textContent=soundEnabled?"♫ ЗВУК: ВКЛ":"♫ ЗВУК: ВЫКЛ";if(audioCtx && master){master.gain.setTargetAtTime(soundEnabled?.14:0,audioCtx.currentTime,.15);}});

let audioCtx=null,master=null,stepAt=0,musicTimer=null;
function startAudio(){
  try{
    const Audio = window.AudioContext || window.webkitAudioContext;
    if(!Audio)return;
    audioCtx=new Audio();
    audioCtx.resume();
    master=audioCtx.createGain();master.gain.value=soundEnabled?.14:0;master.connect(audioCtx.destination);
    // Soft city wind/traffic. Synthesis only: no external audio files.
    const buffer=audioCtx.createBuffer(1, audioCtx.sampleRate*2, audioCtx.sampleRate);
    const data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){const white=Math.random()*2-1;last=(last+.035*white)/1.035;data[i]=last*2.4;}
    const noise=audioCtx.createBufferSource();noise.buffer=buffer;noise.loop=true;
    const lp=audioCtx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=370;
    const ng=audioCtx.createGain();ng.gain.value=.3;
    noise.connect(lp);lp.connect(ng);ng.connect(master);noise.start();
    const tones=[196,246.94,293.66,246.94,174.61,220,261.63,220];
    let note=0;
    function music(){
      if(!audioCtx)return;
      const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
      osc.type="sine";osc.frequency.value=tones[note++%tones.length];
      g.gain.setValueAtTime(0,audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(.095,audioCtx.currentTime+.2);
      g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+1.8);
      osc.connect(g);g.connect(master);osc.start();osc.stop(audioCtx.currentTime+1.82);
    }
    music();musicTimer=setInterval(music,1700);
  }catch(e){$("btn-sound").textContent="♫ НЕДОСТУПНО";}
}
function footstep(){
  if(!audioCtx||!soundEnabled)return;
  const osc=audioCtx.createOscillator(),g=audioCtx.createGain();
  osc.type="triangle";osc.frequency.setValueAtTime(116,audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(65,audioCtx.currentTime+.075);
  g.gain.setValueAtTime(.18,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.085);
  osc.connect(g);g.connect(master);osc.start();osc.stop(audioCtx.currentTime+.09);
}
// The same ACTION key drives car entry, benches and stairwell doors.
// A room has its own bounded coordinates while the outside world is suspended.
let nearby=null;
let savedCamera=null;
const visitStorageKey="mini-city-v03-lobbies";
try{
  const visited=JSON.parse(localStorage.getItem(visitStorageKey)||"[]");
  if(Array.isArray(visited))for(const room of lobbies)room.visited=visited.includes(room.id);
}catch(_){/* In private browsing the game still works without persistence. */}
function updateEntranceProgress(){
  const count=lobbies.filter(r=>r.visited).length;
  $("entrance-progress").textContent="Подъезды: "+count+" / "+lobbies.length;
}
function setZoneLabel(text){
  $("zone-name").textContent=text;
}
updateEntranceProgress();
function standUp(){
  if(!avatar.sitting)return;
  const seat=avatar.sitting;
  avatar.sitting=null;avatar.seatTween=null;
  const candidates=[
    [seat.x+1.7,seat.z],
    [seat.x-1.7,seat.z],
    [seat.x,seat.z+1.7],
    [seat.x,seat.z-1.7]
  ];
  const exit=candidates.find(([x,z])=>!blocked(x,z))||[seat.x,seat.z];
  avatar.x=exit[0];avatar.z=exit[1];
  smoothVelocity.set(0,0);
  notice("Встал со скамейки",1400);
}
function jump(){
  if(!running||avatar.inCar||avatar.inLobby)return;
  if(avatar.sitting){standUp();return;}
  if(avatar.y<=.015)avatar.vy=8.2;
}
function blocked(x,z){
  if(avatar.inLobby)return indoorBlocked(x-avatar.inLobby.centerX,z,avatar.y);
  if(Math.abs(x)>153||Math.abs(z)>153)return true;
  const r=.49;
  for(const c of colliders){
    if(x+r>c.x1&&x-r<c.x2&&z+r>c.z1&&z-r<c.z2)return true;
  }
  return false;
}
function enterLobby(room){
  if(avatar.inLobby||avatar.inCar||avatar.sitting)return;
  savedCamera={yaw,pitch,zoom};
  for(const r of lobbies)r.root.visible=r===room;
  world.visible=false;
  for(const n of npcs)n.person.g.visible=false;
  avatar.inLobby=room;avatar.lastFloor=1;
  avatar.x=room.centerX;avatar.z=4.25;avatar.y=0;avatar.vy=0;
  avatar.angle=0;
  smoothVelocity.set(0,0);
  player.g.position.set(avatar.x,0,avatar.z);
  yaw=0;pitch=.25;zoom=6.2;
  setZoneLabel(room.name.toUpperCase()+" · 1/"+room.floors+" ЭТАЖ");
  if(!room.visited){
    room.visited=true;
    updateEntranceProgress();
    try{localStorage.setItem(visitStorageKey,JSON.stringify(lobbies.filter(r=>r.visited).map(r=>r.id)))}catch(_){}
    notice("🚪 "+room.name+" — поднимись по лестнице и осмотри этажи.",3500);
  }else notice("🚪 "+room.name+" — "+room.floors+" этажа(ей)",2500);
  followCamera(1);
}
function exitLobby(){
  if(!avatar.inLobby)return;
  const room=avatar.inLobby;
  avatar.inLobby=null;avatar.lastFloor=null;
  room.root.visible=false;
  world.visible=true;
  avatar.x=room.x;avatar.z=room.z-.6;avatar.y=0;avatar.vy=0;
  avatar.angle=0;
  smoothVelocity.set(0,0);
  player.g.position.set(avatar.x,0,avatar.z);
  if(savedCamera){
    yaw=savedCamera.yaw;pitch=savedCamera.pitch;zoom=savedCamera.zoom;
    savedCamera=null;
  }
  setZoneLabel("НА УЛИЦЕ");
  followCamera(1);
  notice("Ты вернулся во двор",1700);
}
function detectInteract(){
  nearby=null;
  if(avatar.inLobby){
    const r=nearIndoorObject(avatar.x-avatar.inLobby.centerX,avatar.z,avatar.y,avatar.inLobby.floors);
    if(r)nearby=r;
  }else if(avatar.inCar){
    nearby={type:"exit-car",title:"Выйти из машины"};
  }else if(avatar.sitting){
    nearby={type:"stand",title:"Встать со скамейки"};
  }else{
    // Keep the closest interactable item. Do not enter through walls by accident:
    // street entrances are outside the building collision rectangles.
    const available=[];
    for(const room of lobbies){
      const distance=Math.hypot(room.x-avatar.x,room.z-avatar.z);
      if(distance<3)available.push({type:"entrance",obj:room,title:"Войти: "+room.name,distance});
    }
    for(const c of cars){
      const distance=Math.hypot(c.x-avatar.x,c.z-avatar.z);
      if(distance<3.45)available.push({type:"car",obj:c,title:"Сесть в машину",distance});
    }
    for(const b of benches){
      // Do not place the player on top of a resident using the same bench.
      if(benchResidents.some(n=>Math.hypot(n.x-b.x,n.z-b.z)<.6))continue;
      const distance=Math.hypot(b.x-avatar.x,b.z-avatar.z);
      if(distance<2.45)available.push({type:"sit",obj:b,title:"Сесть на скамейку",distance});
    }
    for(const d of doors){
      const distance=Math.hypot(d.x-avatar.x,d.z-avatar.z);
      if(distance<3.5)available.push({type:"shop-door",obj:d,title:"Открыть дверь магазина",distance});
    }
    available.sort((a,b)=>a.distance-b.distance);
    nearby=available[0]||null;
  }
  $("btn-action").classList.toggle("available",Boolean(nearby));
  $("interact-hint").textContent=nearby?.title||"";
}
function interact(){
  if(!running||!nearby)return;
  switch(nearby.type){
    case "entrance":enterLobby(nearby.obj);break;
    case "lobby-exit":exitLobby();break;
    case "mailboxes":notice("📬 Почтовые ящики. Пока здесь ничего нет.",3000);break;
    case "apartment":notice("🔒 Пока квартиры закрыты.",1900);break;
    case "sit":{
      const seat=nearby.obj;
      avatar.sitting=seat;
      avatar.seatTween={fromX:avatar.x,fromZ:avatar.z,start:elapsed,duration:.68};
      avatar.y=0;avatar.vy=0;
      avatar.angle=seat.rotation;
      smoothVelocity.set(0,0);
      notice("🪑 Ты сел. Нажми «Действие», чтобы встать.",3200);
      break;
    }
    case "stand":standUp();break;
    case "car":{
      avatar.inCar=nearby.obj;player.g.visible=false;smoothVelocity.set(0,0);
      avatar.x=nearby.obj.x;avatar.z=nearby.obj.z;avatar.y=0;
      notice("🚙 Машина припаркована. Вождение появится позже.",2500);
      break;
    }
    case "exit-car":{
      const c=avatar.inCar;avatar.inCar=null;
      avatar.x=c.x+(c.rot===0?3.15:0);
      avatar.z=c.z+(c.rot===0?0:3.15);
      player.g.visible=true;player.g.position.set(avatar.x,0,avatar.z);
      notice("Ты вышел из машины",1500);
      break;
    }
    case "shop-door":
      nearby.obj.opened=3.5;notice("🚪 Дверь магазина открыта",2000);
      break;
  }
  detectInteract();
}

const raycaster = new THREE.Raycaster(), camTarget=new THREE.Vector3(),camDest=new THREE.Vector3(),rayDir=new THREE.Vector3();
function followCamera(dt){
  const base=avatar.inCar?avatar.inCar.g.position:player.g.position;
  camTarget.set(base.x,base.y+1.65+(avatar.inCar?.42:0),base.z);
  const c=Math.cos(pitch);
  camDest.set(camTarget.x+Math.sin(yaw)*c*zoom,camTarget.y+Math.sin(pitch)*zoom,camTarget.z+Math.cos(yaw)*c*zoom);
  rayDir.copy(camDest).sub(camTarget);
  const dist=rayDir.length();rayDir.normalize();
  raycaster.set(camTarget,rayDir);raycaster.far=dist;
  const hits=raycaster.intersectObjects(cameraObstacles,false);
  if(!avatar.inLobby && hits.length){const d=Math.max(.85,hits[0].distance-.55);camDest.copy(camTarget).addScaledVector(rayDir,d);}
  if(avatar.inLobby){
    // Never allow the camera through walls/ceiling in a compact room.
    const x=avatar.inLobby.centerX;
    camDest.x=THREE.MathUtils.clamp(camDest.x,x-5.25,x+5.25);
    camDest.z=THREE.MathUtils.clamp(camDest.z,-6.1,6.1);
    camDest.y=THREE.MathUtils.clamp(camDest.y,avatar.y+.78,avatar.y+2.35);
  }
  camera.position.lerp(camDest,Math.min(1,dt*8));camera.lookAt(camTarget);
}
function minimap(){
  const cv=$("minimap"),g=cv.getContext("2d"),sz=240,range=94;
  if(avatar.inLobby){
    const x=avatar.x-avatar.inLobby.centerX,z=avatar.z;
    g.clearRect(0,0,sz,sz);
    g.fillStyle="#3b5360";g.fillRect(0,0,sz,sz);
    g.fillStyle="#a4aca6";g.fillRect(22,18,196,204);
    g.fillStyle="#65757b";g.fillRect(22,18,196,16);g.fillRect(22,18,15,204);
    g.fillRect(203,18,15,204);g.fillRect(22,206,196,16);
    g.fillStyle="#77878d";g.fillRect(42,39,64,72);
    g.strokeStyle="#617681";g.lineWidth=7;
    g.beginPath();g.moveTo(48,190);g.lineTo(48,56);
    g.lineTo(101,56);g.lineTo(101,190);g.stroke();
    g.fillStyle="#d9be80";g.fillRect(173,97,23,60);
    g.fillStyle="#76d4a9";g.fillRect(100,205,40,7);
    g.fillStyle="#fff";g.beginPath();
    g.arc(120+x/12*180,120+z/14*180,6,0,Math.PI*2);g.fill();
    return;
  }
  const centerX=THREE.MathUtils.clamp(avatar.x,-160+range,160-range);
  const centerZ=THREE.MathUtils.clamp(avatar.z,-160+range,160-range);
  const px=x=>(x-centerX+range)/(2*range)*sz;
  const pz=z=>(z-centerZ+range)/(2*range)*sz;
  g.clearRect(0,0,sz,sz);
  g.fillStyle="#657961";g.fillRect(0,0,sz,sz);
  for(const road of [-91,0,91]){
    g.fillStyle="#414d55";
    g.fillRect(px(road-7),0,14/(2*range)*sz,sz);
    g.fillRect(0,pz(road-7),sz,14/(2*range)*sz);
    g.fillStyle="#a2b0aa";
    for(const sign of [-1,1]){
      g.fillRect(px(road+sign*8),0,3,sz);
      g.fillRect(0,pz(road+sign*8),sz,3);
    }
  }
  g.fillStyle="#293b43";
  for(const c of colliders){
    if(c.x2-c.x1<8||c.z2-c.z1<8)continue; // buildings only
    g.fillRect(px(c.x1),pz(c.z1),(c.x2-c.x1)/(2*range)*sz,(c.z2-c.z1)/(2*range)*sz);
  }
  for(const p of pois){
    const x=px(p.x),z=pz(p.z);
    if(x<0||x>sz||z<0||z>sz)continue;
    g.fillStyle=p.found?"#8bdfbb":"#ffdd85";g.beginPath();g.arc(x,z,5,0,Math.PI*2);g.fill();
  }
  // Cyan squares are explorable stairwell entrances. Mint means visited.
  for(const room of lobbies){
    const bx=px(room.x),bz=pz(room.z);
    if(bx<0||bx>sz||bz<0||bz>sz)continue;
    g.fillStyle=room.visited?"#7ad7ad":"#8ae8fa";
    g.fillRect(bx-5,bz-5,10,10);
    g.strokeStyle="#1e4e56";g.lineWidth=1.5;
    g.strokeRect(bx-5,bz-5,10,10);
  }
  const x=px(avatar.x),z=pz(avatar.z),a=avatar.angle;
  g.fillStyle="#ffffff";g.beginPath();g.arc(x,z,6,0,Math.PI*2);g.fill();
  g.strokeStyle="#142b3f";g.lineWidth=3;g.beginPath();g.moveTo(x,z);g.lineTo(x-Math.sin(a)*14,z-Math.cos(a)*14);g.stroke();
}

let running=false,elapsed=0,lastMap=0;
const clock=new THREE.Clock();
function update(dt) {
  elapsed+=dt;
  const kx=(pressed.has("KeyD")||pressed.has("ArrowRight")?1:0)-(pressed.has("KeyA")||pressed.has("ArrowLeft")?1:0);
  const ky=(pressed.has("KeyS")||pressed.has("ArrowDown")?1:0)-(pressed.has("KeyW")||pressed.has("ArrowUp")?1:0);
  let mx=joy.x+kx, my=joy.y+ky;
  const mag=Math.hypot(mx,my);
  if(mag>1){mx/=mag;my/=mag;}
  const isRunning=(holdRun||pressed.has("ShiftLeft")||pressed.has("ShiftRight"))&&mag>.05;
  const speed=isRunning?7.3:4.15;
  const input=avatar.inCar?0:Math.min(1,mag);
  const immobilized=avatar.inCar||avatar.sitting;
  const desiredX=(Math.cos(yaw)*mx+Math.sin(yaw)*my)*speed*(immobilized?0:1);
  const desiredZ=(-Math.sin(yaw)*mx+Math.cos(yaw)*my)*speed*(immobilized?0:1);
  const blend=1-Math.exp(-dt*(input>.04?9.4:13.5));
  smoothVelocity.x+=(desiredX-smoothVelocity.x)*blend;
  smoothVelocity.y+=(desiredZ-smoothVelocity.y)*blend;
  if(immobilized)smoothVelocity.set(0,0);
  const movingSpeed=smoothVelocity.length();
  if(avatar.sitting){
    const seat=avatar.sitting,tween=avatar.seatTween;
    if(tween){
      const u=Math.min(1,(elapsed-tween.start)/tween.duration);
      const eased=u*u*(3-2*u);
      avatar.x=tween.fromX+(seat.x-tween.fromX)*eased;
      avatar.z=tween.fromZ+(seat.z-tween.fromZ)*eased;
      const target=seat.rotation;
      avatar.angle+=Math.atan2(Math.sin(target-avatar.angle),Math.cos(target-avatar.angle))*Math.min(1,dt*12);
      if(u>=1)avatar.seatTween=null;
    }
  }
  if(movingSpeed>.07){
    const vx=smoothVelocity.x,vz=smoothVelocity.y;
    const nx=avatar.x+vx*dt,nz=avatar.z+vz*dt;
    if(!blocked(nx,avatar.z))avatar.x=nx;else smoothVelocity.x=0;
    if(!blocked(avatar.x,nz))avatar.z=nz;else smoothVelocity.y=0;
    const targetAngle=Math.atan2(-vx,-vz);
    avatar.angle+=Math.atan2(Math.sin(targetAngle-avatar.angle),Math.cos(targetAngle-avatar.angle))*Math.min(1,dt*10);
  }
  if(!avatar.inCar){
    if(avatar.inLobby){
      // On the steps, elevation is a continuous function of walking position.
      // Never jump between floors: interpolation follows the physical stair slope.
      avatar.vy=0;
      const relativeX=avatar.x-avatar.inLobby.centerX;
      const target=indoorFloorHeight(relativeX,avatar.z,avatar.y,avatar.inLobby.floors);
      avatar.y+=THREE.MathUtils.clamp(target-avatar.y,-dt*3.2,dt*3.2);
      const level=Math.max(1,Math.min(avatar.inLobby.floors,Math.round(avatar.y/FLOOR_HEIGHT)+1));
      if(avatar.lastFloor!==level){
        avatar.lastFloor=level;
        setZoneLabel(avatar.inLobby.name.toUpperCase()+" · "+level+"/"+avatar.inLobby.floors+" ЭТАЖ");
      }
    }else{
      avatar.vy-=19*dt;avatar.y+=avatar.vy*dt;
      if(avatar.y<0){avatar.y=0;avatar.vy=0;}
    }
    player.g.position.set(avatar.x,avatar.y-(avatar.sitting?.16*player.sitBlend:0),avatar.z);
    player.g.rotation.y=avatar.angle;
    animateHuman(player,movingSpeed,elapsed,Boolean(avatar.sitting),dt);

    if(movingSpeed>1&&avatar.y===0&&elapsed-stepAt>(isRunning?.24:.39)){footstep();stepAt=elapsed;}
  }
  for(const n of npcs){
    const distance=Math.hypot(n.person.g.position.x-avatar.x,n.person.g.position.z-avatar.z);
    const far=distance>86||Boolean(avatar.inLobby);
    n.person.g.visible=!far;
    if(far)continue;
    if(n.role==="rest"){
      // A seated local looks toward a nearby visitor.
      if(distance<5){
        const target=Math.atan2(n.person.g.position.x-avatar.x,n.person.g.position.z-avatar.z);
        const rot=n.person.g.rotation.y;
        n.person.g.rotation.y=rot+Math.atan2(Math.sin(target-rot),Math.cos(target-rot))*Math.min(1,dt*1.5);
      }else n.person.g.rotation.y=THREE.MathUtils.damp(n.person.g.rotation.y,n.restAt.rotation,1,dt);
      continue;
    }
    if(n.pause>0){
      n.pause-=dt;
      animateHuman(n.person,0,elapsed);
      if(distance<5){
        // Not a suspicion mechanic yet: simply observe the passerby.
        const a=Math.atan2(n.person.g.position.x-avatar.x,n.person.g.position.z-avatar.z);
        const rot=n.person.g.rotation.y;
        n.person.g.rotation.y=rot+Math.atan2(Math.sin(a-rot),Math.cos(a-rot))*Math.min(1,dt*1.7);
      }
      continue;
    }
    n.progress+=n.dir*n.speed*dt/Math.max(1,Math.abs(n.to-n.from));
    if(n.progress>1){n.progress=1;n.dir=-1;n.pause=.8+rand()*4;}
    else if(n.progress<0){n.progress=0;n.dir=1;n.pause=.8+rand()*4;}
    const pos=n.from+(n.to-n.from)*n.progress;
    n.person.g.position.set(n.vertical?n.fixed:pos,0,n.vertical?pos:n.fixed);
    const direction=(n.to-n.from)*n.dir;
    n.person.g.rotation.y=n.vertical?(direction>0?Math.PI:0):(direction>0?-Math.PI/2:Math.PI/2);
    animateHuman(n.person,n.speed,elapsed+n.fixed*.4);
  }
  for(const d of doors){if(d.opened>0)d.opened-=dt;d.pivot.rotation.y=THREE.MathUtils.damp(d.pivot.rotation.y,d.opened>0?-1.1:0,7,dt);}
  for(const p of pois){p.dot.position.y=2.2+Math.sin(elapsed*2.1+p.x)*.19;p.ring.rotation.z=elapsed*.15;}
  if(elapsed-lightUpdateAt>.6){
    lightUpdateAt=elapsed;
    for(const o of treeGroups)o.g.visible=(o.x-avatar.x)**2+(o.z-avatar.z)**2<140*140;
    for(const o of streetProps)o.g.visible=(o.x-avatar.x)**2+(o.z-avatar.z)**2<140*140;
    for(const c of cars)c.g.visible=!!avatar.inCar&&avatar.inCar===c || (c.x-avatar.x)**2+(c.z-avatar.z)**2<145*145;
    refreshStreetLights();
    // Keep the sun/shadow box anchored near the moving player.
    if(Math.abs(sun.target.position.x-avatar.x)>24||Math.abs(sun.target.position.z-avatar.z)>24){
      sun.position.x+=(avatar.x-sun.target.position.x);
      sun.position.z+=(avatar.z-sun.target.position.z);
      sun.target.position.set(avatar.x,0,avatar.z);
      sun.target.updateMatrixWorld();
    }
  }
  followCamera(dt);
  if(!avatar.inLobby)lookForPlaces();
  if(elapsed-lastMap>.13){minimap();lastMap=elapsed;}
  detectInteract();
}
let sampleFrames=0,sampleTime=performance.now(),qualityCooldown=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,clock.getDelta());
  if(running)update(dt);else followCamera(dt);
  renderer.render(scene,camera);
  if(!running)return;
  sampleFrames++;
  const now=performance.now();
  if(now-sampleTime>2300){
    const fps=Math.round(sampleFrames*1000/(now-sampleTime));
    $("fps-counter").textContent=fps+" FPS";
    const draws=renderer.info.render.calls;
    const tris=renderer.info.render.triangles;
    $("perf-info").textContent=draws+" рис. · "+Math.round(tris/1000)+"k трис · "+renderScale.toFixed(2)+"×";
    const maxScale=Math.min(window.devicePixelRatio||1,1.35);
    // Slowly lower framebuffer cost only when genuinely needed.
    // Never go below 0.9 device pixels per CSS pixel.
    if(now>qualityCooldown){
      if(fps<25&&renderScale>.92){renderScale=Math.max(.9,renderScale-.15);qualityCooldown=now+3500;renderer.setPixelRatio(renderScale);}
      else if(fps>49&&renderScale<maxScale-.04){renderScale=Math.min(maxScale,renderScale+.08);qualityCooldown=now+4000;renderer.setPixelRatio(renderScale);}
    }
    sampleTime=now;sampleFrames=0;
  }
}
window.addEventListener("resize",()=>{
  const w=innerWidth,h=innerHeight;
  camera.aspect=w/h;camera.fov=w<h?63:59;camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  renderScale=Math.min(renderScale,devicePixelRatio||1);
  renderer.setPixelRatio(renderScale);
});
renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault());
$("start").disabled=false;$("start").textContent="НАЧАТЬ ПРОГУЛКУ →";
window.cityReady=true;
$("start").addEventListener("click",()=>{
  $("welcome").style.display="none";ui.hidden=false;running=true;clock.getDelta();
  startAudio();notice("Голубые квадраты на карте — входы в подъезды!",4300);
});
followCamera(1);
animate();
