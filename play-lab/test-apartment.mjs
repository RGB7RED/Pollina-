// MINI CITY 4.6 · First real apartment, No.17.
// Run: node play-lab/test-apartment.mjs
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse,planFacade} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstApartment,buildFirstApartment} from "./apartment.js";
import {PlayerController,collidesAt,PLAYER_RADIUS} from "./controller.js";
class V{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class O{constructor(){this.position=new V();this.rotation=new V();this.scale=new V();
 this.userData={};this.children=[];this.matrix={clone:()=>({
 position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}})};}
 add(o){this.children.push(o);}updateMatrix(){}}
class Mesh extends O{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];
 this.instanceMatrix={};}setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;}}
class Mat{constructor(o){Object.assign(this,o);}}
const THREE={Group:O,Object3D:O,Mesh,InstancedMesh,BoxGeometry:Geo,
 BufferGeometry:Geo,Float32BufferAttribute:Attr,MeshStandardMaterial:Mat,DoubleSide:2};
const pads=[-26.3625,-8.7875,8.7875,26.3625]
 .map(x=>({x,width:5.5,depth:3.15,centreZ:7.875}));
const entry=planPlayableEntrance(BUILDING,pads);
const apartment=planFirstApartment(BUILDING,entry);
entry.installApartment(apartment);
assert.throws(()=>entry.installApartment(apartment),/already installed/);
assert.equal(apartment.number,17);
assert.equal(apartment.floor,5);
assert.equal(apartment.floorY,entry.floorHeight(4));
assert.equal(apartment.rooms.length,4);
assert.deepEqual(apartment.rooms.map(x=>x.label),
 ["Прихожая","Кухня","Санузел","Жилая комната"]);
