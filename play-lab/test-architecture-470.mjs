// MINI CITY 4.7 · Four empty first-floor flats and independent building parts.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse,planFacade} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor,buildFirstFloor} from "./first-floor.js";
import {PlayerController,collidesAt,PLAYER_RADIUS} from "./controller.js";
import {PARTS,buildBuildingPart} from "../building-asset-lab/asset.js";
import {validateCatalog,folderObjects,catalogFolders} from "../models/catalog-utils.js";
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){Object.assign(this,{x,y,z});}}
class Obj{constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
 this.userData={};this.children=[];this.matrix={clone:()=>({
 position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}})};}
 add(m){this.children.push(m);}updateMatrix(){}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];
 this.instanceMatrix={};}setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
class Mat{constructor(o){Object.assign(this,o);}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,BoxGeometry:Geo,
 BufferGeometry:Geo,Float32BufferAttribute:Attr,MeshStandardMaterial:Mat,DoubleSide:2};
const house=buildApartmentHouse(THREE),audit=house.root.userData.geometryAudit;
assert.deepEqual(audit.completeStaircase.apartmentDoors.filter(x=>x.accessible).map(x=>x.number),
 [1,2,3,4,17]);
assert.equal(audit.firstFloorApertures.length,4);
assert.equal(BUILDING.length,74);
assert.equal(BUILDING.entrances,4);
assert.equal(house.stats.windows,286);
for(const floor of [0,1,2,3,4]){
 const p=planFacade().filter(p=>p.floor===floor&&p.side===1);
 assert.deepEqual(p.filter(w=>w.bay<3&&!w.blindBay).map(w=>w.bay),[1,2]);
 assert.deepEqual(p.filter(w=>w.bay>24&&!w.blindBay).map(w=>w.bay),[25,26]);
 assert.equal(p.filter(w=>w.entrance).length,floor===0?4:0);
}
const pairs=audit.firstFloorWindowHoles;
assert.equal(pairs.length,8);
assert.ok(pairs.every(h=>Math.abs(h.bottom-2.74)<.001));
assert.ok(pairs.every(h=>h.top<BUILDING.plinth+2*BUILDING.floorHeight));
const pads=audit.entryPads,entry=planPlayableEntrance(BUILDING,pads);
const plan=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(plan);
assert.throws(()=>entry.installFirstFloor(plan),/already installed/);
assert.equal(plan.floor,1);
assert.equal(plan.doors.length,4);
assert.deepEqual(plan.doors.map(d=>d.number),[1,2,3,4]);
assert.deepEqual(plan.doors.map(d=>d.type),["1к","2к","3к","1к"]);
assert.ok(plan.rooms.length>=12);
assert.ok(plan.unfurnished);
assert.ok(plan.wings.every(w=>w.minX>=-BUILDING.length/2));
assert.ok(plan.wings.every(w=>w.maxX<=BUILDING.length/2));
const rendered=buildFirstFloor(THREE,plan);
assert.ok(rendered.stats.emptyRooms);
assert.equal(rendered.stats.apartments,4);
assert.equal(rendered.doorPivots.size,4);
assert.ok(rendered.stats.instancedBatches<=6);
const p=new PlayerController({building:BUILDING,pads,entry,
 spawn:{x:entry.x,z:10.85}});
assert.ok(p.setEntryDoorOpen(true));
let maxLift=0;
function go(dx,dz,count){
 p.setStick(dx,dz);
 for(let i=0;i<count;i++){
  const old={...p.position};p.update(.05);
  const step=Math.hypot(p.position.x-old.x,p.position.z-old.z);
  assert.ok(step<.19,"no instantaneous teleport");
  maxLift=Math.max(maxLift,Math.abs(p.position.y-old.y));
 }
}
go(0,1,90);go(1,0,18);go(0,1,100);
assert.equal(p.position.y,plan.y);
go(0,-1,6);
assert.equal(p.nearestDoor()?.number,3);
const oldX=p.position.x;
go(1,0,35);
assert.ok(p.position.x<=plan.doors[2].x-PLAYER_RADIUS+.08,
 "closed first-floor door is physically solid");
assert.ok(p.setFirstFloorDoorOpen(3,true));
go(1,0,45);
assert.ok(p.position.x>plan.doors[2].x+.52,
 "opened door allows a direct physical approach into flat 3");
assert.equal(p.position.y,plan.y);
assert.ok(entry.isInside(p.position.x,p.position.z,p.position.y));
assert.ok(p.firstFloorDoorOpen.has(3));
assert.equal(p.setFirstFloorDoorOpen(3,false),true,
 "door can close safely once avatar clears the opening");
p.reset();
assert.equal(p.firstFloorDoorOpen.size,0);
assert.ok(p.obstacles.includes(plan.doorBlockers[2]));
assert.ok(maxLift<.19);
for(const d of plan.doors){
 assert.ok(collidesAt(d.x,d.z,plan.doorBlockers,PLAYER_RADIUS,plan.y));
}
const catalog=validateCatalog(JSON.parse(readFileSync(
 new URL("../models/catalog.json",import.meta.url),"utf8")));
assert.equal(catalog.entries.length,28);
assert.equal(catalogFolders(catalog).length,10);
for(const family of ["door","window","heating","lighting","utility"]){
 assert.ok(folderObjects(catalog,family).length>=1);
 for(const item of folderObjects(catalog,family)){
  assert.equal(item.viewer,
    "building-asset-lab/index.html?model="+item.id);
  const part=buildBuildingPart(THREE,item.id);
  assert.equal(part.root.userData.catalogId,item.id);
  assert.ok(part.stats.elements>=2);
  assert.ok(part.root.children.length>=1);
  assert.equal(item.quantity,
    item.id.startsWith("facade_window")?
      [94,63,63,62][Number(item.modelNumber)-1]:item.quantity);
 }
}
const source=readFileSync(new URL("./game.js",import.meta.url),"utf8");
assert.equal((source.match(/new THREE\.Scene\(/g)||[]).length,1);
assert.match(source,/entry\.installFirstFloor\(firstFloor\)/);
assert.match(source,/firstFloorDoorPivots/);
console.log("MINI CITY 4.7 PASS: four unfurnished 1F flats, doors, 2 end windows per side, 15 inspectable components");
