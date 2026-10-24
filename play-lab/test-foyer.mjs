import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,PLAYER_RADIUS,collidesAt} from "./controller.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const game=read("./game.js"),view=read("./index.html");
// Stage 4.5.4.5: the inner door and corridor partitions were REMOVED.
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1);
assert.match(game,/function updateEntryAction\(/);
assert.match(game,/controller\.nearestDoor\(/);
assert.match(game,/controller\.setEntryDoorOpen\(/);
assert.doesNotMatch(game,/innerDoorPivot|setInnerDoorOpen|innerDoorOpen/,
  "game must have no removed inner-door runtime");
assert.match(view,/id="entry-action"/);
const pads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>
  ({x,width:5.50,depth:3.15,centreZ:7.875}));
const e=planPlayableEntrance(BUILDING,pads);
assert.equal(e.innerDoor,undefined);
assert.equal(e.innerDoorZ,undefined);
assert.equal(e.corridorHalf,1.74);
assert.ok(!collidesAt(e.x+1.35,5.25,e.buildingObstacles,PLAYER_RADIUS),
  "the room is walkable far outside its old 1.62m corridor");
assert.ok(collidesAt(e.x+1.5,6.3,e.buildingObstacles,PLAYER_RADIUS),
  "existing external facade bricks remain solid by the original door");
const c=new PlayerController({building:BUILDING,pads,entry:e,
  spawn:{x:e.x,z:10.85}});
assert.equal(c.obstacles.length,e.buildingObstacles.length+1);
assert.equal(c.nearestDoor(),null);
function walk(sx,sz,steps){
  c.setStick(sx,sz);
  for(let i=0;i<steps;i++){
    const before={...c.position},state=c.update(.05);
    assert.ok(Math.abs(before.y-state.y)<.19,"no vertical teleport");
    assert.ok(Math.hypot(before.x-state.x,before.z-state.z)<.19,"no XY teleport");
  }
}
walk(0,1,190);
assert.equal(c.nearestDoor().id,"outer");
assert.ok(c.toggleNearestDoor());
assert.equal(c.entryDoorOpen,true);
assert.ok(!c.obstacles.includes(e.door));
walk(0,1,35);
assert.equal(c.position.y,.70);
assert.ok(c.isInsideEntrance());
assert.equal(e.zone(c.position.x,c.position.z),"просторный тамбур");
walk(1,0,18);
assert.ok(Math.abs(c.position.x-e.stair.entryX)<.2);
walk(0,1,155);
assert.equal(c.position.y,e.stair.firstFloor,
  "first apartment floor is reached by a genuine RIGHT-hand stair");
assert.ok(c.position.z<e.stair.bottomZ);
walk(0,-1,135);
assert.equal(c.position.y,.70,"descent returns to the same wide foyer");
walk(-1,0,18);
assert.ok(Math.abs(c.position.x-e.x)<.2);
walk(0,-1,160);
assert.ok(c.position.z>10,"avatar exits via sole original street door");
assert.equal(c.position.y,0);
c.reset();
assert.equal(c.entryDoorOpen,false);
assert.ok(c.obstacles.includes(e.door));
assert.equal(c.obstacles.length,e.buildingObstacles.length+1);
assert.ok(collidesAt(pads[1].x,5,c.obstacles),
  "other three entrances are unchanged");

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
assert.equal(audit.foyer.tiles,80,"floor tiles cover the expanded foyer");
assert.equal(audit.foyer.halfWidth,1.74);
assert.equal(audit.foyer.doorCount,1);
assert.equal(audit.foyer.secondDoorRemoved,true);
assert.equal(audit.foyer.mailboxLevel,3.30);
assert.equal(audit.foyer.floorLevel,.70);
assert.ok(Math.abs(audit.foyer.x-e.x)<.001);
assert.equal(house.doorPivot.name,"entrance-1-hinged-door");
assert.equal(house.innerDoorPivot,null);
assert.ok(house.root.children.includes(house.doorPivot));
assert.ok(!house.root.children.some(node=>node.name==="entrance-1-inner-hinged-door"));
assert.ok(house.root.children.some(node=>node.name==="instanced facade detail"));
const instanced=house.root.children.filter(node=>node instanceof InstancedMesh);
assert.ok(instanced.length<=33,"keep instanced materials, no per-box draw calls");
assert.ok(house.stats.instancedElements>1600);
console.log("MINI CITY 4.5.4.5 PASS: one 3.48m open foyer, right-hand entry stairs, removed inner door, 20 mailboxes upstairs");
