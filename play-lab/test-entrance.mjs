import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse,planFacade} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,collidesAt,PLAYER_RADIUS} from "./controller.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const game=read("./game.js"),html=read("./index.html");
const src=read("../building-lab/building.js");
assert.match(game,/planPlayableEntrance\(config,pads\)/);
assert.match(game,/doorPivot\.rotation\.y/);
assert.match(game,/actorPivot\.position\.set\(state\.x,state\.y,state\.z\)/);
assert.match(game,/setEntryDoorOpen\(/);
assert.match(html,/id="entry-action"/);
assert.equal((game.match(/new THREE\.Scene\(/g)||[]).length,1,
  "one scene only: no interior world and no loading/teleport");
assert.doesNotMatch(game,/window\.location\s*=.*entrance|new GLTFLoader\(.*entrance/);
assert.equal(planFacade().filter(x=>x.entrance).length,4);
const realPads=[-26.3625,-8.7875,8.7875,26.3625].map(x=>({
 x,width:5.5,depth:3.15,centreZ:7.875
}));
const entry=planPlayableEntrance(BUILDING,realPads);
assert.equal(entry.x,realPads[0].x);
assert.equal(entry.facade,BUILDING.frontFacade);
assert.equal(entry.insideEnd,3.35);
assert.equal(entry.buildingObstacles.length,25);
assert.ok(!collidesAt(entry.x,5.1,entry.buildingObstacles,PLAYER_RADIUS),
  "first vestibule is walkable before the door collider is considered");
assert.ok(collidesAt(entry.x,entry.door.minZ+.10,[entry.door]),
  "closed leaf physically blocks facade");
assert.ok(collidesAt(realPads[1].x,5.1,entry.buildingObstacles),
  "second entrance remains solid");
assert.ok(!collidesAt(entry.x+1.30,5.2,entry.buildingObstacles),
  "foyer is walkable outside previous narrow partition");
assert.ok(collidesAt(entry.x+1.30,6.30,entry.buildingObstacles),
  "existing exterior masonry remains closed beside actual door");
assert.ok(!entry.canInteract(entry.x,12.0));
assert.ok(entry.canInteract(entry.x,8.0));
const nearHeight=[10.65,10.0,9.42,7.1,6.23,5,3.35].map(z=>
 entry.groundHeight(entry.x,z));
assert.deepEqual(nearHeight.map(x=>+x.toFixed(3)),
 [0,0,0,0,0,0,0]);
assert.equal(entry.groundHeight(entry.x+3,5.2),0);
assert.ok(entry.isInside(entry.x,5));
assert.ok(!entry.isInside(entry.x,8));
const player=new PlayerController({building:BUILDING,pads:realPads,
 entry,spawn:{x:entry.x,z:10.85}});
player.setStick(0,1);
let lastY=player.position.y;
for(let i=0;i<190;i++){
 player.update(.05);
 assert.ok(player.position.y+1e-8>=lastY,
   "entry ramp rises smoothly while approaching the door");
 lastY=player.position.y;
}
assert.ok(player.position.z>entry.door.maxZ+PLAYER_RADIUS-.1,
 "closed front door must prevent passage");
assert.ok(!player.isInsideEntrance());
assert.equal(player.setEntryDoorOpen(true),true);
assert.ok(!player.obstacles.includes(entry.door));
let entered=false,lastZ=player.position.z,lastHeight=player.position.y;
for(let i=0;i<105;i++){
 const state=player.update(.05);
 assert.ok(lastZ-state.z<=.17,"no teleport or jumps through facade");
 assert.ok(Math.abs(state.y-lastHeight)<.04,
   "continuous foot height through the sill and inside");
 lastZ=state.z;lastHeight=state.y;
 if(player.isInsideEntrance())entered=true;
}
assert.ok(entered,"the avatar walks INSIDE the same house scene");
assert.ok(player.position.z>=entry.insideEnd-.02,
 "open shaft at the bottom of the first flight has no imaginary flat passage");
assert.equal(entry.groundHeight(entry.x,1.5,0),null);
assert.equal(player.position.y,0);
assert.equal(player.setEntryDoorOpen(false),true,
 "door closes after avatar clears threshold into interior");
assert.ok(player.obstacles.includes(entry.door));
player.setStick(0,-1); // Walk towards outside while leaf is closed.
for(let i=0;i<90;i++)player.update(.05);
assert.ok(player.position.z<entry.door.minZ-PLAYER_RADIUS+.1,
 "closed door prevents walking back through");
assert.ok(player.setEntryDoorOpen(false));
assert.ok(player.canUseEntryDoor());
assert.ok(player.setEntryDoorOpen(true));
for(let i=0;i<150;i++)player.update(.05);
assert.ok(player.position.z>9.8,"exit to original street is possible");
assert.equal(player.position.y,0);
assert.ok(!player.isInsideEntrance());
player.reset();
assert.equal(player.entryDoorOpen,false);
assert.ok(player.obstacles.includes(entry.door));
assert.equal(player.position.z,10.85);

// Exercise the actual shared building generator (facade + physical vestibule).
class Vector{constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}}
class Group{
 constructor(){this.children=[];this.position=new Vector();
 this.rotation=new Vector();this.scale=new Vector();this.userData={};
 this.matrix={clone:()=>({position:{...this.position},
 scale:{...this.scale},rotation:{...this.rotation}})};}
 add(o){this.children.push(o);}
 updateMatrix(){}
}
class Geometry{constructor(...args){this.args=args;}
 setAttribute(k,v){this[k]=v;}
 computeVertexNormals(){this.normals=true;}}
class Mesh extends Group{
 constructor(geom,mat){super();this.geometry=geom;this.material=mat;}
}
class InstancedMesh extends Mesh{
 constructor(g,m,count){super(g,m);this.count=count;this.matrices=[];
 this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}
 computeBoundingSphere(){}
}
class Material{constructor(o){Object.assign(this,o);}}
const THREE={
 Group,Object3D:Group,Mesh,InstancedMesh,
 MeshStandardMaterial:Material,
 BoxGeometry:Geometry,BufferGeometry:Geometry,
 Float32BufferAttribute:class{constructor(a,n){this.array=a;}},
 DoubleSide:2
};
const house=buildApartmentHouse(THREE);
const pivot=house.doorPivot;
assert.ok(pivot instanceof Group);
assert.equal(pivot.name,"entrance-1-hinged-door");
assert.equal(pivot.children.length,4);
assert.ok(house.root.children.includes(pivot));
assert.equal(house.stats.entrances,4);
assert.equal(house.stats.doorHoles,4);
assert.equal(house.root.userData.geometryAudit.entryPads.length,4);
assert.ok(Math.abs(house.root.userData.geometryAudit.playableEntrance.x-entry.x)<.001);
assert.equal(house.root.userData.geometryAudit.playableEntrance.vestibuleBack,entry.insideEnd);
assert.ok(pivot.position.z<BUILDING.frontFacade,"door is recessed into REAL front opening");
assert.equal(pivot.rotation.y,0);
pivot.rotation.y=1.40;
assert.ok(pivot.rotation.y>1,"leaf can physically pivot in place");
console.log("MINI CITY 4.5.1 PASS: opening door, no transition, walk-in/out, real vestibule, ramp, collision, four entrances preserved");
