// MINI CITY 4.7.2 — deepened 19m house, coherent 5F levels,
// real 2k/1k/1k/3k architecture and physical reachability of EVERY room.
// Run: node play-lab/test-architecture-472.mjs
import assert from "node:assert/strict";
import {BUILDING,residentialLevels,buildApartmentHouse,planFacade}
  from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor,buildFirstFloor} from "./first-floor.js";
import {planFirstApartment} from "./apartment.js";
import {planStreet} from "./street.js";
import {PlayerController,collidesAt,PLAYER_RADIUS} from "./controller.js";

class Vec{constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){Object.assign(this,{x,y,z});}}
class Obj{constructor(){this.position=new Vec();this.rotation=new Vec();
 this.scale=new Vec();this.userData={};this.children=[];
 this.matrix={clone:()=>({position:{...this.position},
 rotation:{...this.rotation},scale:{...this.scale}})};}
 add(o){this.children.push(o);}updateMatrix(){}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class IM extends Mesh{constructor(g,m,n){super(g,m);this.count=n;
 this.matrices=[];this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
class Mat{constructor(o){Object.assign(this,o);}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh:IM,BoxGeometry:Geo,
 BufferGeometry:Geo,Float32BufferAttribute:Attr,
 MeshStandardMaterial:Mat,DoubleSide:2};
const near=(a,b,eps=1e-5)=>Math.abs(a-b)<eps;

assert.equal(BUILDING.length,74);
assert.equal(BUILDING.width,19);
assert.equal(BUILDING.frontFacade,6.4);
assert.equal(BUILDING.backFacade,-12.6);
assert.equal(BUILDING.width,BUILDING.frontFacade-BUILDING.backFacade);
assert.deepEqual(residentialLevels(),[2.09,4.51,6.93,9.35,11.77]);
const house=buildApartmentHouse(THREE),audit=house.root.userData.geometryAudit;
assert.deepEqual(audit.alignedFloors,residentialLevels());
assert.equal(house.roofTop,17.27);
assert.equal(audit.residentialDecks.length,20);
assert.ok(audit.decksReachRearFacade);
for(const deck of audit.residentialDecks){
 assert.ok(deck.z0>BUILDING.backFacade);
 assert.ok(deck.z0-BUILDING.backFacade<.40);
 assert.ok(deck.z1<BUILDING.frontFacade);
 assert.ok(residentialLevels().some(y=>near(y,deck.y)));
 for(const ex of audit.entryPads){
  assert.ok(deck.x1<=ex.x-1.84+.001||deck.x0>=ex.x+1.84-.001,
    "floor slab must never cross any open stairwell shaft");
 }
}
const fifthFloorLeft=audit.residentialDecks.find(d=>
 d.floor===5&&d.x0< -36);
assert.ok(fifthFloorLeft);
assert.ok(near(fifthFloorLeft.x1,audit.entryPads[0].x-6.30),
 "5F slab stops exactly where flat 17 begins");
const roof=house.root.children.find(m=>m.name?.includes("hipped pitched roof"));
assert.ok(roof);
const roofZ=Array.from(roof.geometry.position.array).filter((_,i)=>i%3===2);
assert.ok(roofZ.some(z=>near(z,BUILDING.backFacade-BUILDING.roofOverhang)));
assert.ok(roofZ.some(z=>near(z,BUILDING.frontFacade+BUILDING.roofOverhang)));
assert.equal(audit.facadeEnds.back,-12.6);
assert.equal(audit.facadeEnds.front,6.4);
assert.equal(house.stats.windows,286);
const bayFront=planFacade().filter(w=>w.side===1&&w.floor===0);
assert.deepEqual(bayFront.filter(w=>w.bay<3&&!w.blindBay).map(w=>w.bay),[1,2]);
assert.deepEqual(bayFront.filter(w=>w.bay>24&&!w.blindBay).map(w=>w.bay),[25,26]);
assert.equal(audit.stairwellWindows.length,4);
for(const floor of [0,1,2,3,4]){
 const bottom=residentialLevels()[floor];
 const windows=audit.holes.filter(h=>h.axis==="long"&&
   near(h.bottom,bottom+.64)&&h.kind==="window");
 assert.ok(windows.length>=2,"floor "+(floor+1)+" must have real window holes");
 assert.ok(windows.every(h=>h.top<residentialLevels()[floor]+BUILDING.floorHeight-.10));
}
const entry=planPlayableEntrance(BUILDING,audit.entryPads);
const first=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(first);
assert.equal(first.back,-12.33);
assert.equal(first.front,6.12);
assert.equal(first.ceilingY,2.09+2.42-.16);
assert.deepEqual(first.doors.map(d=>d.number),[1,2,3,4]);
assert.deepEqual(first.doors.map(d=>d.variant),["grey","brown","blue","dark"]);
assert.deepEqual([1,2,3,4].map(n=>first.roomCount(n)),[1,2,3,1]);
assert.ok(first.unfurnished);
assert.ok(first.openings.length>=17);
assert.ok(first.rooms.every(r=>r.minX>=-BUILDING.length/2&&
  r.maxX<=BUILDING.length/2&&
  r.minZ>BUILDING.backFacade&&r.maxZ<BUILDING.frontFacade));
assert.ok(first.wings.every(w=>w.maxX-w.minX>7.5));
assert.equal(audit.firstFloorApertures.length,4);
const built=buildFirstFloor(THREE,first);
assert.ok(built.stats.emptyRooms);
assert.equal(built.doorPivots.size,4);
assert.deepEqual(built.stats.variants,["grey","brown","blue","dark"]);
assert.equal(new Set([...built.doorPivots.values()].map(p=>
  p.children[0].material.color)).size,4,
 "original four differently coloured and numbered doors preserved");
assert.ok(built.stats.instancedBatches<=6);

// Each living room must face a REAL opening in the ORIGINAL brick facade.
// Three different front windows provide daylight to 3 separate bedrooms.
for(const room of first.rooms.filter(r=>r.name.startsWith("Жилая комната"))){
 const side=room.flat===1||room.flat===3?1:-1;
 const windows=audit.holes.filter(h=>h.axis==="long"&&h.side===side&&
   h.kind==="window"&&near(h.bottom,first.y+.64)&&
   h.centre>room.minX+.4&&h.centre<room.maxX-.4);
 assert.ok(windows.length>=1,
   "bedroom "+room.flat+" must have a genuine exterior window");
}

// Flood-fill the numerical avatar's FULL body clearance, not a line
// through wall art. Doors of other homes remain shut; each kitchen,
// bath and bedroom must be reachable without crossing a solid wall.
function reachableRooms(door){
 const area=first.unitAreas.find(r=>r.number===door.number),step=.15;
 const minX=area.minX+.17,maxX=area.maxX-.17;
 const minZ=area.minZ+.17,maxZ=area.maxZ-.17;
 const nx=Math.floor((maxX-minX)/step)+1;
 const nz=Math.floor((maxZ-minZ)/step)+1;
 const indexX=x=>Math.round((x-minX)/step);
 const indexZ=z=>Math.round((z-minZ)/step);
 const obstacles=[...entry.buildingObstacles,...first.doorBlockers.filter(
   b=>b.name!=="flat-"+door.number+"-closed")];
 const occupied=(i,j)=>collidesAt(minX+i*step,minZ+j*step,
   obstacles,PLAYER_RADIUS,first.y);
 const start=[indexX(door.x+door.side*.72),indexZ(door.z)];
 assert.ok(!occupied(...start),"inside of door "+door.number+" must be open");
 const queue=[start],visited=new Set([start.join(",")]);
 for(let at=0;at<queue.length;at++){
  const [i,j]=queue[at];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const ni=i+dx,nj=j+dz,key=ni+","+nj;
   if(ni<0||nj<0||ni>=nx||nj>=nz||
      visited.has(key)||occupied(ni,nj))continue;
   visited.add(key);queue.push([ni,nj]);
  }
 }
 const rooms=first.rooms.filter(r=>r.flat===door.number);
 for(const r of rooms){
  assert.ok(queue.some(([i,j])=>{
   const px=minX+i*step,pz=minZ+j*step;
   return px>r.minX+.18&&px<r.maxX-.18&&
     pz>r.minZ+.18&&pz<r.maxZ-.18;
  }),"room must be reachable through wide internal door: "+
    door.number+" / "+r.name);
 }
 assert.ok(queue.length>500);
 return queue.length;
}
const passable=first.doors.map(reachableRooms);
assert.ok(passable.every(n=>n>700));
const prototype=planFirstApartment(BUILDING,entry);
entry.installApartment(prototype);
assert.equal(prototype.number,17);
assert.equal(prototype.floorY,entry.floorHeight(4));
assert.ok(prototype.bounds.minZ>BUILDING.backFacade);
assert.ok(prototype.bounds.maxZ<BUILDING.frontFacade);
assert.ok(near(prototype.windowBottom,prototype.floorY+.64));
const street=planStreet(BUILDING,audit.entryPads);
const rearPath=street.surfaces.find(s=>s.kind==="rear-service-path");
assert.ok(rearPath.z+rearPath.depth/2<BUILDING.backFacade-1.4);
assert.ok(street.benches.every(b=>b.z<BUILDING.backFacade-5));
assert.ok(street.trees.filter(t=>t.row==="courtyard").every(t=>
 t.z<BUILDING.backFacade-9));
assert.ok(street.obstacles.every(b=>
 b.maxX<=-BUILDING.length/2||b.minX>=BUILDING.length/2||
 b.maxZ<=BUILDING.backFacade||b.minZ>=BUILDING.frontFacade));
const player=new PlayerController({building:BUILDING,pads:audit.entryPads,
 entry,extras:street.obstacles,spawn:{x:entry.x,z:10.85}});
assert.ok(player.setEntryDoorOpen(true));
let maxLift=0;
function walk(dx,dz,steps){
 player.setStick(dx,dz);
 for(let i=0;i<steps;i++){
  const old={...player.position};
  player.update(.05);
  maxLift=Math.max(maxLift,Math.abs(player.position.y-old.y));
  assert.ok(Math.hypot(player.position.x-old.x,
    player.position.z-old.z)<.19);
 }
}
walk(0,1,90);walk(1,0,18);walk(0,1,100);
assert.equal(player.position.y,first.y);
walk(0,-1,6);
assert.equal(player.nearestDoor()?.number,3);
assert.ok(player.setFirstFloorDoorOpen(3,true));
walk(1,0,45);
assert.ok(player.position.x>first.doors[2].x+.52);
assert.ok(near(player.position.y,first.y));
assert.ok(maxLift<.19,"no staircase teleportation");
console.log("MINI CITY 4.7.2 PASS: 19m depth; four disconnected apartments each fully navigable; 5F levels and street aligned");
