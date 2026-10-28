// MINI CITY: apartment #2 replan, room roles and player-radius accessibility.
import assert from "node:assert/strict";
import {BUILDING} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor} from "./first-floor.js";
import {planFirstFloorFurniture} from "./furniture.js";
import {collidesAt,PLAYER_RADIUS} from "./controller.js";

const bay=n=>-BUILDING.length/2+1.85+
  (n+.5)*(BUILDING.length-3.7)/BUILDING.windowBays;
const pads=[3,10,17,24].map(n=>({
  x:bay(n),width:5.5,depth:3.15,centreZ:7.875,top:0,doorBottom:0
}));
const entry=planPlayableEntrance(BUILDING,pads);
const plan=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(plan);
const layout=planFirstFloorFurniture(plan);
const flat=n=>plan.rooms.filter(r=>r.flat===n);
const room=(n,label)=>flat(n).find(r=>r.name===label);
const near=(actual,target)=>assert.ok(Math.abs(actual-target)<1e-5,
  `${actual} must equal ${target}`);
const kitchen=room(2,"Кухня"),bath=room(2,"Санузел");
const bedroom=room(2,"Жилая комната 2"),hall=room(2,"Прихожая");
const corridor=room(2,"Коридор");
assert.deepEqual(flat(2).map(r=>r.name),[
  "Прихожая","Санузел","Коридор","Кухня","Жилая комната 2"
]);
assert.equal(room(2,"Жилая комната 1"),undefined);
assert.deepEqual([1,2,3,4].map(n=>plan.roomCount(n)),[1,1,2,1]);
assert.equal(plan.rooms.length,21);
assert.equal(layout.placements.length,204);
assert.equal(layout.roomCount,21);
assert.equal(layout.flatCount,4);
assert.deepEqual(plan.windowConflicts,[]);

// The three original rear facade bay windows now belong to the kitchen.
near(kitchen.maxZ,-9.00);
near(kitchen.minZ,plan.back);
near(kitchen.minX,plan.wings.find(w=>w.side===1).minX);
near(kitchen.maxX,plan.wings.find(w=>w.side===1).maxX);
for(const n of [4,5,6]){
  assert.ok(bay(n)-.69>kitchen.minX&&bay(n)+.69<kitchen.maxX,
    "window bay "+n+" must be wholly inside the new kitchen");
}
assert.ok(kitchen.maxX-kitchen.minX>6.9);
assert.ok(layout.placements.some(p=>p.flat===2&&p.room==="Кухня"&&p.id==="stove"));
assert.ok(!layout.placements.some(p=>p.flat===2&&p.room==="Кухня"&&p.id==="sofa"));

// Old kitchen and WC have no separating wall, and share one large bath.
near(bath.minX,hall.maxX);
near(bath.maxX,kitchen.maxX);
near(bath.minZ,-6.90);
near(bath.maxZ,plan.divider);
assert.ok(bath.maxX-bath.minX>5.7);
assert.ok(bath.maxZ-bath.minZ>3.6);
assert.ok(!plan.segments.some(s=>s.name.startsWith("rear-kitchen-bath-1")));
const bathDoors=plan.openings.filter(o=>o.name.startsWith("rear-private-hall-1"));
assert.equal(bathDoors.length,1,"a single bathroom entrance from the hall");
near(bathDoors[0].z,-5.08);
assert.ok(bathDoors[0].width>=1.04);
assert.equal(plan.openings.filter(o=>o.name.startsWith("rear-cross-hall-kitchen-1")).length,0,
  "no redundant bathroom door from cross corridor");
assert.equal(plan.openings.filter(o=>o.name.startsWith("rear-bedroom-entry-1")).length,1,
  "existing corridor-to-kitchen door retained");

