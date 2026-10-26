// Stage 5.0: real occupied first floor and isolated, shared catalog models.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUILDING} from "../building-lab/building.js";
import {planPlayableEntrance} from "./entrance.js";
import {planFirstFloor} from "./first-floor.js";
import {planFirstFloorFurniture,buildFurnishedFirstFloor} from "./furniture.js";
import {INTERIOR_ASSETS,INTERIOR_ASSET_BY_ID,INTERIOR_PALETTE,
  interiorPieces,buildIsolatedInteriorModel} from "../models/interior-assets.js";
import {validateCatalog} from "../models/catalog-utils.js";

const x=-BUILDING.length/2+1.85+(3+.5)*(BUILDING.length-3.7)/BUILDING.windowBays;
const pads=[3,10,17,24].map(bay=>({
 x:-BUILDING.length/2+1.85+(bay+.5)*(BUILDING.length-3.7)/BUILDING.windowBays,
 width:5.5,depth:3.15,centreZ:7.875,top:0,doorBottom:0
}));
const entry=planPlayableEntrance(BUILDING,pads);
const plan=planFirstFloor(BUILDING,entry);
entry.installFirstFloor(plan);
const layout=planFirstFloorFurniture(plan);

assert.equal(x,entry.x);
assert.equal(layout.flatCount,4);
assert.equal(layout.roomCount,24,"all 24 existing rooms unchanged");
assert.deepEqual([1,2,3,4].map(n=>plan.roomCount(n)),[3,2,2,1]);
assert.equal(INTERIOR_ASSETS.length,52);
assert.ok(layout.placements.length>=200,"furnished rather than sample props");
assert.equal(layout.placements.length,
  Object.values(layout.countById).reduce((sum,n)=>sum+n,0));
assert.ok(INTERIOR_ASSETS.every(a=>layout.countById[a.id]>=1),
  "all 52 catalog models actually appear at least once in prototype");
assert.ok([1,2,3,4].every(n=>layout.countByFlat[n]>35));
for(const room of plan.rooms){
  assert.ok(layout.placements.some(p=>p.flat===room.flat&&p.room===room.name),
    "every actual room has furnishing: "+room.flat+" / "+room.name);
}
const annexe=plan.rooms.find(r=>r.flat===2&&r.name==="Жилая комната 2");
assert.ok(annexe&&layout.placements.some(p=>p.flat===2&&
  p.room==="Жилая комната 2"&&p.id==="double_bed"),
  "new apartment 2 rear room furnished without moving its walls");
assert.deepEqual(plan.windowConflicts,[]);
assert.equal(layout.placements.filter(p=>p.id==="interior_door").length,
  plan.openings.length,"no pre-existing interior door gap omitted");

for(const p of layout.placements){
  assert.ok(INTERIOR_ASSET_BY_ID[p.id],"unknown asset "+p.id);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));
  assert.equal(p.y,plan.y);
  if(p.flat>0)assert.ok(p.flat<=4);
}
for(let i=0;i<layout.solidBounds.length;i++){
  const a=layout.solidBounds[i],room=plan.rooms.find(r=>
    r.flat===a.flat&&r.name===a.room);
  assert.ok(room,"solid furniture must belong to a REAL room");
  assert.ok(a.minX>=room.minX+.045&&a.maxX<=room.maxX-.045);
  assert.ok(a.minZ>=room.minZ+.045&&a.maxZ<=room.maxZ-.045);
  assert.equal(a.minY,plan.y,"objects on 1F, no collision on 5F");
  assert.ok(a.maxY<=plan.y+2.1);
  for(let j=0;j<i;j++){
    const b=layout.solidBounds[j];
    if(a.flat!==b.flat||a.room!==b.room)continue;
    assert.ok(a.minX>=b.maxX-.002||a.maxX<=b.minX+.002||
      a.minZ>=b.maxZ-.002||a.maxZ<=b.minZ+.002,
      "solid models overlap: "+a.id+" and "+b.id+" in "+a.room);
  }
  for(const o of plan.openings.filter(o=>o.x>=room.minX-.1&&
    o.x<=room.maxX+.1&&o.z>=room.minZ-.1&&o.z<=room.maxZ+.1)){
    const dx=Math.max(a.minX-o.x,o.x-a.maxX,0);
    const dz=Math.max(a.minZ-o.z,o.z-a.maxZ,0);
    assert.ok(Math.hypot(dx,dz)>=.30,
      "furniture blocks doorway: "+a.id+" / "+o.name);
  }
}
for(const door of plan.doors){
  assert.ok(!layout.solidBounds.some(b=>b.flat===door.number&&
    door.x+door.side*.70>b.minX-.22&&door.x+door.side*.70<b.maxX+.22&&
    door.z>b.minZ-.22&&door.z<b.maxZ+.22),
    "apartment entrance must remain clear: "+door.number);
}

