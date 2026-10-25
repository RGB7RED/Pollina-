import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,collidesAt,PLAYER_RADIUS} from "./controller.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const game=read("./game.js"),html=read("./index.html");
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1);
assert.match(game,/actorPivot\.position\.set\(state.x,state.y,state.z\)/);
assert.equal(BUILDING.floors,5);
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>({
 x,width:5.5,depth:3.15,centreZ:7.875
}));
const entry=planPlayableEntrance(BUILDING,pads),x=entry.x;
assert.equal(entry.buildingObstacles.length,30);
assert.equal(entry.totalFloors,5);
assert.equal(entry.stair.steps,12);
assert.equal(entry.stair.turnZ,2.05);
assert.equal(entry.stair.bottomZ,-1.58);
assert.equal(entry.stair.backZ,-4.85);
assert.equal(entry.corridor,undefined);
assert.ok(entry.stair.bottomZ-entry.stair.backZ>=1.75);
assert.ok(entry.stair.frontZ-entry.stair.turnZ>=1.20);
assert.ok(collidesAt(x,entry.stair.backZ-.5,entry.buildingObstacles,PLAYER_RADIUS));
assert.ok(!collidesAt(x,-2.4,entry.buildingObstacles,PLAYER_RADIUS));
assert.ok(!collidesAt(x-1.35,-2.4,entry.buildingObstacles,PLAYER_RADIUS));
assert.ok(!collidesAt(x+1.35,-2.4,entry.buildingObstacles,PLAYER_RADIUS));
assert.ok(collidesAt(x+2.5,-2.4,entry.buildingObstacles,PLAYER_RADIUS));
assert.ok(collidesAt(pads[1].x,5.1,entry.buildingObstacles,PLAYER_RADIUS));
for(let f=0;f<5;f++){
 const y=entry.stair.firstFloor+f*entry.stair.storeyHeight;
 assert.equal(entry.floorHeight(f),y);
 assert.equal(entry.groundHeight(x,-2.4,y),y);
 assert.equal(entry.zone(x,-2.4,y),
  "площадка "+(f+1)+"-го этажа · квартиры "+(f*4+1)+"–"+(f*4+4));
}
assert.equal(entry.groundHeight(x,-2.4,19),entry.stair.firstFloor+4*entry.stair.storeyHeight);
const player=new PlayerController({building:BUILDING,pads,entry,
 spawn:{x,z:10.85}});
assert.ok(player.setEntryDoorOpen(true),"one outer door opens");
assert.equal(entry.innerDoor,undefined,"the second door collider was removed");
function go(a,z,n){
 player.setStick(a,z);
 for(let i=0;i<n;i++){
  const before={...player.position},p=player.update(.05);
  assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<.19,"no teleport");
  assert.ok(Math.abs(p.y-before.y)<.19,"no vertical teleport");
 }
}
function at(y,name){assert.ok(Math.abs(player.position.y-y)<.000001,
 name+" got "+player.position.y+" expected "+y);}
go(0,1,90); // enter the now spacious single-door vestibule
assert.equal(player.position.y,.70);
go(1,0,18); // align with stair that runs beside the RIGHT wall
assert.ok(player.position.x>entry.stair.entryX-.20);
go(0,1,100); // stop on usable floor, not against the new electric cabinet
at(entry.stair.firstFloor,"raised rear landing 1");
assert.ok(player.position.z<-2.5);
for(let floor=1;floor<5;floor++){
 go(-1,0,floor===1?40:70);assert.ok(player.position.x<x-1.0);
 go(0,-1,108);
 at(entry.stair.firstFloor+(floor-.5)*entry.stair.storeyHeight,"front half landing "+floor);
 assert.ok(player.position.z>4.6&&player.position.z<5.35);
 go(1,0,90);assert.ok(player.position.x>x+1.1);
 go(0,1,109);
 at(entry.stair.firstFloor+floor*entry.stair.storeyHeight,"rear floor "+(floor+1));
 assert.ok(player.position.z< -2.70);
 assert.equal(entry.zone(player.position.x,player.position.z,player.position.y),
  "площадка "+(floor+1)+"-го этажа · квартиры "+(floor*4+1)+"–"+(floor*4+4));
}
assert.equal(player.nearestDoor(),null);
for(let floor=4;floor>=1;floor--){
 go(0,-1,109);
 at(entry.stair.firstFloor+(floor-.5)*entry.stair.storeyHeight,"descending right "+floor);
 go(-1,0,90);
 go(0,1,108);
 at(entry.stair.firstFloor+(floor-1)*entry.stair.storeyHeight,"descending left "+floor);
 if(floor>1)go(1,0,70);
}
go(1,0,43); // move from left U-flight to RIGHT entrance flight
assert.ok(Math.abs(player.position.x-entry.stair.entryX)<entry.stair.entryWidth/2-.05,
  "right entrance flight remains accessible across full tread width");
