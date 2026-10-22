import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
const game=readFileSync(new URL("../game.js",import.meta.url),"utf8");

function extract(startMarker,endMarker) {
  const a=game.indexOf(startMarker),b=game.indexOf(endMarker,a+startMarker.length);
  assert.ok(a>=0&&b>a, "missing source section: "+startMarker);
  return game.slice(a,b);
}

class FakeObject3D {
  constructor(){
    this.position={set(){}};
    this.rotation={set(){}};
    this.scale={set(){}};
    this.matrix={clone:()=>({})};
  }
  updateMatrix(){}
}
class FakeInstancedMesh {
  constructor(geometry,material,count){
    this.geometry=geometry;this.material=material;this.count=count;
    this.instanceMatrix={needsUpdate:false};
  }
  setMatrixAt(){}
  computeBoundingSphere(){this.boundsComputed=true;}
}

const fakeThree={Object3D:FakeObject3D,InstancedMesh:FakeInstancedMesh};
const world={meshes:[],add(mesh){this.meshes.push(mesh)}};
const batchCode=extract("const flatBatches=new Map();","function label(");
const {flat,flushFlats}=new Function("THREE","geomBox","world",batchCode+"\nreturn {flat,flushFlats};")(fakeThree,{},world);
const roads={}, markings={};
for(let i=0;i<240;i++)flat(1,.2,roads,i,0);
for(let i=0;i<30;i++)flat(.3,1,markings,i,0);
flushFlats();
assert.equal(world.meshes.length,2,"270 floors should be submitted as two batches");
assert.deepEqual(world.meshes.map(m=>m.count),[240,30]);
assert.ok(world.meshes.every(m=>m.boundsComputed));
assert.ok(world.meshes.every(m=>m.instanceMatrix.needsUpdate));

const lightCode=extract("function refreshStreetLights(){","function setTime(");
const lights=Array.from({length:16},(_,i)=>({
  position:{x:i*3,z:0},visible:false,intensity:0
}));
const refresh=new Function("nightLights","timeModes","avatar","timeIndex","qualityModes","qualityIndex",lightCode+"\nrefreshStreetLights();");
const modes=[{pointLights:2},{pointLights:3},{pointLights:4}];
refresh(lights,[{night:1.8}],{x:0,z:0},0,modes,2);
assert.equal(lights.filter(l=>l.visible).length,4,"at most four dynamic lights in high quality");
refresh(lights,[{night:1.8}],{x:0,z:0},0,modes,0);
assert.equal(lights.filter(l=>l.visible).length,2,"low quality limits dynamic lights to two");
refresh(lights,[{night:0}],{x:0,z:0},0,modes,2);
assert.equal(lights.filter(l=>l.visible||l.intensity>0).length,0,"daytime lights disabled");

console.log("Mini City performance contract: OK — 270 floors -> 2 groups, 4 night lights maximum");
