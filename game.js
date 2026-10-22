import * as THREE from "three";

const $ = (id) => document.getElementById(id);
const host = $("screen");
const ui = $("ui");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .12, 230);
const hemi = new THREE.HemisphereLight(0xe7f3ff, 0x4e5763, 2.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b5, 2.8);
sun.position.set(45, 84, 28);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -85; sun.shadow.camera.right = 85;
sun.shadow.camera.top = 85; sun.shadow.camera.bottom = -85;
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
function flat(w, d, material, x, z, y = .022) { return box(w, .035, d, material, x, y, z); }
function label(text, color = "#f9eed5", bg = "#1b3543", width = 4.6, height = .9) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = "#ffffff44"; g.lineWidth = 7; g.strokeRect(5, 5, 502, 118);
  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "800 47px system-ui, sans-serif"; g.fillText(text, 256, 69, 480);
  const texture = new THREE.CanvasTexture(cv); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  return mesh;
}

function street() {
  flat(168, 168, M.grass, 0, 0, -.07);
  flat(14, 158, M.asphalt, 0, 0);
  flat(158, 14, M.asphalt, 0, 0);
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) {
      flat(4, 65, M.pavement, s * 9.2, k * 43.8, .07);
      flat(65, 4, M.pavement, k * 43.8, s * 9.2, .07);
    }
    for (const k of [-1, 1]) {
      flat(.25, 66, M.curb, s * 7.18, k * 43.7, .11);
      flat(66, .25, M.curb, k * 43.7, s * 7.18, .11);
    }
  }
  for (let j = -70; j <= 70; j += 10) {
    if (Math.abs(j) < 12) continue;
    flat(.18, 4.2, M.white, 0, j, .077);
    flat(4.2, .18, M.white, j, 0, .077);
  }
  for (let t = -5; t <= 5; t += 1.8) {
    flat(1.02, .42, M.white, t, -7.9, .12);
    flat(1.02, .42, M.white, t, 7.9, .12);
    flat(.42, 1.02, M.white, -7.9, t, .12);
    flat(.42, 1.02, M.white, 7.9, t, .12);
  }
  for (let q of [-1, 1]) {
    flat(62, .13, M.sidewalkLine, q * 42, q * 14, .10);
  }
}
street();

const walls = [mat(0xaaa79b), mat(0xb4a891), mat(0x989e96), mat(0xc2b5a2), mat(0xa89a8b), mat(0x968b7c)];
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
    box(w + .07, .11, d + .07, brick, x, f * 3.05, z);
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
    sign.position.set(x, 2.65, frontZ - .33); world.add(sign);
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
function windows(list, material) {
  const mesh = new THREE.InstancedMesh(geomBox, material, list.length);
  list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
  mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; world.add(mesh);
}
windows(darkWindows, M.window);
windows(litWindows, M.glowing);

const grass2 = mat(0x83936c);
const leafLight = mat(0x87a470);
function tree(x, z, type = 0) {
  const height = 3.7 + rand() * 2;
  cyl(.19, .22, height, M.trunk, x, height / 2, z);
  const green = M.leaf[type % M.leaf.length];
  orb(1.35, green, x, height + .45, z);
  orb(1.15, green, x + .67, height + .18, z + .2);
  orb(1.05, type % 3 === 0 ? leafLight : green, x - .5, height + .72, z - .4);
}
const treePositions = [
  [-13,-59],[-13,-44],[-13,-17],[-13,17],[-13,50],[-13,64],
  [13,-61],[13,-45],[13,-17],[13,18],[13,39],[13,60],
  [-64,-15],[-46,-15],[-24,-14],[23,-14],[51,-14],[68,-14],
  [-64,14],[-47,14],[-19,14],[19,15],[47,14],[66,14],
  [48,53],[66,55],[-48,56],[-31,56]
];
treePositions.forEach(([x, z], i) => tree(x, z, i));