go(0,-1,135); // descend all twelve entry steps into the foyer
assert.equal(player.position.y,.70);
go(-1,0,18); // centre on ORIGINAL exterior doorway
assert.ok(Math.abs(player.position.x-x)<.3);
go(0,-1,160);
assert.ok(player.position.z>10,"back outside in same city");
assert.equal(player.position.y,0);
player.reset();
assert.equal(player.entryDoorOpen,false);
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
assert.equal(audit.completeStaircase.floors,5);
assert.equal(audit.completeStaircase.flights,9);
assert.equal(audit.completeStaircase.treads,108);
assert.equal(audit.completeStaircase.liftCount,0);
assert.equal(audit.completeStaircase.corridor,undefined);
const landing=audit.completeStaircase.landing;
assert.ok(landing.depth>=1.75);
assert.ok(landing.maxZ<0,"not the old front wall");
assert.equal(landing.doorsPerFloor,4);
const rail=audit.completeStaircase.railing;
assert.equal(rail.height,.94);
assert.equal(rail.balustersPerFlight,8);
assert.equal(rail.railsPerFlight,3);
assert.equal(rail.wallSideRails,0);
assert.equal(rail.innerGuardLinks,4);
assert.equal(rail.continuous,true);
const doors=audit.completeStaircase.apartmentDoors;
assert.equal(doors.length,20);
assert.deepEqual(doors.map(d=>d.number),[3,4,1,2,...Array.from({length:16},(_,i)=>i+5)]);
assert.ok(doors.every(d=>d.entrance===1));
assert.deepEqual(doors.filter(d=>d.accessible).map(d=>d.number),[3,4,1,2,17],
 "only one fifth-floor apartment is constructed; all others remain closed");
for(let f=1;f<=5;f++){
 const four=doors.filter(d=>d.floor===f);
 assert.equal(four.length,4);
 assert.deepEqual(four.map(d=>d.orientation),["left","left","right","right"]);
 assert.ok(four.every(d=>d.zone==="rear-stair-landing"));
 assert.ok(four.every(d=>d.x>=landing.minX&&d.x<=landing.maxX));
 assert.ok(four.every(d=>d.z>=landing.minZ&&d.z<=landing.maxZ));
 assert.ok(four[0].x<x&&four[1].x<x);
 assert.ok(Math.abs(four[0].x-four[1].x)<1e-5);
 assert.ok(four[2].x>x+1.65&&four[3].x>x+1.65);
}
assert.equal(house.innerDoorPivot,null,"the deleted partition door has no 3D pivot");
assert.equal(audit.foyer.doorCount,1,"only the original facade door remains");
assert.equal(audit.foyer.tiles,80,"wider entrance has actual floor tiles");
assert.equal(audit.foyer.mailboxLevel,3.30,"mailboxes now live between floors 1–2");
const instanced=house.root.children.filter(o=>o instanceof InstancedMesh);
assert.ok(instanced.length<=35,"one dedicated batch for real transparent stairwell glass");
console.log("MINI CITY 4.5.4.7 PASS: deep cabinet end wall, 20 side doors, 4 U climbs/descents and no radiator collisions");