// Staircase, entry and old 3.2m-wide annexe are not moved.
near(hall.maxX-hall.minX,1.32);
near(corridor.maxZ-corridor.minZ,2.10);
near(bedroom.minX,plan.annex.minX);
near(bedroom.maxX,plan.annex.maxX);
near(bedroom.minZ,plan.annex.minZ);
near(bedroom.maxZ,plan.annex.maxZ);
assert.equal(plan.openings.filter(o=>o.name.startsWith("annex-access-2")).length,1);
assert.deepEqual(plan.doors.map(d=>[d.number,d.side,d.z]),[
  [4,-1,-2.42],[3,-1,-4],[1,1,-2.42],[2,1,-4]
]);
assert.ok(layout.placements.some(p=>p.flat===2&&p.room==="Жилая комната 2"&&p.id==="double_bed"));
for(const other of [1,3,4])assert.ok(flat(other).length>=5);
near(room(1,"Прихожая").maxX-room(1,"Прихожая").minX,2.10);
const flat1Tub=layout.placements.find(p=>p.flat===1&&p.id==="bathtub");
near(flat1Tub.x,bay(6));

// Furniture may fit inside each room yet still block a narrow corridor.
// Check REAL 36cm-radius player collision, with all placed solids included.
const obstacles=[...entry.buildingObstacles,
  ...plan.doorBlockers.filter(o=>o.name!=="flat-2-closed"),
  ...layout.solidBounds];
const flat2Door=plan.doors.find(d=>d.number===2);
const minX=entry.x-3.7,maxX=kitchen.maxX-.2;
const minZ=plan.back+.18,maxZ=-3.3;
const step=.14,nx=Math.floor((maxX-minX)/step)+1,
  nz=Math.floor((maxZ-minZ)/step)+1;
const x=i=>minX+i*step,z=j=>minZ+j*step;
const walkable=(i,j)=>i>=0&&j>=0&&i<nx&&j<nz&&
  !collidesAt(x(i),z(j),obstacles,PLAYER_RADIUS,plan.y);
const si=Math.round((flat2Door.x+.73-minX)/step);
const sj=Math.round((flat2Door.z-minZ)/step);
assert.ok(walkable(si,sj),"flat 2 entrance is not blocked by furniture");
const visited=new Set([si*nz+sj]),queue=[[si,sj]];
for(let index=0;index<queue.length;index++){
  const [i,j]=queue[index];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const ii=i+dx,jj=j+dz,key=ii*nz+jj;
    if(visited.has(key)||!walkable(ii,jj))continue;
    visited.add(key);
    queue.push([ii,jj]);
  }
}
assert.ok(queue.length>1200,"freely navigable flat 2 expected");
for(const r of flat(2)){
  const reached=queue.some(([i,j])=>
    x(i)>r.minX+.45&&x(i)<r.maxX-.45&&
    z(j)>r.minZ+.45&&z(j)<r.maxZ-.45);
  assert.ok(reached,"player cannot reach "+r.name+" in apartment 2");
}
assert.ok(!layout.placements.some(p=>p.flat===2&&p.room==="Прихожая"&&
  (p.id==="ottoman"||p.id==="slim_cabinet")),
  "extra hallway props would block navigation");
assert.ok(layout.placements.some(p=>p.flat===2&&p.room==="Прихожая"&&p.id==="shoe_rack"));
const bookcase=layout.placements.find(p=>p.flat===2&&p.room==="Коридор"&&p.id==="bookcase");
assert.ok(bookcase&&bookcase.x>corridor.minX+3.0,
  "bookcase must be outside the narrow corridor entrance");
for(const p of layout.solidBounds){
  const r=room(p.flat,p.room);
  assert.ok(r,"real room for "+p.id);
  assert.ok(p.minX>=r.minX-.001&&p.maxX<=r.maxX+.001);
  assert.ok(p.minZ>=r.minZ-.001&&p.maxZ<=r.maxZ+.001);
}
console.log("FLAT 2 REPLAN PASS: kitchen on former bedroom 1, one large bath, annexe living room, all 5 rooms reachable with 36cm character and actual furniture");