assert.ok(apartment.bounds.minX> -BUILDING.length/2);
assert.ok(apartment.bounds.maxX<entry.x);
assert.ok(apartment.bounds.minZ> -BUILDING.width/2);
assert.ok(apartment.bounds.maxZ<BUILDING.width/2);
const matching=planFacade(BUILDING).filter(w=>w.floor===4&&w.bay===1);
assert.equal(matching.length,2);
assert.ok(matching.some(w=>w.side===-1));
assert.ok(matching.some(w=>w.side===1));
for(const w of matching)assert.ok(Math.abs(w.x-apartment.windowX)<1e-7);
assert.ok(apartment.windowBottom-apartment.floorY>.60);
assert.ok(apartment.windowTop<apartment.ceilingY-.10);
const house=buildApartmentHouse(THREE),audit=house.root.userData.geometryAudit;
const doors=audit.completeStaircase.apartmentDoors;
assert.equal(doors.length,20);
assert.deepEqual(doors.filter(d=>d.accessible).map(d=>d.number),[17]);
assert.equal(audit.firstApartmentAperture.z,-2.42);
assert.equal(audit.firstApartmentAperture.bottom,apartment.floorY);
assert.equal(audit.firstApartmentAperture.width,apartment.doorway.width);
assert.equal(audit.completeStaircase.floors,5);
assert.equal(audit.completeStaircase.flights,9);
assert.equal(audit.heating.radiators.length,4);
assert.equal(audit.foyer.doorCount,1);
const built=buildFirstApartment(THREE,apartment);
assert.equal(built.root.children.filter(m=>m instanceof InstancedMesh).length,9);
assert.equal(built.root.children.filter(m=>m instanceof O).length,10);
assert.equal(built.stats.roomNames.length,4);
assert.equal(built.stats.windows.length,2);
assert.ok(built.stats.windows.every(w=>w.real));
assert.ok(built.stats.insideExistingBuilding);
assert.ok(built.stats.exteriorWindowsUnmodified);
assert.ok(built.stats.furnitureBoxes<90);
assert.ok(built.doorPivot.children.length>=2);
assert.ok(built.stats.batchedMeshes<=10,"lightweight first prototype");
const instanced=house.root.children.filter(m=>m instanceof InstancedMesh);
assert.ok(instanced.length<=33);
const game=readFileSync(new URL("./game.js",import.meta.url),"utf8");
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1);
assert.match(game,/entry\.installApartment\(apartment\)/);
assert.match(game,/scene\.add\(flat\)/);
assert.match(game,/apartmentDoorPivot\.rotation\.y/);
assert.match(game,/setApartmentDoorOpen\(/);
assert.doesNotMatch(game,/window\.location\s*=.*apartment/);
const player=new PlayerController({building:BUILDING,pads,entry,
 spawn:{x:entry.x,z:10.85}});
assert.ok(player.setEntryDoorOpen(true));
assert.ok(player.obstacles.includes(apartment.doorBlocker));
assert.ok(collidesAt(apartment.doorway.x,apartment.doorway.z,
 player.obstacles,PLAYER_RADIUS,apartment.floorY));
assert.ok(collidesAt(apartment.bounds.minX-1,-2.4,
 player.obstacles,PLAYER_RADIUS,apartment.floorY));
assert.ok(collidesAt(entry.x-3,-2.4,player.obstacles,PLAYER_RADIUS,9.35),
 "fifth-floor apartment cannot be accessed one floor below");
assert.equal(entry.groundHeight(entry.x-4.5,-2.3,apartment.floorY),
 apartment.floorY);
let maxLift=0,teleports=0;
function walk(x,z,n){
 player.setStick(x,z);let nHit=0;
 for(let i=0;i<n;i++){
  const prev={...player.position},p=player.update(.05);
  assert.ok(Math.hypot(p.x-prev.x,p.z-prev.z)<.19);
  maxLift=Math.max(maxLift,Math.abs(p.y-prev.y));
  if(Math.abs(p.y-prev.y)>.19)teleports++;
  nHit+=p.collided?1:0;
 }
 return nHit;
}
// Start at actual street, climb the right entry flight and all eight
// U-flights in the existing stairwell (no teleport to fifth floor).
walk(0,1,90);walk(1,0,18);walk(0,1,100);
assert.equal(player.position.y,entry.floorHeight(0));
for(let floor=1;floor<=4;floor++){
 walk(-1,0,floor===1?40:70);walk(0,-1,108);
 walk(1,0,90);walk(0,1,109);
 assert.equal(player.position.y,entry.floorHeight(floor));
}
assert.equal(player.nearestDoor(),null);
walk(-1,0,35);walk(0,-1,10);
assert.equal(player.nearestDoor()?.id,"apartment-17");
const shutX=player.position.x;
walk(-1,0,20);
assert.ok(player.position.x>apartment.doorway.x+PLAYER_RADIUS-.10,
 "closed wooden door blocks a player from entering");
assert.ok(player.toggleNearestDoor());
assert.ok(!player.obstacles.includes(apartment.doorBlocker));
walk(-1,0,35);
assert.ok(player.position.x<apartment.doorway.x-.8);
assert.equal(entry.zone(player.position.x,player.position.z,player.position.y),
 "Квартира №17 · Прихожая");
walk(-1,0,20);walk(0,1,29);
assert.equal(entry.zone(player.position.x,player.position.z,player.position.y),
 "Квартира №17 · Кухня");
walk(0,-1,29);walk(1,0,31);walk(0,1,29);
assert.equal(entry.zone(player.position.x,player.position.z,player.position.y),
 "Квартира №17 · Санузел");
walk(0,-1,29);walk(-1,0,17);walk(0,-1,47);
assert.equal(entry.zone(player.position.x,player.position.z,player.position.y),
 "Квартира №17 · Жилая комната");
walk(0,-1,50);walk(0,1,97);walk(1,0,45);
assert.ok(player.position.x>apartment.doorway.x);
assert.ok(player.setApartmentDoorOpen(false));
assert.ok(player.obstacles.includes(apartment.doorBlocker));
assert.equal(teleports,0);
assert.ok(maxLift<.19);
player.reset();
assert.equal(player.apartmentDoorOpen,false);
assert.equal(player.entryDoorOpen,false);
assert.ok(player.obstacles.includes(entry.door));
assert.ok(player.obstacles.includes(apartment.doorBlocker));
console.log("MINI CITY 4.6 PASS: apartment No.17 on 5F, exterior windows aligned, 4 rooms accessible, physical door and same-world traversal");