function bench(x, z, rotation = 0) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; world.add(group);
  box(2.5, .2, .65, mat(0x886d54), 0, .78, 0, group);
  box(2.5, .75, .15, mat(0x886d54), 0, 1.19, .3, group);
  for (const s of [-1, 1]) box(.13, .7, .6, M.metal, s, .38, 0, group);
}
bench(16, 25, Math.PI / 2);
bench(52, 53, 0);
bench(-18, -52, Math.PI / 2);
function lamp(x, z) {
  const metal = M.metal;
  cyl(.10, .10, 7.5, metal, x, 3.75, z);
  box(1.4, .11, .11, metal, x + .58, 7.4, z);
  box(.65, .24, .65, M.glowing, x + 1.1, 7.3, z);
  const light = new THREE.PointLight(0xffd28d, 0, 15, 2);
  light.position.set(x + 1.1, 7.2, z); world.add(light); nightLights.push(light);
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

function human(palette = 0) {
  const g=new THREE.Group();
  const shirts=[0x506c94,0xbd805e,0x5d846e,0x8d6785,0xc2a35a];
  const pants=[0x253147,0x343039,0x444a5d,0x47505a,0x343a4a];
  const torso=box(.88,1.12,.44,mat(shirts[palette%shirts.length]),0,1.71,0,g);
  const hip=box(.82,.35,.4,mat(pants[palette%pants.length]),0,1.02,0,g);
  const neck=box(.28,.25,.26,M.skin,0,2.36,0,g);
  const head=orb(.37,M.skin,0,2.63,0,g);
  head.scale.set(.93,1.1,.92);
  box(.73,.16,.72,M.hair,0,2.97,-.03,g);
  const eyes=mat(0x283340);
  orb(.038,eyes,-.14,2.67,-.337,g);orb(.038,eyes,.14,2.67,-.337,g);
  const leftArm = new THREE.Group(); leftArm.position.set(-.56,2.19,0);g.add(leftArm);
  const rightArm = new THREE.Group();rightArm.position.set(.56,2.19,0);g.add(rightArm);
  box(.27,.96,.30,mat(shirts[palette%shirts.length]),0,-.44,0,leftArm);
  const leftLeg = new THREE.Group();leftLeg.position.set(-.24,.96,0);g.add(leftLeg);
  const rightLeg = new THREE.Group();rightLeg.position.set(.24,.96,0);g.add(rightLeg);
  const pantsMat=mat(pants[palette%pants.length]);
  box(.31,.94,.34,pantsMat,0,-.45,0,leftLeg);
  box(.31,.94,.34,pantsMat,0,-.45,0,rightLeg);
  box(.38,.20,.62,M.shoes,0,-.91,-.13,leftLeg);
  box(.38,.20,.62,M.shoes,0,-.91,-.13,rightLeg);
  return {g,torso,head,leftArm,rightArm,leftLeg,rightLeg};
}
const player = human(0);
player.g.position.set(0,0,15);
scene.add(player.g);
const avatar = {x:0,y:0,z:15,vy:0,angle:0,inCar:null};
function animateHuman(h,velocity,t) {
  const amt=Math.min(1,velocity/4);
  const swing=Math.sin(t*(velocity>4.5?13:9))*amt*.52;
  h.leftLeg.rotation.x=swing;h.rightLeg.rotation.x=-swing;
  h.leftArm.rotation.x=-swing*.85;h.rightArm.rotation.x=swing*.85;
  h.torso.position.y=1.71+Math.abs(Math.sin(t*10))*amt*.035;
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
function setTime(index){
  timeIndex=index%timeModes.length;
  const t=timeModes[timeIndex];
  scene.background=new THREE.Color(t.sky);scene.fog.color.setHex(t.fog);
  hemi.intensity=t.ambient;sun.intensity=t.sun;sun.color.setHex(t.tint);
  sun.position.set(timeIndex===2?-25:45,timeIndex===1?26:84,28);
  nightLights.forEach(l=>l.intensity=t.night);
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
let yaw=.43,pitch=.32,zoom=9.4;
let drag=null;
renderer.domElement.addEventListener("pointerdown",e=>{if(!running)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return; const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch+dy*.005, .12, 1.12);});
const clearDrag=e=>{if(drag?.id===e.pointerId)drag=null;};
renderer.domElement.addEventListener("pointerup",clearDrag);renderer.domElement.addEventListener("pointercancel",clearDrag);
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
function jump(){if(!running||avatar.inCar)return;if(avatar.y<=.015){avatar.vy=8.2;}}
function blocked(x,z){
  if(Math.abs(x)>76||Math.abs(z)>76)return true;
  const r=.49;
  for(const c of colliders){if(x+r>c.x1 && x-r<c.x2 && z+r>c.z1 && z-r<c.z2)return true;}
  return false;
}
let nearby=null;
function detectInteract(){
  nearby=null;
  if(avatar.inCar){nearby={type:"exit",title:"Выйти из машины"};}
  else{
    for (const c of cars){if(Math.hypot(c.x-avatar.x,c.z-avatar.z)<4.0){nearby={type:"car",obj:c,title:"Сесть в машину"};break;}}
    if(!nearby)for(const d of doors){if(Math.hypot(d.x-avatar.x,d.z-avatar.z)<4.4){nearby={type:"door",obj:d,title:"Открыть дверь магазина"};break;}}
  }
  $("btn-action").classList.toggle("available",!!nearby);
  $("interact-hint").textContent=nearby?nearby.title:"";
}
function interact(){
  if(!running||!nearby)return;
  if(nearby.type==="car"){
    avatar.inCar=nearby.obj;player.g.visible=false;
    avatar.x=nearby.obj.x;avatar.z=nearby.obj.z;avatar.y=0;
    notice("🚙 Ты сел в припаркованную машину. Вождение пока недоступно.");
  } else if(nearby.type==="exit"){
    const c=avatar.inCar;avatar.inCar=null;
    avatar.x=c.x+(c.rot===0?3.15:0);
    avatar.z=c.z+(c.rot===0?0:3.15);
    player.g.visible=true;player.g.position.set(avatar.x,0,avatar.z);
    notice("Ты вышел из машины");
  }else if(nearby.type==="door"){
    nearby.obj.opened=3.5;notice("🚪 Дверь магазина открыта");
  }
  detectInteract();
}
const raycaster = new THREE.Raycaster(), camTarget=new THREE.Vector3(),camDest=new THREE.Vector3(),rayDir=new THREE.Vector3();
function followCamera(dt){
  const base=avatar.inCar?avatar.inCar.g.position:player.g.position;
  camTarget.set(base.x,1.78+(avatar.inCar?.4:0),base.z);
  const c=Math.cos(pitch);
  camDest.set(camTarget.x+Math.sin(yaw)*c*zoom,camTarget.y+Math.sin(pitch)*zoom,camTarget.z+Math.cos(yaw)*c*zoom);
  rayDir.copy(camDest).sub(camTarget);
  const dist=rayDir.length();rayDir.normalize();
  raycaster.set(camTarget,rayDir);raycaster.far=dist;
  const hits=raycaster.intersectObjects(cameraObstacles,false);
  if(hits.length){const d=Math.max(1.85,hits[0].distance-.6);camDest.copy(camTarget).addScaledVector(rayDir,d);}
  camera.position.lerp(camDest,Math.min(1,dt*8));camera.lookAt(camTarget);
}
function minimap(){
  const cv=$("minimap"),g=cv.getContext("2d"),sz=240;
  g.clearRect(0,0,sz,sz);
  g.fillStyle="#60765f";g.fillRect(0,0,sz,sz);
  const px=x=>(x+80)/160*sz,pz=z=>(z+80)/160*sz;
  g.fillStyle="#414d55";g.fillRect(px(-7),0,px(7)-px(-7),sz);g.fillRect(0,pz(-7),sz,pz(7)-pz(-7));
  g.fillStyle="#a7b1a7";
  for(const s of [-1,1]){g.fillRect(px(s*11-2),0,6,sz);g.fillRect(0,pz(s*11-2),sz,6);}
  for (const c of colliders.slice(0,9)){g.fillStyle="#293b43";g.fillRect(px(c.x1),pz(c.z1),(c.x2-c.x1)/160*sz,(c.z2-c.z1)/160*sz);}
  for (const p of pois){g.fillStyle=p.found?"#8bdfbb":"#ffdd85";g.beginPath();g.arc(px(p.x),pz(p.z),5,0,Math.PI*2);g.fill();}
  g.fillStyle="#fff";g.beginPath();g.arc(px(avatar.x),pz(avatar.z),5.5,0,Math.PI*2);g.fill();
  const a=avatar.angle;g.strokeStyle="#fff";g.lineWidth=2.5;g.beginPath();g.moveTo(px(avatar.x),pz(avatar.z));g.lineTo(px(avatar.x)-Math.sin(a)*13,pz(avatar.z)-Math.cos(a)*13);g.stroke();
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
  const speed=isRunning?7.5:4.1;
  const input=avatar.inCar?0:Math.min(1,mag);
  const vx=(Math.cos(yaw)*mx + Math.sin(yaw)*my)*speed;
  const vz=(-Math.sin(yaw)*mx + Math.cos(yaw)*my)*speed;
  if(input>.04){
    const nx=avatar.x+vx*dt,nz=avatar.z+vz*dt;
    if(!blocked(nx,avatar.z))avatar.x=nx;
    if(!blocked(avatar.x,nz))avatar.z=nz;
    const targetAngle=Math.atan2(-vx,-vz);
    avatar.angle+=Math.atan2(Math.sin(targetAngle-avatar.angle),Math.cos(targetAngle-avatar.angle))*Math.min(1,dt*12);
  }
  if(!avatar.inCar){
    avatar.vy-=19*dt;avatar.y+=avatar.vy*dt;
    if(avatar.y<0){avatar.y=0;avatar.vy=0;}
    player.g.position.set(avatar.x,avatar.y,avatar.z);
    player.g.rotation.y=avatar.angle;
    animateHuman(player,input*speed,elapsed);
    if(input>.2&&avatar.y===0&&elapsed-stepAt>(isRunning?.24:.39)){footstep();stepAt=elapsed;}
  }
  for(const n of npcs){
    n.progress+=n.dir*n.speed*dt/Math.abs(n.to-n.from);
    if(n.progress>1){n.progress=1;n.dir=-1;}else if(n.progress<0){n.progress=0;n.dir=1;}
    const pos=n.from+(n.to-n.from)*n.progress;
    n.person.g.position.set(n.vertical?n.fixed:pos,0,n.vertical?pos:n.fixed);
    const direction=(n.to-n.from)*n.dir;
    n.person.g.rotation.y=n.vertical?(direction>0?Math.PI:0):(direction>0?-Math.PI/2:Math.PI/2);
    animateHuman(n.person,n.speed,elapsed+(n.fixed*.4));
  }
  for(const d of doors){if(d.opened>0)d.opened-=dt;d.pivot.rotation.y=THREE.MathUtils.damp(d.pivot.rotation.y,d.opened>0?-1.1:0,7,dt);}
  for(const p of pois){p.dot.position.y=2.2+Math.sin(elapsed*2.1+p.x)*.19;p.ring.rotation.z=elapsed*.15;}
  followCamera(dt);
  lookForPlaces();
  if(elapsed-lastMap>.13){minimap();lastMap=elapsed;}
  detectInteract();
}
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,clock.getDelta());
  if(running)update(dt);else followCamera(dt);
  renderer.render(scene,camera);
}
window.addEventListener("resize",()=>{
  const w=innerWidth,h=innerHeight;
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
});
renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault());
$("start").disabled=false;$("start").textContent="НАЧАТЬ ПРОГУЛКУ →";
window.cityReady=true;
$("start").addEventListener("click",()=>{
  $("welcome").style.display="none";ui.hidden=false;running=true;clock.getDelta();
  startAudio();notice("Исследуй район. Найди 3 места!",4000);
});
followCamera(1);
animate();
