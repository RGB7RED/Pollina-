// Dependency-free Node-side integration boot of the real source modules.
// This runs the actual scene construction and public interactions with a small
// THREE/DOM stand-in. It is not a substitute for Safari/WebGL testing.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const files=["district.js","interiors.js","characters.js","visuals.js","art_direction.js","game.js"];
const source=files.map(name=>readFileSync(new URL("../"+name,import.meta.url),"utf8")
 .replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,"")).join("\n");

class V{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){Object.assign(this,{x,y,z});return this}
 clone(){return new V(this.x,this.y,this.z)}
 copy(v){return this.set(v.x,v.y,v.z)}
 setScalar(v){return this.set(v,v,v)}
 sub(v){return this.set(this.x-v.x,this.y-v.y,this.z-v.z)}
 length(){return Math.hypot(this.x,this.y,this.z)}
 normalize(){const n=this.length()||1;return this.set(this.x/n,this.y/n,this.z/n)}
 addScaledVector(v,n){return this.set(this.x+v.x*n,this.y+v.y*n,this.z+v.z*n)}
 lerp(v,t){return this.set(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t,this.z+(v.z-this.z)*t)}
}
class V2{
 constructor(x=0,y=0){this.x=x;this.y=y}
 set(x,y){this.x=x;this.y=y;return this}
 length(){return Math.hypot(this.x,this.y)}
}
class O{
 constructor(){this.position=new V;this.rotation=new V;this.scale=new V(1,1,1);
  this.matrix={clone(){return {}}};this.children=[];this.visible=true}
 add(...nodes){this.children.push(...nodes);return this}
 clone(){const n=new this.constructor(this.geometry,this.material);
  n.position=this.position.clone();n.rotation=this.rotation.clone();return n}
 updateMatrix(){}updateMatrixWorld(){}
}
class Mesh extends O{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class Mat{constructor(opts){Object.assign(this,opts);this.color={setHex(){}}}}
class Light extends O{constructor(){super();this.color={setHex(){}};this.shadow={mapSize:{set(){}},camera:{}};this.target=new O}}
class Renderer{
 constructor(){this.shadowMap={};this.domElement={addEventListener(){},setPointerCapture(){}};
  this.info={render:{calls:50,triangles:60000}}}
 setSize(){}setPixelRatio(){}render(){}
}
class Camera extends O{updateProjectionMatrix(){}lookAt(){}}
class Instanced extends Mesh{constructor(g,m,n){super(g,m);this.count=n;this.instanceMatrix={}}setMatrixAt(){}computeBoundingSphere(){}}
class Geometry{}
const THREE={
 Scene:O,Group:O,Object3D:O,Mesh,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,
 InstancedMesh:Instanced,WebGLRenderer:Renderer,PerspectiveCamera:Camera,
 HemisphereLight:Light,DirectionalLight:Light,PointLight:Light,
 BoxGeometry:Geometry,CylinderGeometry:Geometry,SphereGeometry:Geometry,
 LatheGeometry:Geometry,IcosahedronGeometry:Geometry,PlaneGeometry:Geometry,
 TorusGeometry:Geometry,PlaneGeometry:Geometry,Matrix4:Geometry,
 CanvasTexture:class{},Clock:class{getDelta(){return .016}},Vector2:V2,Vector3:V,
 Color:class{setHex(){}},Fog:class{constructor(){this.color={setHex(){}}}},
 Raycaster:class{set(){}intersectObjects(){return []}},
 MathUtils:{clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),damp:(a,b,f,dt)=>a+(b-a)*Math.min(f*dt,1)},
 RepeatWrapping:1,SRGBColorSpace:2,BackSide:2
};
const canvasContext={
 clearRect(){},fillRect(){},strokeRect(){},fillText(){},arc(){},ellipse(){},
 beginPath(){},fill(){},stroke(){},moveTo(){},lineTo(){},
 createLinearGradient(){return {addColorStop(){}}},
 createRadialGradient(){return {addColorStop(){}}}
};
const nodes={};
function node(id){
 return nodes[id]||(nodes[id]={
  style:{},children:[],listeners:{},
  classList:{add(){},toggle(){},remove(){}},
  addEventListener(event,callback){this.listeners[event]=callback},
  appendChild(item){this.children.push(item)},
  getContext(){return canvasContext},
  getBoundingClientRect(){return {left:0,top:0,width:120,height:120}},
  setPointerCapture(){}
 });
}
const document={getElementById:node,createElement:()=>({getContext(){return canvasContext}})};
const window={devicePixelRatio:3,addEventListener(){}};
const storage={getItem(){return null},setItem(){}};
const run=new Function("THREE","document","window","innerWidth","innerHeight","devicePixelRatio",
 "localStorage","performance","requestAnimationFrame","setTimeout","clearTimeout","setInterval",
 source+"\nreturn {world,player,npcs,avatar,lobbies,benches,update,detectInteract,interact,enterLobby,exitLobby,nearby:()=>nearby,qualityIndex:()=>qualityIndex};");
const game=run(THREE,document,window,390,844,3,storage,
 {now(){return 1000}},()=>{},()=>1,()=>{},()=>1);
assert.equal(game.npcs.length,17);
assert.deepEqual(game.lobbies.map(room=>room.floors),[5,5,3]);
assert.ok(game.world.children.some(n=>n.renderOrder===-10),"painted panorama is installed");
node("start").listeners.click();
const room=game.lobbies[0];
game.enterLobby(room);
for(let i=0;i<8;i++)game.update(.016);
assert.ok(game.avatar.inLobby&&!game.world.visible&&room.root.visible);
game.avatar.x=room.centerX+4.45;game.avatar.z=-1.35;
game.detectInteract();
assert.equal(game.nearby()?.type,"mailboxes");
game.avatar.x=room.centerX;game.avatar.z=5.35;
game.detectInteract();
assert.equal(game.nearby()?.type,"lobby-exit");
game.exitLobby();
assert.ok(!game.avatar.inLobby&&game.world.visible);
const seat=game.benches.find(b=>b.x===16&&b.z===25);
assert.ok(seat);
game.avatar.x=seat.x+.4;game.avatar.z=seat.z;
game.detectInteract();
assert.equal(game.nearby()?.type,"sit");
game.interact();
for(let i=0;i<60;i++)game.update(.016);
assert.ok(game.avatar.sitting);
assert.ok(game.player.sitBlend>.9);
game.interact();
assert.ok(!game.avatar.sitting);
node("btn-quality").listeners.click();
assert.equal(game.qualityIndex(),2);
console.log("MINI CITY 0.3.1 runtime boot PASS: enter/exit, mailbox, seated pose, quality toggle");
