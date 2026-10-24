import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,PLAYER_RADIUS,collidesAt} from "./controller.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const game=read("./game.js"),view=read("./index.html");
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1);
assert.match(game,/innerDoorPivot\.rotation\.y/);
assert.match(game,/new THREE\.PointLight/);
assert.match(game,/function updateEntryAction\(/);
assert.match(game,/controller\.nearestDoor\(/);
assert.match(game,/controller\.setInnerDoorOpen\(/);
assert.match(view,/id="entry-action"/);
assert.doesNotMatch(game,/location\.href\s*=.*foyer|new THREE\.Scene\(\).*inner/);
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>
 ({x,width:5.50,depth:3.15,centreZ:7.875}));
const e=planPlayableEntrance(BUILDING,pads);
assert.equal(e.innerDoorZ,4.82);
assert.equal(e.innerDoor.name,"entrance-1-inner-closed-door");
assert.ok(!collidesAt(e.x,5.25,e.buildingObstacles,PLAYER_RADIUS));
assert.ok(collidesAt(e.x,e.innerDoorZ,[e.innerDoor]));
assert.equal(e.zone(e.x,5.45),"тамбур");
assert.equal(e.zone(e.x,4.20),"тамбур");
const c=new PlayerController({building:BUILDING,pads,entry:e,
 spawn:{x:e.x,z:10.85}});
assert.equal(c.obstacles.length,e.buildingObstacles.length+2);
assert.equal(c.nearestDoor(),null,"far from entrance: button must hide");
c.setStick(0,1);
for(let i=0;i<190;i++)c.update(.05);
assert.equal(c.nearestDoor().id,"outer");
assert.ok(c.position.z>e.door.maxZ+PLAYER_RADIUS-.08,
 "can't pass closed exterior door");
assert.equal(c.toggleNearestDoor(),true);
assert.equal(c.entryDoorOpen,true);
assert.equal(c.innerDoorOpen,false);
assert.ok(!c.obstacles.includes(e.door));
for(let i=0;i<100;i++)c.update(.05);
assert.ok(c.isInsideEntrance(),"real first vestibule, no second scene");
assert.equal(c.nearestDoor().id,"inner");
assert.equal(c.entry.zone(c.position.x,c.position.z),"тамбур");
assert.ok(c.position.z>e.innerDoor.maxZ+PLAYER_RADIUS-.08,
 "a second closed leaf blocks way to stairwell");
assert.ok(c.obstacles.includes(e.innerDoor));
assert.equal(c.toggleNearestDoor(),true);
assert.equal(c.innerDoorOpen,true);
assert.ok(!c.obstacles.includes(e.innerDoor));
let crossed=false,previous=c.position.z,lastY=c.position.y;
for(let i=0;i<110;i++){
 const state=c.update(.05);
 assert.ok(previous-state.z<=.17,"no teleport through interior partition");
 assert.ok(Math.abs(state.y-lastY)<.19,"physical 12-step ascent, no vertical teleport");
  lastY=state.y;
 previous=state.z;
 if(state.entranceZone==="площадка 1-го этажа · квартиры 1–4")crossed=true;
}
assert.ok(crossed,"player reaches the true first-floor landing");
assert.ok(c.position.z>e.stair.backZ+.28,
 "the deep rear apartment landing stops at a real back wall");
// Now that stairs exist, the landing is deeper than door interaction
// distance. Walk back to the real door before attempting to close it.
c.setStick(0,-1);
for(let i=0;i<95;i++)c.update(.05);
assert.equal(c.nearestDoor()?.id,"inner");
assert.equal(c.toggleNearestDoor(),true,"door closes from the landing");
assert.equal(c.innerDoorOpen,false);
assert.ok(c.obstacles.includes(e.innerDoor));
c.setStick(0,-1);
for(let i=0;i<75;i++)c.update(.05);
assert.ok(c.position.z<e.innerDoor.minZ-PLAYER_RADIUS+.08,
 "closed second door stops player from exiting landing");
assert.equal(c.nearestDoor().id,"inner");
assert.equal(c.toggleNearestDoor(),true);
for(let i=0;i<135;i++)c.update(.05);
assert.ok(c.position.z>10,"player gets back outside through both open doors");
assert.equal(c.position.y,0);
c.reset();
assert.equal(c.entryDoorOpen,false);
assert.equal(c.innerDoorOpen,false);
assert.ok(c.obstacles.includes(e.door)&&c.obstacles.includes(e.innerDoor));
assert.equal(c.obstacles.length,e.buildingObstacles.length+2);
assert.ok(collidesAt(pads[1].x,5.0,c.obstacles),
 "three other entrances remain blocked");

// The real house facade and the furnished first-floor foyer share a root.
class Vector{
 constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){Object.assign(this,{x,y,z});}
}
class Group{
 constructor(){this.children=[];this.position=new Vector();
  this.rotation=new Vector();this.scale=new Vector();this.userData={};
  this.matrix={clone:()=>({position:{...this.position},
   rotation:{...this.rotation},scale:{...this.scale}})};}
 add(x){this.children.push(x);}updateMatrix(){}
}
class Geometry{
 setAttribute(k,v){this[k]=v;}computeVertexNormals(){}
}
class Mesh extends Group{
 constructor(geo,material){super();this.geometry=geo;this.material=material;}
}
class InstancedMesh extends Mesh{
 constructor(geo,material,count){super(geo,material);this.count=count;
  this.matrices=[];this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}
 computeBoundingSphere(){}
}
class Material{constructor(o){Object.assign(this,o);}}
const THREE={Group,Object3D:Group,Mesh,InstancedMesh,
 MeshStandardMaterial:Material,BoxGeometry:Geometry,BufferGeometry:Geometry,
 Float32BufferAttribute:class{constructor(a,n){this.array=a;}},DoubleSide:2};
const house=buildApartmentHouse(THREE),audit=house.root.userData.geometryAudit;
assert.equal(house.stats.entrances,4);
assert.equal(house.stats.doorHoles,4);
assert.equal(audit.entryPads.length,4);
assert.equal(audit.foyer.mailboxes,20);
assert.equal(audit.foyer.tiles,32);
assert.equal(audit.foyer.doorCount,2);
assert.equal(audit.foyer.innerDoorZ,e.innerDoorZ);
assert.equal(audit.foyer.floorLevel,.70);
assert.ok(Math.abs(audit.foyer.x-e.x)<.001);
assert.equal(house.doorPivot.name,"entrance-1-hinged-door");
assert.equal(house.innerDoorPivot.name,"entrance-1-inner-hinged-door");
assert.ok(house.root.children.includes(house.doorPivot));
assert.ok(house.root.children.includes(house.innerDoorPivot));
assert.equal(house.innerDoorPivot.children.length,7);
assert.ok(Math.abs(house.innerDoorPivot.position.z-e.innerDoorZ)<1e-6);
assert.ok(Math.abs(house.innerDoorPivot.position.x-(e.x-1.39/2))<1e-6);
assert.equal(house.innerDoorPivot.position.y,.73);
assert.ok(house.root.children.some(x=>x.name==="instanced facade detail"));
const instanced=house.root.children.filter(x=>x instanceof InstancedMesh);
assert.ok(instanced.length<=33,"one added transparent-window batch; still under mobile draw-call budget");
assert.ok(house.stats.instancedElements>1600);
console.log("MINI CITY 4.5.2 PASS: 20 mailbox slots, 32 tiles, partitioned vestibule and landing, two collision-aware real doors, seamless exit, mobile budget");
