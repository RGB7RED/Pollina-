// MINI CITY 4.7.8 post-review: five-floor stairwell glass, green dado & visible riser.
import assert from "node:assert/strict";
import {BUILDING,ENTRY_GLAZING,ENTRANCE_BAYS,planFacade,buildApartmentHouse}
  from "../building-lab/building.js";

class Vec {
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;}
}
class Obj {
  constructor(){
    this.children=[];this.position=new Vec();this.rotation=new Vec();
    this.scale=new Vec();this.userData={};
    this.matrix={clone:()=>({position:{...this.position},
      rotation:{...this.rotation},scale:{...this.scale}})};
  }
  add(o){this.children.push(o);}
  updateMatrix(){}
}
class Mesh extends Obj {
  constructor(g,m){super();this.geometry=g;this.material=m;}
}
class InstancedMesh extends Mesh {
  constructor(g,m,n){
    super(g,m);this.count=n;this.matrices=[];this.instanceMatrix={};
  }
  setMatrixAt(i,m){this.matrices[i]=m;}
  computeBoundingSphere(){}
}
class Geo {
  setAttribute(k,v){this[k]=v;}
  computeVertexNormals(){}
}
class Mat {constructor(o){Object.assign(this,o);}}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,
  BoxGeometry:Geo,BufferGeometry:Geo,
  Float32BufferAttribute:class {constructor(a,n){this.array=a;this.itemSize=n;}},
  MeshStandardMaterial:Mat,DoubleSide:2};
const house=buildApartmentHouse(THREE),a=house.root.userData.geometryAudit;
const eps=1e-5,near=(x,y)=>Math.abs(x-y)<eps;
const renders=house.root.children.filter(o=>o instanceof InstancedMesh)
  .flatMap(o=>o.matrices.map(m=>({...m,color:o.material.color})));
const centres=ENTRANCE_BAYS.map(bay=>
  planFacade().find(w=>w.side===1&&w.bay===bay&&w.floor===0).x);
assert.equal(centres.length,4);
assert.equal(house.stats.windows,312);
assert.equal(house.stats.windowHoles,312);
assert.equal(a.holes.length,316);
const height=ENTRY_GLAZING.height,halfWidth=ENTRY_GLAZING.width/2;
const expectedLandings=Array.from({length:4},(_,floor)=>
  BUILDING.firstFloor+(floor+.5)*BUILDING.floorHeight);
assert.deepEqual(expectedLandings.map(v=>Number(v.toFixed(2))),
  [3.30,5.72,8.14,10.56]);

// All 32 real openings must exist, with fully transparent glass and visible
// wall strips around them. The 4-5F level is asserted separately on each bay.
const allPairs=[];
for(let entrance=0;entrance<centres.length;entrance++){
  const cx=centres[entrance];
  for(let floor=0;floor<4;floor++){
    const bottom=expectedLandings[floor],top=bottom+height;
    const pair=a.holes.filter(h=>h.axis==="long"&&h.side===1&&
      h.kind==="window"&&near(h.bottom,bottom)&&near(h.top,top)&&
      Math.abs(h.centre-cx)<1.3).sort((l,r)=>l.centre-r.centre);
    assert.equal(pair.length,2,
      `missing real paired windows: entrance ${entrance+1}, between floors ${floor+1}-${floor+2}`);
    assert.ok(near(pair[0].centre,cx-ENTRY_GLAZING.offset));
    assert.ok(near(pair[1].centre,cx+ENTRY_GLAZING.offset));
    for(const h of pair){
      assert.ok(h.width>h.height,"all sashes are horizontal");
      assert.equal(h.stairLanding,floor+1);
      assert.ok(a.windowGlazing.some(g=>g.opening===h&&g.transparent),
        "real clear glazing, not a facade sticker");
      const mid=(h.bottom+h.top)/2;
      assert.ok(!a.wallPieces.some(w=>w.axis==="long"&&w.side===1&&
        w.u0<h.centre&&w.u1>h.centre&&w.y0<mid&&w.y1>mid),
        "opaque front masonry may not cover the glass");
    }
    if(floor===3){
      const roofBottom=BUILDING.firstFloor+BUILDING.floors*BUILDING.floorHeight;
      assert.ok(pair.every(h=>h.top<roofBottom-.05),
        "top 4-5F glazing fits below residential roof");
    }
    allPairs.push(pair);
  }
}
assert.equal(allPairs.length,16);

// At the PLAYABLE entrance the front painted wall must have green on each
// level on its solid outer strips, but never inside the transparent windows.
const wx=centres[0],wz=a.stairwellInterior.wallZ;
const green=renders.filter(t=>t.color===0x76978d&&
  near(t.position.z,wz)&&near(t.scale.z,.025));
assert.equal(a.stairwellInterior.windowApertures.length,4);
assert.equal(a.stairwellInterior.greenBands.length,4);
for(let floor=0;floor<4;floor++){
  const y=expectedLandings[floor]+.25;
  const solidX=wx+ENTRY_GLAZING.offset+halfWidth+.12;
  assert.ok(green.some(t=>
    t.position.x-t.scale.x/2<solidX&&t.position.x+t.scale.x/2>solidX&&
    t.position.y-t.scale.y/2<y&&t.position.y+t.scale.y/2>y),
    `green stairwell dado must remain on solid wall at level ${floor+1}`);
  const paneX=wx+ENTRY_GLAZING.offset;
  assert.ok(!green.some(t=>
    t.position.x-t.scale.x/2<paneX&&t.position.x+t.scale.x/2>paneX&&
    t.position.y-t.scale.y/2<y&&t.position.y+t.scale.y/2>y),
    "green must NEVER cover glass");
}
// The fifth residential landing needs the original green dado too,
// even though only four intermediate front-facing window levels exist.
const rearZ=a.completeStaircase.landing.minZ+.088;
for(let residential=0;residential<BUILDING.floors;residential++){
  const floorY=BUILDING.firstFloor+residential*BUILDING.floorHeight;
  assert.ok(renders.some(t=>t.color===0x76978d&&
    near(t.position.x,wx)&&near(t.position.z,rearZ)&&
    near(t.position.y,floorY+.59)&&near(t.scale.y,1.18)),
    `green plaster on rear wall missing at residential floor ${residential+1}`);
}
// Visibly rendered full-height vertical pipe, on a SOLID pier to the right
// of windows. Four existing compact radiators remain on the side wall.
const riser=a.heating.visibleWindowRiser;
assert.ok(riser);
assert.ok(riser.x>wx+ENTRY_GLAZING.offset+halfWidth+.18);
assert.ok(riser.x<wx+1.72);
assert.ok(riser.top-riser.bottom>10);
assert.ok(renders.some(t=>t.color===0x7f8989&&
  near(t.position.x,riser.x)&&near(t.position.z,riser.z)&&
  near(t.scale.x,.064)&&near(t.scale.z,.064)&&
  near(t.scale.y,riser.top-riser.bottom)),
  "the window-side heating pipe must be visible, not merely audit metadata");
assert.equal(a.heating.radiators.length,4);
console.log("MINI CITY upper-window/green/riser PASS: 32 real glass openings, top 4-5F row for every entrance, all green bands and full-height pipe");