class Vec{constructor(){this.x=0;this.y=0;this.z=0;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
  constructor(){this.children=[];this.userData={};this.position=new Vec();
    this.rotation=new Vec();this.scale=new Vec();
    this.matrix={clone:()=>({position:{...this.position},
      rotation:{...this.rotation},scale:{...this.scale}})};}
  add(o){this.children.push(o);}updateMatrix(){}
}
class Geo{constructor(...a){this.args=a;}}
class Mat{constructor(args){Object.assign(this,args);}}
class InstancedMesh extends Obj{
  constructor(g,m,n){super();this.geometry=g;this.material=m;this.count=n;
    this.instanceMatrix={};this.matrices=[];}
  setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
const THREE={Group:Obj,Object3D:Obj,BoxGeometry:Geo,
  MeshStandardMaterial:Mat,InstancedMesh};
const rendered=buildFurnishedFirstFloor(THREE,plan);
assert.equal(rendered.layout.placements.length,layout.placements.length);
assert.ok(rendered.root.children.length>=4);
assert.ok(rendered.root.children.length<=Object.keys(INTERIOR_PALETTE).length,
  "instanced material batches avoid hundreds of draw calls");
assert.ok(rendered.root.children.every(m=>m.count>0&&
  m.count===m.matrices.length));
for(const asset of INTERIOR_ASSETS){
  const pieces=interiorPieces(asset.id);
  assert.ok(pieces.length>=2,"model is built, not a placeholder: "+asset.id);
  assert.ok(pieces.every(p=>p.w>0&&p.h>0&&p.d>0));
  const solo=buildIsolatedInteriorModel(THREE,asset.id);
  assert.equal(solo.stats.objects,1);
  assert.equal(solo.stats.counts[asset.id],1);
}
const catalog=JSON.parse(readFileSync(new URL("../models/catalog.json",import.meta.url)));
validateCatalog(catalog);
for(const asset of INTERIOR_ASSETS){
  const item=catalog.entries.find(x=>x.id===asset.id);
  assert.ok(item,"not listed "+asset.id);
  assert.equal(item.quantity,layout.countById[asset.id]);
  assert.equal(item.modelNumber,asset.modelNumber);
  assert.equal(item.inPlayLab,true);
  assert.equal(item.releaseReady,false);
  assert.equal(item.viewer,"interior-asset-lab/index.html?model="+asset.id);
}
assert.equal(catalog.entries.length,80);
const game=readFileSync(new URL("./game.js",import.meta.url),"utf8");
assert.match(game,/buildFurnishedFirstFloor\(THREE,firstFloor\)/);
assert.match(game,/entry\.buildingObstacles\.push\(\.\.\.furnished\.layout\.solidBounds\)/);
console.log("MINI CITY 5.0 PASS: 52 real shared 3D models, 24 occupied rooms, door clearances, instanced draws, catalog quantities and 4 flats");
