import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,collidesAt,PLAYER_RADIUS} from "./controller.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const game=read("./game.js"),html=read("./index.html");
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1,
  "single city scene, never a separate floor loader");
assert.match(game,/actorPivot\.position\.set\(state.x,state.y,state.z\)/);
assert.match(game,/buildApartmentHouse\(THREE\)/);
assert.doesNotMatch(game,/window\.location.*(stairs|apartment|floor)/);
assert.equal(BUILDING.floors,5);
assert.equal(BUILDING.entrances,4);
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>({
 x,width:5.50,depth:3.15,centreZ:7.875
}));
const entry=planPlayableEntrance(BUILDING,pads);
assert.equal(entry.totalFloors,5);
assert.equal(entry.buildingObstacles.length,12);
assert.ok(Math.abs(entry.corridor.endX-entry.x-6.4)<1e-6);
assert.ok(entry.corridor.minZ>entry.stair.turnZ);
assert.equal(entry.stair.steps,12);
assert.equal(entry.stair.halfRise,1.39);
const x=entry.x;
assert.ok(collidesAt(x,1,entry.buildingObstacles,PLAYER_RADIUS),
 "central stair divider blocks shortcuts between adjacent flights");
assert.ok(!collidesAt(x+.88,2.7,entry.buildingObstacles,PLAYER_RADIUS));
assert.ok(collidesAt(x+7,2.7,entry.buildingObstacles,PLAYER_RADIUS),
 "hallway has a real terminal wall");
assert.ok(collidesAt(pads[1].x,5.1,entry.buildingObstacles,PLAYER_RADIUS),
 "other three entrances remain blocked");
for(let level=0;level<5;level++){
 const y=.70+level*BUILDING.floorHeight;
 assert.equal(entry.floorHeight(level),y);
 assert.equal(entry.groundHeight(x+3.2,2.65,y),y,
  "each apartment corridor uses its real Y plane");
 assert.equal(entry.zone(x+3.2,2.65,y),
  "коридор "+(level+1)+"-го этажа · квартиры "+
    (level*4+1)+"–"+(level*4+4));
}
assert.equal(entry.groundHeight(x+3.2,2.65,15),.70+4*BUILDING.floorHeight,
 "the fifth floor is the top; no impossible sixth floor");
const player=new PlayerController({building:BUILDING,pads,entry,
 spawn:{x,z:10.85}});
assert.equal(player.toggleNearestDoor(),false,"doors cannot toggle from street");
assert.ok(player.setEntryDoorOpen(true));
assert.ok(player.setInnerDoorOpen(true));
let moves=0;
function go(ax,az,iterations){
 player.setStick(ax,az);
 for(let i=0;i<iterations;i++){
  const before={...player.position},state=player.update(.05);
  assert.ok(Math.hypot(state.x-before.x,state.z-before.z)<=.17,
   "player moves continuously without horizontal teleport");
  assert.ok(Math.abs(state.y-before.y)<.19,
   "character cannot jump a whole flight vertically");
  moves++;
 }
}
function at(y,label){
 assert.ok(Math.abs(player.position.y-y)<.0001,
   label+": actual feet Y "+player.position.y+" expected "+y);
}
go(0,1,145);at(.70,"first floor foyer");
go(0,1,5);
go(1,0,100);
assert.ok(player.position.x-x>5.7,"first-floor corridor is walkable");
at(.70,"first-floor apartment corridor");
assert.match(entry.zone(player.position.x,player.position.z,player.position.y),
 /квартиры 1–4/);
