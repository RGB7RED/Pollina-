// MINI CITY 4.7.1 — house height and depth must agree with REAL stairs,
// windows, roofs and the reference first-floor four-flat plan.
// Run: node play-lab/test-architecture-471.mjs
import assert from "node:assert/strict";
import {BUILDING,buildApartmentHouse,planFacade} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor,buildFirstFloor} from "./first-floor.js";
import {planFirstApartment} from "./apartment.js";
import {planStreet} from "./street.js";
import {PlayerController,collidesAt,PLAYER_RADIUS,facadeObstacles} from "./controller.js";
class Vec{
 constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){Object.assign(this,{x,y,z});}
}
class O{
 constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
 this.children=[];this.userData={};this.matrix={clone:()=>({
 position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}})};}
 add(x){this.children.push(x);}updateMatrix(){}
}
class Mesh extends O{constructor(g,m){super();this.geometry=g;this.material=m;}}
class IM extends Mesh{
 constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
class Mat{constructor(a){Object.assign(this,a);}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;}}
const THREE={Group:O,Object3D:O,Mesh,InstancedMesh:IM,
 BoxGeometry:Geo,BufferGeometry:Geo,Float32BufferAttribute:Attr,
 MeshStandardMaterial:Mat,DoubleSide:2};
const near=(a,b,e=.000001)=>Math.abs(a-b)<e;
assert.equal(BUILDING.length,74);
assert.equal(BUILDING.width,16);
assert.equal(BUILDING.frontFacade,6.4); // street/entrances unchanged
assert.equal(BUILDING.backFacade,-9.6); // deeper ONLY into courtyard
assert.equal(BUILDING.firstFloor,2.09);
assert.equal(BUILDING.floorHeight,2.42);
const {root,roofTop,stats}=buildApartmentHouse(THREE);
const audit=root.userData.geometryAudit;
assert.deepEqual(audit.alignedFloors,[2.09,4.51,6.93,9.35,11.77]);
assert.equal(stats.entrances,4);
assert.equal(stats.windows,286);
assert.equal(audit.firstFloorWindowHoles.length,8);
assert.ok(audit.firstFloorWindowHoles.every(h=>near(h.bottom,2.73)));
assert.ok(audit.firstFloorWindowHoles.every(h=>near(h.height,1.46)));
assert.equal(audit.stairwellWindows.length,4);
for(const h of audit.holes){
 const top=BUILDING.firstFloor+BUILDING.floors*BUILDING.floorHeight;
 assert.ok(h.top<top,"no facade window crosses roofline");
 assert.ok(h.bottom>=BUILDING.plinth-.01,"no facade opening below plinth");
}
for(const floor of [0,1,2,3,4]){
 const level=BUILDING.firstFloor+floor*BUILDING.floorHeight;
 for(const w of planFacade().filter(w=>w.floor===floor&&!w.entrance&&!w.blindBay)){
  if(w.side===1&&w.bay===3&&floor>0)continue; // stair-only glazing
  const hole=audit.holes.find(h=>h.axis==="long"&&h.side===w.side&&
    near(h.centre,w.x)&&near(h.bottom,
      level+(w.balcony?.15:.64)));
  assert.ok(hole,"facade window is aligned to the actual "+(floor+1)+"F platform");
 }
}
assert.equal(roofTop,BUILDING.firstFloor+5*BUILDING.floorHeight+BUILDING.roofRise);
assert.deepEqual(audit.facadeEnds,{front:6.4,back:-9.6});
const roof=root.children.find(c=>c.name?.includes("hipped pitched roof"));
assert.ok(roof);
const roofZ=Array.from(roof.geometry.position.array).filter((_,i)=>i%3===2);
assert.ok(roofZ.some(z=>near(z,BUILDING.frontFacade+BUILDING.roofOverhang)));
assert.ok(roofZ.some(z=>near(z,BUILDING.backFacade-BUILDING.roofOverhang)));
const entry=planPlayableEntrance(BUILDING,audit.entryPads);
for(const i of [0,1,2,3,4])assert.ok(near(entry.floorHeight(i),audit.alignedFloors[i]));
assert.equal(entry.facade,6.4);
const layout=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(layout);
const prototype=planFirstApartment(BUILDING,entry);
entry.installApartment(prototype);
assert.ok(near(prototype.windowBottom,entry.floorHeight(4)+.64));
assert.ok(prototype.windowTop<prototype.ceilingY-.10);
assert.ok(prototype.bounds.minZ>BUILDING.backFacade);
assert.equal(layout.back,-9.33);
assert.equal(layout.front,6.12);
assert.equal(layout.divider,-3.21);
assert.deepEqual(layout.doors.map(d=>d.variant),["grey","brown","blue","dark"]);
assert.deepEqual(layout.doors.map(d=>d.number),[1,2,3,4]);
assert.deepEqual([1,2,3,4].map(n=>layout.roomCount(n)),[1,2,3,1]);
assert.ok(layout.unfurnished);
assert.ok(layout.segments.every(s=>s.minZ>=layout.back&&s.maxZ<=layout.front));
assert.ok(layout.segments.every(s=>s.minX>=-BUILDING.length/2));
const built=buildFirstFloor(THREE,layout);
assert.equal(built.doorPivots.size,4);
assert.deepEqual(built.stats.variants,["grey","brown","blue","dark"]);
assert.ok(built.stats.emptyRooms);
const leaves=Array.from(built.doorPivots.values()).map(p=>p.children[0].material.color);
assert.equal(new Set(leaves).size,4,"restore four DIFFERENT original door colors");
const street=planStreet(BUILDING,audit.entryPads);
const rearPath=street.surfaces.find(p=>p.kind==="rear-service-path");
assert.ok(rearPath.z+rearPath.depth/2<BUILDING.backFacade);
assert.ok(street.benches.every(b=>b.z<BUILDING.backFacade-1.3));
const outside=facadeObstacles(BUILDING,audit.entryPads).find(b=>b.name==="building");
assert.equal(outside.minZ,-9.6);assert.equal(outside.maxZ,6.4);
const player=new PlayerController({building:BUILDING,pads:audit.entryPads,
 entry,extras:street.obstacles,spawn:{x:entry.x,z:10.85}});
assert.ok(player.setEntryDoorOpen(true));
let maxStepY=0;
function walk(dx,dz,steps){
 player.setStick(dx,dz);
 for(let i=0;i<steps;i++){
  const old={...player.position};player.update(.05);
  assert.ok(Math.hypot(old.x-player.position.x,old.z-player.position.z)<.19);
  maxStepY=Math.max(maxStepY,Math.abs(player.position.y-old.y));
 }
}
walk(0,1,90);walk(1,0,18);walk(0,1,100);
assert.equal(player.position.y,entry.floorHeight(0));
walk(0,-1,6);
assert.equal(player.nearestDoor()?.number,3);
assert.ok(player.setFirstFloorDoorOpen(3,true));
walk(1,0,45);
assert.ok(player.position.x>layout.doors[2].x+.52);
assert.ok(near(player.position.y,layout.y));
assert.ok(!collidesAt(layout.doors[2].x,layout.doors[2].z,
 player.obstacles,PLAYER_RADIUS,layout.y));
assert.ok(maxStepY<.19);
console.log("MINI CITY 4.7.1 PASS: rear-only house deepening, unified five-floor height, genuine 2/1/1/3 plan and four original door variants");
