// MINI CITY stage 4.7.3: flat-panel Khrushchevka roof, all clear windows,
// real first-floor room walls and 3 windows at both entrance edges.
import assert from "node:assert/strict";
import {BUILDING,planFacade,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor,buildFirstFloor} from "./first-floor.js";
import {planFirstApartment,buildFirstApartment} from "./apartment.js";
import {PlayerController,PLAYER_RADIUS,collidesAt} from "./controller.js";
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){
 this.x=x;this.y=y;this.z=z;}}
class Obj{constructor(){
 this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
 this.children=[];this.userData={};this.matrix={clone:()=>({
 position:{...this.position},rotation:{...this.rotation},scale:{...this.scale}})};}
 add(x){this.children.push(x);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{constructor(g,m,n){super(g,m);this.count=n;
 this.matrices=[];this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}}
class Geometry{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
class Material{constructor(o){Object.assign(this,o);}}
class Attr{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
 BoxGeometry:Geometry,BufferGeometry:Geometry,Float32BufferAttribute:Attr,
 MeshStandardMaterial:Material,DoubleSide:2};
const {root,stats,roofTop}=buildApartmentHouse(THREE);
const audit=root.userData.geometryAudit;
assert.equal(BUILDING.type,"Soviet precast-panel Khrushchevka");
assert.equal(BUILDING.width,BUILDING.frontFacade-BUILDING.backFacade);
assert.equal(audit.roof.type,"flat");
assert.ok(audit.roof.deckY>BUILDING.firstFloor+BUILDING.floors*BUILDING.floorHeight);
assert.ok(audit.roof.parapetTop>audit.roof.deckY);
assert.equal(audit.roof.parapetTop,roofTop);
assert.equal(stats.chimneys,7,"retained all seven original roof vents");
const roof=root.children.find(m=>m.name==="flat five-storey roof · continuous deck");
assert.ok(roof,"actual non-sloping slab geometry exists");
assert.ok(Math.abs(roof.position.y-audit.roof.deckY)<1e-6);
const lastWindow=audit.holes.filter(h=>h.kind==="window"&&h.axis==="long"&&
 Math.abs(h.bottom-(BUILDING.firstFloor+4*BUILDING.floorHeight+.64))<.001);
assert.ok(lastWindow.length>=15);
assert.ok(lastWindow.every(h=>audit.roof.wallTop-h.top>.5),
 "fifth-floor top windows have visible full precast spandrel beneath roof");
const upperBandMin=BUILDING.firstFloor+BUILDING.floors*BUILDING.floorHeight;
assert.ok(audit.wallPieces.some(p=>p.axis==="long"&&
 p.y0<=upperBandMin+.001&&p.y1>=audit.roof.wallTop-.001),
 "raised wall band reaches underside of flat roof, no external open seam");
const batches=root.children.filter(x=>x instanceof InstancedMesh);
assert.ok(batches.length<=35,"mobile geometry stays instanced/batched");
assert.ok(batches.some(b=>b.material.color===0x858783),
 "panel joints are actual batched precast joints, not drawn bricks");
assert.ok(!batches.some(b=>b.material.color===0x977f78),
 "original red-brick facade batch is removed");
assert.equal(stats.windows,296);
assert.equal(stats.windowHoles,296);
assert.equal(audit.windowGlazing.length,stats.windows);
assert.ok(audit.windowGlazing.every(g=>g.transparent&&g.opacity<.5),
 "every dwelling/end/entrance window is real transparent glass");
assert.ok(audit.stairwellWindows.every(w=>w.transparent&&w.through));
for(const side of [-1,1]){
 for(const floor of [0,1,2,3,4]){
  const bays=planFacade().filter(w=>w.side===side&&w.floor===floor);
  if(side===1){
   assert.deepEqual(bays.filter(w=>w.bay<3&&!w.entrance&&!w.blindBay)
     .map(w=>w.bay),[0,1,2]);
   assert.deepEqual(bays.filter(w=>w.bay>24&&!w.entrance&&!w.blindBay)
     .map(w=>w.bay),[25,26,27]);
  }
 }
}
const entry=planPlayableEntrance(BUILDING,audit.entryPads);
const plan=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(plan);
const last=planFirstApartment(BUILDING,entry);
entry.installApartment(last);
const firstRendered=buildFirstFloor(THREE,plan);
const oldFlat=buildFirstApartment(THREE,last);
assert.equal(firstRendered.stats.apartments,4);
assert.equal(oldFlat.stats.number,17);
assert.deepEqual(plan.doors.map(d=>d.variant),["grey","brown","blue","dark"]);
assert.deepEqual([1,2,3,4].map(n=>plan.roomCount(n)),[1,2,3,1]);
assert.equal(plan.unfurnished,true);
assert.ok(plan.facadeLiningCount>=35);
assert.deepEqual(plan.windowConflicts,[]);
assert.equal(plan.wings.length,2);
// Both structural sides extend from the actual rear facade to the
// old staircase back wall; this is the specific missing-wall regression.
for(const side of [-1,1]){
 const wall=plan.segments.find(s=>s.name==="rear-stair-side-continuation-"+side);
 assert.ok(wall,"missing side wall from staircase to rear facade on side "+side);
 assert.ok(wall.minZ<=BUILDING.backFacade+.42+.001);
 assert.ok(wall.maxZ>=-4.85-.001);
 assert.ok(wall.maxY>=plan.ceilingY-.001);
}
const splitWalls=plan.segments.filter(s=>s.name.startsWith("three-room-separation"));
assert.ok(splitWalls.length>=2);
for(const wall of splitWalls){
 for(let bay=4;bay<=6;bay++){
  const cx=-BUILDING.length/2+1.85+(bay+.5)*
    (BUILDING.length-3.7)/BUILDING.windowBays;
  const hitsX=wall.minX<cx+.71&&wall.maxX>cx-.71;
  assert.ok(!hitsX,"wall crosses window bay "+bay);
 }
}
// True interior end windows also stay unobstructed by new apartment
// finishing panels. Check middle-of-window at occupied height.
const mid=(BUILDING.frontFacade+BUILDING.backFacade)/2;
for(const z of [(BUILDING.backFacade+mid)/2,
 (mid+BUILDING.frontFacade)/2]){
 const x=plan.wings.find(w=>w.side===-1).minX;
 const y=plan.y+.64+.73;
 assert.ok(!plan.segments.some(s=>s.name.startsWith("end-lining")&&
  s.minX<=x&&s.maxX>=x&&s.minZ<=z&&s.maxZ>=z&&
  s.minY<=y&&s.maxY>=y),"end sash not plastered over");
}
const player=new PlayerController({building:BUILDING,pads:audit.entryPads,entry,
 spawn:{x:entry.x,z:10.85}});
assert.ok(player.setEntryDoorOpen(true));
function walk(dx,dz,n){
 player.setStick(dx,dz);
 for(let i=0;i<n;i++){
  const prev={...player.position};player.update(.05);
  assert.ok(Math.hypot(player.position.x-prev.x,player.position.z-prev.z)<.19);
  assert.ok(Math.abs(player.position.y-prev.y)<.19);
 }
}
walk(0,1,90);walk(1,0,18);walk(0,1,100);
assert.equal(player.position.y,entry.floorHeight(0));
assert.equal(player.nearestDoor()?.id,"first-floor-3");
walk(0,-1,6);
assert.equal(player.nearestDoor()?.number,3);
assert.ok(player.setFirstFloorDoorOpen(3,true));
walk(1,0,45);
assert.ok(entry.firstFloorPlan.contains(player.position.x,player.position.z,player.position.y));
assert.ok(player.position.x>plan.doors[2].x+.52);
assert.ok(!collidesAt(player.position.x,player.position.z,plan.doorBlockers.filter(b=>
 b.name!=="flat-3-closed"),PLAYER_RADIUS,plan.y));
console.log("MINI CITY stage 4.7.3 PASS: roof, panel seams, 296 real windows, 3 edge windows, no missing rear walls and navigable first flat");
