import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,PLAYER_RADIUS,collidesAt} from "./controller.js";
const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const game=source("./game.js"),view=source("./index.html");
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1);
assert.match(view,/лестниц|лестнич/i);
assert.match(game,/actorPivot\.position\.set\(state.x,state.y,state.z\)/);
assert.doesNotMatch(game,/setInnerDoorOpen|innerDoorPivot/,
  "the former inner door was entirely removed from the game");
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>({
 x,width:5.5,depth:3.15,centreZ:7.875
}));
const e=planPlayableEntrance(BUILDING,pads),x=e.x;
assert.equal(e.stair.steps,12);
assert.equal(e.stair.halfRise,e.stair.storeyHeight/2);
assert.equal(e.stair.bottomZ,-1.58);
assert.equal(e.stair.turnZ,2.05);
assert.equal(e.stair.backZ,-4.85);
assert.equal(e.stair.firstFrontZ,e.stair.frontZ);
assert.ok(e.stair.frontZ>5.8);
assert.ok(Math.abs(e.stair.entryX-(x+.84))<1e-8);
assert.equal(e.stair.entryWidth,1.52);
assert.ok(!collidesAt(x+1.3,5.2,e.buildingObstacles,PLAYER_RADIUS),
  "expanded room is traversable toward the RIGHT entry stair");
assert.ok(collidesAt(x+1.3,6.3,e.buildingObstacles,PLAYER_RADIUS),
  "outside facade stays sealed except for the original entrance");
const p=new PlayerController({building:BUILDING,pads,entry:e,spawn:{x,z:10.85}});
assert.ok(p.setEntryDoorOpen(true));
const record=[];
function go(ax,az,n){
 p.setStick(ax,az);
 for(let i=0;i<n;i++){
   const before={...p.position},state=p.update(.05);
   assert.ok(Math.hypot(state.x-before.x,state.z-before.z)<.19,"horizontal continuity");
   assert.ok(Math.abs(state.y-before.y)<.19,"vertical continuity");
   record.push({...p.position});
 }
}
go(0,1,90); // single open foyer
assert.equal(p.position.y,0);
go(1,0,18); // RIGHT wall stair
assert.ok(Math.abs(p.position.x-e.stair.entryX)<e.stair.entryWidth/2-.05);
go(0,1,100);
assert.ok(p.position.z<-2.5&&p.position.z>e.stair.backZ);
assert.equal(p.position.y,e.stair.firstFloor);
go(-1,0,40);
assert.ok(p.position.x<x-1);
go(0,-1,108);
assert.ok(p.position.z>4.6&&p.position.z<5.35);
assert.equal(p.position.y,e.stair.firstFloor+e.stair.halfRise);
go(1,0,80);
assert.ok(p.position.x>x+1);
go(0,1,109);
assert.ok(p.position.z<-2.5);
assert.equal(p.position.y,e.stair.firstFloor+e.stair.storeyHeight);
assert.equal(e.zone(p.position.x,p.position.z,p.position.y),
 "площадка 2-го этажа · квартиры 5–8");
assert.ok(record.some(v=>v.y>2&&v.y<3));
p.reset();
assert.equal(p.position.y,0);
assert.equal(p.entryDoorOpen,false);
assert.ok(p.obstacles.includes(e.door));
assert.equal(e.innerDoor,undefined);
class Vec{
 constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
}
class Node{
 constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
  this.matrix={clone:()=>({position:{...this.position},
    rotation:{...this.rotation},scale:{...this.scale}})};}
 add(n){this.children.push(n);}updateMatrix(){}
}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){this.normals=true;}}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
 constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Mat{constructor(args){Object.assign(this,args);}}
const THREE={Group:Node,Object3D:Node,Mesh,InstancedMesh,
 MeshStandardMaterial:Mat,BoxGeometry:Geo,BufferGeometry:Geo,
 Float32BufferAttribute:class{constructor(a,n){this.array=a;this.itemSize=n;}},DoubleSide:2};
const house=buildApartmentHouse(THREE);
const audit=house.root.userData.geometryAudit;
const stairs=audit.firstStaircase;
assert.equal(stairs.stairFlights,2);
assert.equal(stairs.stepsPerFlight,12);
assert.equal(stairs.stairwellWidth,3.44);
assert.equal(stairs.bottomZ,e.stair.bottomZ);
assert.equal(stairs.turnZ,e.stair.turnZ);
assert.equal(stairs.backZ,e.stair.backZ);
assert.equal(stairs.halfLandingHeight,e.stair.firstFloor+e.stair.halfRise);
assert.equal(stairs.secondFloorHeight,e.stair.firstFloor+e.stair.storeyHeight);
assert.equal(house.stats.doorHoles,4);
assert.equal(house.stats.entrances,4);
assert.equal(audit.foyer.mailboxes,20);
assert.equal(audit.foyer.tiles,80);
assert.equal(audit.foyer.mailboxLevel,3.30);
assert.equal(audit.foyer.doorCount,1);
assert.equal(house.innerDoorPivot,null);
assert.equal(house.doorPivot.name,"entrance-1-hinged-door");
assert.ok(Math.abs(audit.firstStaircase.entryFlight.centreX-(x+.84))<1e-8);
assert.equal(audit.completeStaircase.railing.flightWidth,1.52);
assert.equal(audit.completeStaircase.railing.frontGuardLinks,4);
const instanced=house.root.children.filter(m=>m instanceof InstancedMesh);
assert.ok(instanced.length<=33,"mobile instancing budget for extra stair glass");
assert.ok(house.stats.instancedElements>1600);
console.log("MINI CITY 4.5.4.5 PASS: right-hand first flight, 2nd residential floor, one door and connected window rails");
