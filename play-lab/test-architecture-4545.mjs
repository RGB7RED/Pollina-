// MINI CITY stage 4.5.4.5: single roomy foyer, right-entry ascent,
// inward-widened flights, mailboxes at first mid-landing, connected railings.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING,buildApartmentHouse} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {PlayerController,collidesAt,PLAYER_RADIUS} from "./controller.js";
const game=readFileSync(new URL("./game.js",import.meta.url),"utf8");
const studio=readFileSync(new URL("./studio.js",import.meta.url),"utf8");
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
 constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
 this.matrix={clone:()=>({position:{...this.position},
   rotation:{...this.rotation},scale:{...this.scale}})};}
 add(o){this.children.push(o);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
 constructor(g,m,n){super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};}
 setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class Mat{constructor(o){Object.assign(this,o);}}
class Geo{setAttribute(k,v){this[k]=v;}computeVertexNormals(){}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
 MeshStandardMaterial:Mat,BoxGeometry:Geo,BufferGeometry:Geo,
 Float32BufferAttribute:class{},DoubleSide:2};
const house=buildApartmentHouse(THREE),audit=house.root.userData.geometryAudit;
const pad=[-26.3625,-8.7875,8.7875,26.3625].map(x=>({
 x,width:5.5,depth:3.15,centreZ:7.875
}));
const e=planPlayableEntrance(BUILDING,pad),x=e.x,eps=.0001;
const instances=house.root.children.filter(m=>m instanceof InstancedMesh)
 .flatMap(m=>m.matrices.map(t=>({...t,color:m.material.color})));
assert.equal(audit.foyer.doorCount,1);
assert.equal(audit.foyer.secondDoorRemoved,true);
assert.equal(house.innerDoorPivot,null);
assert.equal(e.innerDoor,undefined);
assert.equal(e.innerDoorZ,undefined);
assert.doesNotMatch(game,/innerDoorPivot|setInnerDoorOpen|innerDoorOpen/);
assert.doesNotMatch(studio,/innerDoorOpen/);
assert.equal(audit.foyer.halfWidth,1.74);
assert.equal(audit.foyer.tiles,80);
assert.ok(!collidesAt(x+1.3,5.3,e.buildingObstacles,PLAYER_RADIUS,.70),
 "the old narrow partition no longer has collision");
assert.ok(collidesAt(x+1.3,6.30,e.buildingObstacles,PLAYER_RADIUS,.70),
 "brick beside the sole real street door still blocks passage");
assert.ok(Math.abs(e.stair.entryX-(x+.97))<eps);
assert.ok(e.stair.entryWidth>=1.55);
assert.ok(e.stair.entryX+e.stair.entryWidth/2<x+e.stairHalf,
 "new entrance steps sit along right masonry without going through it");
const actualEntryStairs=instances.filter(t=>
 Math.abs(t.scale.x-e.stair.entryWidth)<eps&&
 Math.abs(t.scale.z-(e.stair.entryStartZ-e.stair.bottomZ)/12+.014)<eps);
assert.equal(actualEntryStairs.length,24,"12 treads with two layered finishes");
assert.ok(actualEntryStairs.every(t=>Math.abs(t.position.x-e.stair.entryX)<eps));
const newWidth=audit.completeStaircase.railing.flightWidth;
assert.equal(newWidth,1.58);
assert.equal(audit.firstStaircase.stairwellWidth,3.68);
assert.equal(BUILDING.width,16);
assert.equal(BUILDING.length,74);
assert.equal(house.stats.entrances,4);
assert.equal(audit.completeStaircase.apartmentDoors.length,20);
assert.equal(audit.completeStaircase.flights,9);
assert.equal(audit.completeStaircase.treads,108);
const mainSteps=instances.filter(t=>
 Math.abs(t.scale.x-newWidth)<eps&&
 Math.abs(t.scale.z-(e.stair.turnZ-e.stair.bottomZ)/12+.012)<eps);
assert.equal(mainSteps.length,192,"eight 12-step U-flights, two finish layers");
const edgeLeft=audit.firstStaircase.firstX-newWidth/2;
const edgeRight=audit.firstStaircase.secondX+newWidth/2;
assert.ok(edgeLeft>x-e.stairHalf&&edgeRight<x+e.stairHalf);
const centreGap=(audit.firstStaircase.secondX-newWidth/2)-
 (audit.firstStaircase.firstX+newWidth/2);
assert.ok(centreGap<1.10,"previous central gap narrowed without increasing house width");
assert.equal(audit.completeStaircase.railing.wallSideRails,0);
assert.equal(audit.completeStaircase.railing.frontGuardLinks,4);
const frontRail=instances.filter(t=>Math.abs(t.scale.x-.36)<eps&&
 Math.abs(t.scale.y-.075)<eps&&Math.abs(t.scale.z-.075)<eps&&
 Math.abs(t.position.z-(e.stair.turnZ-.045))<eps);
assert.equal(frontRail.length,12,
 "three continuous crossbars connect both inward U-flight rails at all four windows");
for(let floor=0;floor<4;floor++){
 const target=e.floorHeight(floor)+e.stair.halfRise+.94;
 assert.ok(frontRail.some(t=>Math.abs(t.position.y-target)<eps),
  "every window-facing intermediate landing has its connected top handrail");
}
const boxes=instances.filter(t=>t.color===0x7b8584&&
 Math.abs(t.scale.x-.10)<eps&&Math.abs(t.scale.y-.210)<eps);
assert.equal(boxes.length,20,"all twenty real mailboxes remain one instanced batch");
assert.ok(boxes.every(t=>t.position.y>e.stair.firstFloor+e.stair.halfRise+.45),
 "mailboxes must no longer exist in the ground-floor foyer");
assert.ok(boxes.every(t=>t.position.y<e.floorHeight(1)+.05),
 "mailboxes are on the FIRST intermediate return, not on apartment floor 2");
assert.ok(boxes.every(t=>Math.abs(t.position.x-audit.foyer.mailboxWallX)<.20),
 "boxes remain mounted on the right masonry, outside the walking corridor");
const player=new PlayerController({building:BUILDING,pads:pad,entry:e,
 spawn:{x,z:10.85}});
assert.equal(player.innerDoorOpen,undefined);
assert.equal(player.innerDoorBlocker,undefined);
assert.equal(player.obstacles.includes(e.door),true);
assert.ok(player.setEntryDoorOpen(true));
assert.ok(!player.obstacles.includes(e.door));
player.reset();
assert.equal(player.entryDoorOpen,false);
assert.ok(player.obstacles.includes(e.door));
assert.equal(e.groundHeight(x,1.5,.7),null,
 "open vertical shaft is not replaced by an invisible floor");
console.log("MINI CITY 4.5.4.5 PASS: right wall entry flight, 3.48m foyer, one door, widened U flights, 20 relocated mailboxes, 4 closed window-side handrail connections");
