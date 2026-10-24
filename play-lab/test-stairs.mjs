import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,PLAYER_RADIUS,collidesAt} from "./controller.js";
const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const game=source("./game.js"),view=source("./index.html");
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1);
assert.match(view,/Лестница на второй этаж/);
assert.match(game,/actorPivot\.position\.set\(state.x,state.y,state.z\)/);
assert.match(game,/setInnerDoorOpen/);
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>({x,width:5.5,depth:3.15,centreZ:7.875}));
const e=planPlayableEntrance(BUILDING,pads);
assert.equal(e.buildingObstacles.length,11);
assert.equal(e.stair.steps,12);
assert.equal(e.stair.halfRise,BUILDING.floorHeight/2);
assert.equal(e.stair.bottomZ,3.00);
assert.equal(e.stair.backZ,-1.63);
const x=e.x;
assert.equal(e.groundHeight(x-.72,-1.15),.70+e.stair.halfRise);
assert.equal(e.groundHeight(x+.72,-1.15),.70+e.stair.halfRise);
assert.equal(e.groundHeight(x+.72,2.99),.70+BUILDING.floorHeight);
assert.ok(Math.abs(e.groundHeight(x-.72,2.99)-.816)<.02);
assert.ok(collidesAt(x,-2.0,e.buildingObstacles,PLAYER_RADIUS),"stair rear wall");
assert.ok(collidesAt(x,1.0,e.buildingObstacles,PLAYER_RADIUS),"flight divider");
assert.ok(!collidesAt(x-.72,1.0,e.buildingObstacles,PLAYER_RADIUS));
assert.ok(!collidesAt(x+.72,1.0,e.buildingObstacles,PLAYER_RADIUS));
const p=new PlayerController({building:BUILDING,pads,entry:e,spawn:{x,z:10.85}});
assert.ok(p.setEntryDoorOpen(true)&&p.setInnerDoorOpen(true));
const record=[];
function go(ax,az,n){
 p.setStick(ax,az);
 for(let i=0;i<n;i++){
  const before={...p.position};
  const next=p.update(.05);
  assert.ok(Math.hypot(next.x-before.x,next.z-before.z)<.19,
    "step cannot teleport horizontally");
  assert.ok(Math.abs(next.y-before.y)<.19,
    "cannot jump vertically between flights");
  record.push({...p.position});
 }
}
go(0,1,145);
assert.ok(p.position.z>=2.95&&p.position.z<=3.10,
 "straight centre corridor must not shortcut around a divided stairwell");
assert.equal(p.position.y,.70);
go(-1,0,17);
assert.ok(p.position.x<x-.39);
go(0,1,160);
assert.ok(p.position.z<-1.0,"reach half-floor turn");
assert.equal(p.position.y,.70+BUILDING.floorHeight/2);
go(1,0,40);
assert.ok(p.position.x>x+.70,"turn across landing in same house");
go(0,-1,145);
assert.ok(p.position.z>2.7&&p.position.z<3.05);
assert.ok(Math.abs(p.position.y-(.70+BUILDING.floorHeight))<1e-8,
 "reach actual second-floor landing (not a scene switch)");
assert.ok(p.isInsideEntrance());
const maxHeight=Math.max(...record.map(p=>p.y));
assert.ok(maxHeight>=3.47);
assert.ok(record.some(v=>v.y>2&&v.y<3));
assert.ok(p.position.y>.70+BUILDING.floorHeight-.01);
assert.equal(p.entry.zone(p.position.x,p.position.z),"второй марш");
p.reset();
assert.equal(p.position.y,0);
assert.equal(p.innerDoorOpen,false);
assert.equal(p.entryDoorOpen,false);
assert.ok(p.obstacles.includes(e.door)&&p.obstacles.includes(e.innerDoor));
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
assert.equal(stairs.stairwellWidth,2.88);
assert.equal(stairs.bottomZ,e.stair.bottomZ);
assert.equal(stairs.turnZ,e.stair.turnZ);
assert.equal(stairs.backZ,e.stair.backZ);
assert.equal(stairs.halfLandingHeight,.70+BUILDING.floorHeight/2);
assert.equal(stairs.secondFloorHeight,.70+BUILDING.floorHeight);
assert.equal(house.stats.doorHoles,4);
assert.equal(house.stats.entrances,4);
assert.equal(audit.foyer.mailboxes,20);
assert.equal(audit.foyer.tiles,32);
assert.equal(house.innerDoorPivot.name,"entrance-1-inner-hinged-door");
assert.equal(house.innerDoorPivot.children.length,7);
const glass=house.innerDoorPivot.children.filter(m=>m.material.transparent===true);
assert.equal(glass.length,1,"one actual clear-glass insert, not an opaque fake");
assert.equal(glass[0].material.depthWrite,false);
assert.ok(glass[0].material.opacity<.35);
assert.ok(audit.foyer.secondDoorWindow.width>.9);
assert.equal(audit.foyer.secondDoorWindow.transparent,true);
const windowMidY=(audit.foyer.secondDoorWindow.bottom+audit.foyer.secondDoorWindow.top)/2;
const glassBounds=glass[0];
assert.ok(Math.abs(glassBounds.position.y-windowMidY)<1e-6);
const metal=house.innerDoorPivot.children.filter(m=>m.material.color===0x777e79);
assert.equal(metal.length,4);
for(const m of metal){
 const top=m.position.y+m.scale.y/2,bot=m.position.y-m.scale.y/2;
 if(top>windowMidY&&bot<windowMidY){
  assert.ok(Math.abs(m.position.x-glassBounds.position.x)>m.scale.x/2,
    "opaque door metal must NOT cover the middle of the actual window");
 }
}
assert.ok(house.root.children.includes(house.innerDoorPivot));
const instanced=house.root.children.filter(m=>m instanceof InstancedMesh);
assert.ok(instanced.length<=33,"mobile instancing budget for extra stair glass");
assert.ok(house.stats.instancedElements>1600);
console.log("MINI CITY 4.5.3 PASS: 24 steps in physical U-stair, genuine second-floor landing, one scene, real transparent inner-door window, prior foyer intact");
