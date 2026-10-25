import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

// Standalone engine-less regressions: exercised with the same small Three/Canvas
// mock used for building geometry. Not a replacement for a real Safari render.
const buildingSrc=readFileSync(new URL("./building.js",import.meta.url),"utf8");
const materialSrc=readFileSync(new URL("./materials.js",import.meta.url),"utf8");
new Script(materialSrc.replace(/^export /gm,""),{filename:"materials.js"});
const {buildApartmentHouse}=new Function(buildingSrc.replace(/^export /gm,"")+
 "\nreturn {buildApartmentHouse};")();
const {applyFacadeFinishes}=new Function(materialSrc.replace(/^export /gm,"")+
 "\nreturn {applyFacadeFinishes};")();
const drawn=[];
class FakeContext{
  constructor(){this.fillStyle="";}
  fillRect(...rect){drawn.push(rect);}
  createLinearGradient(){return {addColorStop(){}};}
  beginPath(){}moveTo(){}lineTo(){}closePath(){}fill(){}
}
const previousDocument=globalThis.document;
globalThis.document={createElement(tag){
 assert.equal(tag,"canvas");
 return {width:0,height:0,getContext(kind){assert.equal(kind,"2d");return new FakeContext();}};
}};
class Vec{constructor(){this.x=0;this.y=0;this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Obj{
 constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec();
  this.matrix={clone:()=>({position:{...this.position},scale:{...this.scale},rotation:{...this.rotation}})};}
 add(o){this.children.push(o);}updateMatrix(){}
}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{
 constructor(g,m,n){super(g,m);this.count=n;this.instanceMatrix={};this.matrices=[];}
 setMatrixAt(i,m){this.matrices[i]=m;}computeBoundingSphere(){}
}
class BufferGeometry{
 setAttribute(k,v){this[k]=v;}
 getAttribute(k){return this[k];}
 computeVertexNormals(){}
}
class Float32BufferAttribute{
 constructor(array,size){this.array=array;this.itemSize=size;this.count=array.length/size;}
 getX(i){return this.array[i*this.itemSize];}
 getZ(i){return this.array[i*this.itemSize+2];}
}
class Color{
 constructor(hex){this.hex=hex;}
 getHex(){return this.hex;}
 setHex(hex){this.hex=hex;}
}
class Material{
 constructor(o){Object.assign(this,o);this.color=new Color(o.color);
  this.emissive=new Color(o.emissive||0);this.userData={};}
}
class CanvasTexture{
 constructor(canvas){this.image=canvas;this.needsUpdate=false;}
}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,BufferGeometry,
 Float32BufferAttribute,MeshStandardMaterial:Material,BoxGeometry:class{},
 CanvasTexture,SRGBColorSpace:"srgb",RepeatWrapping:1000,ClampToEdgeWrapping:1001,
 DoubleSide:2};
try{
 const {root,stats}=buildApartmentHouse(THREE);
 const geometryCount=stats.instancedElements;
 const before=root.children.length;
 const detail=applyFacadeFinishes(THREE,root);
 assert.equal(root.userData.stage,"3.3");
 assert.equal(root.userData.facadeTextureReady,true);
 assert.equal(root.userData.provisionalMaterials,false);
 assert.equal(detail.textures,2);
 assert.equal(detail.worldAlignedPanelGroups,2);
 assert.equal(detail.roofGroups,1);
 assert.equal(detail.glazingGroups,0);
 assert.equal(detail.glassLitGroups,0);
 assert.equal(stats.instancedElements,geometryCount,"materials cannot change geometry");
 assert.equal(root.children.length,before,"materials may not insert per-panel meshes");
 assert.equal(applyFacadeFinishes(THREE,root),detail,"materials must not be re-created");
 const textured=root.children.filter(m=>m.material?.onBeforeCompile);
 assert.equal(textured.length,2,"facades share only two instanced concrete materials");
 for(const m of textured){
  assert.deepEqual(m.material.userData.miniCityPanelScale,[1.20,.64]);
  const shader={uniforms:{},vertexShader:"void main() {\n#include <begin_vertex>\n}",
   fragmentShader:"void main() {\n#include <map_fragment>\n}"};
  m.material.onBeforeCompile(shader);
  assert.ok(shader.uniforms.miniCityBrick.value instanceof CanvasTexture);
  assert.match(shader.vertexShader,/instanceMatrix \* miniCityPos/);
  assert.match(shader.vertexShader,/vMiniCityWorld/);
  assert.match(shader.fragmentShader,/dFdx\(vMiniCityWorld\)/);
  assert.match(shader.fragmentShader,/vec2\(1\.20,\.64\)/);
  assert.equal(shader.uniforms.miniCityBrick.value.wrapS,THREE.RepeatWrapping);
  assert.equal(shader.uniforms.miniCityBrick.value.image.width,256);
 }
 const roof=root.children.find(m=>m.name?.includes("flat five-storey roof"));
 assert.ok(roof&&roof.geometry,"real flat roof deck still present");
 assert.equal(roof.material.map.image.width,256);
 assert.equal(roof.material.map.wrapS,THREE.RepeatWrapping);
 for(const m of root.children.filter(m=>m.material?.map&&!m.name?.includes("roof")))
  assert.equal(m.material.map.colorSpace,"srgb");
 const a=root.userData.geometryAudit;
 assert.equal(a.entryPads.length,4);
 for(const p of a.entryPads){
  assert.ok(Math.abs(p.doorBottom-p.top-.20)<1e-8);
  assert.equal(p.width,5.5);assert.equal(p.depth,3.15);
 }
 assert.equal(stats.windows,296);assert.equal(stats.balconies,38);
 assert.equal(stats.downpipes,10);assert.equal(stats.entrances,4);
 assert.ok(drawn.length>1000,"authored concrete panel / roof canvases contain actual texture detail");
 console.log("Building 3.3 materials PASS: two canvases, world-aligned concrete panels, flat roof, clear glass");
}finally{
 if(previousDocument===undefined)delete globalThis.document;
 else globalThis.document=previousDocument;
}
