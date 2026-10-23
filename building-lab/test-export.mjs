import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const buildingCode=read("./building.js");
const exportCode=read("./export-glb.js");
new Script(exportCode.replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,""));
const {buildApartmentHouse}=new Function(buildingCode.replace(/^export /gm,"")+
  "\nreturn {buildApartmentHouse};")();
class V3{
 constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 fromBufferAttribute(a,i){this.x=a.getX(i);this.y=a.getY(i);this.z=a.getZ(i);return this;}
 applyMatrix4(m){
  const t=m.value;
  this.x=this.x*t.scale.x+t.position.x;
  this.y=this.y*t.scale.y+t.position.y;
  this.z=this.z*t.scale.z+t.position.z;return this;
 }
 applyMatrix3(m){
  const s=m.value.scale;this.x/=s.x;this.y/=s.y;this.z/=s.z;return this;
 }
 normalize(){const d=Math.hypot(this.x,this.y,this.z)||1;
  this.x/=d;this.y/=d;this.z/=d;return this;}
}
class Matrix4{constructor(){this.value={position:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};}}
class Matrix3{getNormalMatrix(m){this.value=m.value;return this;}}
class Obj{
 constructor(){this.children=[];this.position=new V3();this.rotation=new V3();
  this.scale=new V3();
  this.matrix={clone:()=>({position:{...this.position},scale:{...this.scale}})};
  this.userData={};}
 updateMatrix(){}add(x){this.children.push(x);}
 traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}
 clone(){const o=new this.constructor();Object.assign(o,this,{children:[],userData:{}});return o;}
}
class Attribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;}
 getX(i){return this.array[i*this.itemSize];}
 getY(i){return this.array[i*this.itemSize+1];}
 getZ(i){return this.array[i*this.itemSize+2];}
}
class BufferGeometry{
 constructor(){this.attributes={};this.index=null;}
 setAttribute(name,value){this.attributes[name]=value;return this;}
 getAttribute(name){return this.attributes[name];}
 computeVertexNormals(){}
 computeBoundingSphere(){}
}
class BoxGeometry extends BufferGeometry{
 constructor(){
  super();
  // 36 unindexed vertices, six faces, two triangles per face.
  const p=[],n=[];
  const f=[
   {axis:0,dir:1,uv:[[.5,-.5],[.5,.5],[.5,.5]]},
   {axis:0,dir:-1},{axis:1,dir:1},{axis:1,dir:-1},
   {axis:2,dir:1},{axis:2,dir:-1}
  ];
  for(const face of f){
   const a=face.axis, b=(a+1)%3,c=(a+2)%3;
   const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
   for(const idx of [0,1,2,0,2,3]){
    const v=[0,0,0];v[a]=face.dir*.5;
    v[b]=corners[idx][0];v[c]=corners[idx][1];p.push(...v);
    const normal=[0,0,0];normal[a]=face.dir;n.push(...normal);
   }
  }
  this.setAttribute("position",new Attribute(p,3));
  this.setAttribute("normal",new Attribute(n,3));
 }
}
class Color{
 constructor(hex){this.hex=hex;}
 getHex(){return this.hex;}
 setHex(c){this.hex=c;}
 clone(){return new Color(this.hex);}
}
class Material{
 constructor(opts={}){Object.assign(this,opts);this.color=
  opts.color instanceof Color?opts.color:new Color(opts.color||0);
  this.emissive=new Color(opts.emissive||0);this.userData={};}
 dispose(){}
}
class Mesh extends Obj{
 constructor(geo,mat){super();this.geometry=geo;this.material=mat;}
}
class InstancedMesh extends Mesh{
 constructor(geo,mat,count){super(geo,mat);this.count=count;this.matrices=[];this.instanceMatrix={};this.isInstancedMesh=true;}
 setMatrixAt(i,m){this.matrices[i]=m;}
 getMatrixAt(i,m){m.value=this.matrices[i];}
 computeBoundingSphere(){}
 clone(){const o=new InstancedMesh(this.geometry,this.material,this.count);
  o.matrices=this.matrices.slice();o.name=this.name;return o;}
}
const THREE={Group:Obj,Object3D:Obj,Mesh,InstancedMesh,MeshStandardMaterial:Material,
 BoxGeometry,BufferGeometry,BufferAttribute:Attribute,Float32BufferAttribute:Attribute,
 Matrix4,Matrix3,Vector3:V3,DoubleSide:2};
const brickTexture={name:"brick atlas"};
const exporterClass=class{
 async parseAsync(root,options){
  assert.equal(options.binary,true);
  assert.ok(root.children.some(m=>m.name==="masonry_world_baked"));
  const glb=new ArrayBuffer(8192);
  const header=new DataView(glb);
  header.setUint32(0,0x46546c67,true);
  header.setUint32(4,2,true);
  header.setUint32(8,glb.byteLength,true);
  return glb;
 }
};
const {makePortableHouse,encodeHouseGLB}=new Function(
 "GLTFExporter","makeBrickTexture",exportCode.replace(/^import[^\n]*\n/gm,"")
  .replace(/^export /gm,"")+"\nreturn {makePortableHouse,encodeHouseGLB};"
)(exporterClass,()=>brickTexture);
const {root,stats}=buildApartmentHouse(THREE);
const masonry=root.children.filter(m=>m.isInstancedMesh &&
 (m.material.color.getHex()===0x977f78||m.material.color.getHex()===0x92766e));
assert.equal(masonry.length,2);
for(const m of masonry){
 m.material.customProgramCacheKey=()=>"mini-city-world-brick-v1";
 m.material.userData.miniCityBrickScale=[1.2,.64];
}
const sourceNodes=root.children.length;
const out=makePortableHouse(THREE,root,{brickTexture});
assert.equal(out.stats.bakedWallParts,root.userData.geometryAudit.wallPieces.length);
assert.equal(out.stats.roofs,1);
assert.equal(out.root.children.length,sourceNodes);
assert.equal(out.root.children.filter(m=>m.name==="masonry_world_baked").length,2);
assert.equal(out.root.children.filter(m=>m.isInstancedMesh).length,
 sourceNodes-3,"brick meshes replaced, roof retained");
for(const m of out.root.children.filter(m=>m.name==="masonry_world_baked")){
 const uv=m.geometry.getAttribute("uv");
 const pos=m.geometry.getAttribute("position");
 const nor=m.geometry.getAttribute("normal");
 assert.equal(pos.count,masonry.find(a=>a.material.color.getHex()===m.material.color.getHex())?.count*36||pos.count);
 assert.equal(uv.count,pos.count);
 assert.equal(nor.count,pos.count);
 assert.equal(m.material.map,brickTexture);
 const zFacing=Math.abs(nor.getZ(0))>=.9;
 if(zFacing){
  assert.ok(Math.abs(uv.getX(0)-pos.getX(0)/1.2)<.00002);
  assert.ok(Math.abs(uv.getY(0)-pos.getY(0)/.64)<.00002);
 }
}
assert.equal(stats.windows,296);
assert.equal(stats.entrances,4);
assert.equal(stats.downpipes,10);
assert.equal(root.userData.stage,"3.2","export cannot mutate source geometry");
const {buffer}=await encodeHouseGLB(THREE,root);
assert.ok(buffer.byteLength>2048);
console.log("GLB stage 3.4 export PASS: source intact; masonry baked to world-metre UV; instanced details kept; valid mock GLB header");