go(-1,0,100);
assert.ok(player.position.x-x<.45,"return to first stair landing");
go(-1,0,17);
assert.ok(player.position.x-x<-.40,"start the first, left-side flight");
for(let floor=1;floor<5;floor++){
 go(0,1,155);
 at(.70+(floor-.5)*BUILDING.floorHeight,"turnaround floor "+floor);
 assert.ok(player.position.z<entry.stair.turnZ-.2);
 go(1,0,40);
 assert.ok(player.position.x-x>.7,"cross actual half-landing");
 go(0,-1,145);
 at(.70+floor*BUILDING.floorHeight,"arrival at floor "+(floor+1));
 assert.ok(player.position.z>2.75&&player.position.z<3.05);
 go(1,0,100);
 at(.70+floor*BUILDING.floorHeight,"corridor "+(floor+1));
 assert.ok(player.position.x-x>5.7,"reach the apartment doors");
 assert.equal(entry.zone(player.position.x,player.position.z,player.position.y),
 "коридор "+(floor+1)+"-го этажа · квартиры "+
   (floor*4+1)+"–"+(floor*4+4));
 if(floor<4){
  go(-1,0,100);
  assert.ok(player.position.x-x<-.40,
    "walk back to the left flight of the next floor");
 }
}
assert.ok(player.position.y>11.8,"fifth floor genuinely reached");
go(-1,0,100); // back from the fifth-floor flats
go(1,0,27); // align with RIGHT descending flight, not nonexistent sixth
assert.ok(player.position.x-x>.70);
for(let floor=4;floor>=1;floor--){
 go(0,1,160);
 at(.70+(floor-.5)*BUILDING.floorHeight,"descent midway "+floor);
 go(-1,0,40);
 go(0,-1,155);
 if(floor>1){
  go(1,0,27); // centre of right-hand flight, not hall wall
  at(.70+(floor-1)*BUILDING.floorHeight,"descent to floor "+floor);
 }
}
go(1,0,15);go(0,-1,160);
assert.ok(player.position.z>10,"return to original street from fifth floor");
assert.equal(player.position.y,0);
assert.ok(!player.isInsideEntrance());
player.reset();
assert.equal(player.entryDoorOpen,false);
assert.equal(player.innerDoorOpen,false);
assert.ok(player.obstacles.includes(entry.door));
assert.ok(player.obstacles.includes(entry.innerDoor));
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
 constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();
 this.scale=new Vec();this.matrix={clone:()=>({position:{...this.position},
 rotation:{...this.rotation},scale:{...this.scale}})};}
 add(o){this.children.push(o);}updateMatrix(){}
}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){this.normals=true;}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
 constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];
 this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Mat{constructor(o){Object.assign(this,o);}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
 MeshStandardMaterial:Mat,BoxGeometry:Geo,BufferGeometry:Geo,
 Float32BufferAttribute:class{constructor(a,n){this.array=a;}},DoubleSide:2};
const house=buildApartmentHouse(THREE);
const audit=house.root.userData.geometryAudit;
assert.equal(house.stats.entrances,4);
assert.equal(house.stats.doorHoles,4);
assert.equal(audit.foyer.mailboxes,20);
assert.equal(audit.foyer.tiles,32);
assert.equal(audit.completeStaircase.floors,5);
assert.equal(audit.completeStaircase.flights,8);
assert.equal(audit.completeStaircase.treads,96);
assert.equal(audit.completeStaircase.liftCount,0);
assert.equal(audit.completeStaircase.levels.length,4);
assert.deepEqual(audit.completeStaircase.levels.map(x=>x.fromFloor),
 [1,2,3,4]);
assert.deepEqual(audit.completeStaircase.levels.map(x=>x.toFloor),
 [2,3,4,5]);
const doors=audit.completeStaircase.apartmentDoors;
assert.equal(doors.length,20);
assert.deepEqual(doors.map(d=>d.number),
 Array.from({length:20},(_,i)=>i+1));
assert.ok(doors.every(d=>d.entrance===1&&!d.accessible),
 "apartment entrances exist, but apartment interiors are NOT claimed ready");
for(let f=1;f<=5;f++){
 const each=doors.filter(d=>d.floor===f);
 assert.equal(each.length,4,"exactly four doors per floor");
 assert.equal(each.filter(d=>d.side===-1).length,2);
 assert.equal(each.filter(d=>d.side===1).length,2);
 assert.ok(each.every(d=>d.x>x+1.6&&d.x<x+5.1));
 assert.ok(each.every(d=>Number.isFinite(d.z)));
}
assert.equal(house.innerDoorPivot.name,"entrance-1-inner-hinged-door");
assert.ok(house.root.children.includes(house.innerDoorPivot));
const glass=house.innerDoorPivot.children.filter(m=>m.material.transparent);
assert.equal(glass.length,1,"previously accepted truly glazed door retained");
assert.ok(glass[0].material.opacity<.35);
const batch=house.root.children.filter(o=>o instanceof InstancedMesh);
assert.ok(batch.length<=32,"mobile draw group budget unchanged");
console.log("MINI CITY 4.5.4 PASS: five navigable floors, eight actual flights, 96 treads, 20 numbered doors, seamless ascent AND descent, no lift");
