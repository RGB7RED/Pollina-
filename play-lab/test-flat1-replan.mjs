// Flat 1 reference replan: modify room partitions, not the house shell.
import assert from "node:assert/strict";
import {BUILDING} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor} from "./first-floor.js";
import {planFirstFloorFurniture} from "./furniture.js";

const bayX=bay=>-BUILDING.length/2+1.85+
  (bay+.5)*(BUILDING.length-3.7)/BUILDING.windowBays;
const pads=[3,10,17,24].map(bay=>({
  x:bayX(bay),width:5.5,depth:3.15,centreZ:7.875,top:0,doorBottom:0
}));
const entry=planPlayableEntrance(BUILDING,pads);
const plan=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(plan);
const flat=n=>plan.rooms.filter(r=>r.flat===n);
const find=(n,name)=>flat(n).find(r=>r.name===name);
const approx=(a,b)=>assert.ok(Math.abs(a-b)<.0001,`${a} != ${b}`);
const room1=find(1,"Жилая комната 1");
const kitchen=find(1,"Кухня");
const bath=find(1,"Санузел");
const hallway=find(1,"Прихожая");
const corridor=find(1,"Коридор");
assert.deepEqual(flat(1).map(r=>r.name),
  ["Прихожая","Кухня","Коридор","Жилая комната 1","Санузел"]);
assert.deepEqual([1,2,3,4].map(n=>plan.roomCount(n)),[1,2,2,1]);
assert.equal(plan.rooms.length,22);
assert.ok(!plan.segments.some(s=>s.name.startsWith("front-kitchen-bath-1")),
  "removed old kitchen/bath dividing wall");
assert.ok(!plan.segments.some(s=>s.name.startsWith("three-room-separation-A")),
  "removed former rooms 1 and 2 dividing wall");
assert.ok(plan.segments.some(s=>s.name==="flat1-bath-partition-tail"),
  "bath must remain separated from the new large room");
approx(kitchen.minZ,plan.divider);
approx(kitchen.maxZ,hallway.maxZ);
approx(corridor.minZ,kitchen.maxZ);
approx(corridor.maxZ,room1.minZ);
approx(room1.minX,plan.wings.find(w=>w.side===1).minX);
approx(room1.maxX,bath.minX);
approx(bath.maxX,plan.wings.find(w=>w.side===1).maxX);
for(const bay of [4,5]){
  const px=bayX(bay);
  assert.ok(px>room1.minX+.70&&px<room1.maxX-.70,
    "two old living room windows must remain entirely inside combined room");
}
assert.ok(bayX(6)>bath.minX+.70&&bayX(6)<bath.maxX-.70,
  "third original window belongs to new bathroom");
assert.deepEqual(plan.windowConflicts,[]);
const originalDoors=plan.doors.map(d=>[d.number,d.side,d.z,d.x,d.width,d.variant]);
assert.deepEqual(originalDoors.map(d=>d.slice(0,3)),
  [[4,-1,-2.42],[3,-1,-4],[1,1,-2.42],[2,1,-4]]);
assert.equal(plan.doors.find(d=>d.number===1).type,"1к");
assert.equal(plan.openings.filter(o=>o.name.startsWith("front-private-hall-1")).length,1);
assert.equal(plan.openings.filter(o=>o.name.startsWith("flat1-room-bath-access")).length,2);
for(const [n,count] of [[2,6],[3,6],[4,5]]){
  assert.equal(flat(n).length,count,"other apartment room types unchanged");
}
const layout=planFirstFloorFurniture(plan);
assert.equal(layout.roomCount,22);
assert.ok(layout.placements.some(p=>p.flat===1&&p.room==="Санузел"&&p.id==="toilet"));
assert.ok(layout.placements.some(p=>p.flat===1&&p.room==="Кухня"&&p.id==="stove"));
assert.ok(layout.placements.every(p=>p.flat!==1||!["Жилая комната 2","Жилая комната 3"].includes(p.room)));
for(const bound of layout.solidBounds.filter(o=>o.flat===1)){
  const room=find(1,bound.room);
  assert.ok(room&&bound.minX>=room.minX-.001&&bound.maxX<=room.maxX+.001);
  assert.ok(bound.minZ>=room.minZ-.001&&bound.maxZ<=room.maxZ+.001);
}
console.log("FLAT 1 REPLAN PASS: one enlarged kitchen, 1 living room, 1 windowed bathroom; doors, outer windows, staircase and three other flats unchanged");
