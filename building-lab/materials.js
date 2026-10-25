// MINI CITY · 3.3 — small authored procedural textures for mobile WebGL.
// No external images, assets, animation, or geometry changes. Deterministic:
// refreshes and adjacent facade segments use the same world-aligned brickwork.

function makeCanvas(size=256){
  if(typeof document==="undefined"||!document.createElement)
    throw Error("Facade material generation requires an HTML Canvas");
  const canvas=document.createElement("canvas");
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("2D canvas texture context is unavailable");
  return {canvas,ctx};
}
function random(seed=39271){
  return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}
function texture(THREE,canvas,{repeat=false}={}){
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=repeat?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
  t.anisotropy=2;
  t.generateMipmaps=true;
  t.needsUpdate=true;
  return t;
}
export function makeBrickTexture(THREE){
  const {canvas,ctx}=makeCanvas();
  const rng=random();
  ctx.fillStyle="#aa9a88";
  ctx.fillRect(0,0,256,256);
  const bricks=["#ab715e","#b37d68","#a36956","#b5826f","#a97563",
    "#b58b77","#ad7568","#ba8e7a","#9d695a","#ae8471"];
  for(let row=0;row<8;row++){
    const offset=(row%2)*32;
    for(let col=-1;col<5;col++){
      const x=col*64+offset,y=row*32;
      ctx.fillStyle=bricks[Math.floor(rng()*bricks.length)];
      ctx.fillRect(x+2,y+2,60,28);
      // Sunward top edges and weathered lower seams.
      ctx.fillStyle="rgba(247,217,179,.15)";
      ctx.fillRect(x+3,y+3,58,2);
      ctx.fillStyle="rgba(63,53,53,.16)";
      ctx.fillRect(x+3,y+26,58,3);
      // Very small chips and flecks; a texture, not extra GPU geometry.
      for(let fleck=0;fleck<10;fleck++){
        const sx=x+4+Math.floor(rng()*54),sy=y+5+Math.floor(rng()*22);
        ctx.fillStyle=rng()>.57?"rgba(221,197,169,.22)":"rgba(54,50,48,.15)";
        ctx.fillRect(sx,sy,1+Math.floor(rng()*3),1+Math.floor(rng()*2));
      }
    }
  }
  // Sparse aged mortar, repeated in world coordinates across adjacent strips.
  for(let i=0;i<700;i++){
    ctx.fillStyle=rng()>.55?"rgba(20,22,24,.10)":"rgba(238,201,168,.12)";
    ctx.fillRect(rng()*256,rng()*256,1+rng()*3,1+rng()*2);
  }
  return texture(THREE,canvas,{repeat:true});
}
// Low-cost concrete aggregate texture for a precast 1-464-style panel.
// Actual large panel joints are real instanced strips in building.js.
// The atlas has NO staggered masonry rows and does not fake bricks.
export function makePanelTexture(THREE){
  const {canvas,ctx}=makeCanvas(),rng=random(464);
  ctx.fillStyle="#c5c4bd";
  ctx.fillRect(0,0,256,256);
  for(let i=0;i<2600;i++){
    const x=rng()*256,y=rng()*256,size=.45+rng()*1.4;
    ctx.fillStyle=rng()>.44?"rgba(255,255,255,.12)":"rgba(56,65,63,.10)";
    ctx.fillRect(x,y,size,size);
  }
  for(let i=0;i<12;i++){
    ctx.fillStyle="rgba(91,97,94,.028)";
    ctx.fillRect(rng()*256,rng()*256,1+rng()*6,15+rng()*28);
  }
  return texture(THREE,canvas,{repeat:true});
}
// Flat rolled-bitumen roof: fine granular noise, no pitched shingles.
export function makeRoofTexture(THREE){
  const {canvas,ctx}=makeCanvas(),rng=random(901);
  ctx.fillStyle="#3c4143";
  ctx.fillRect(0,0,256,256);
  for(let i=0;i<1700;i++){
    ctx.fillStyle=rng()>.52?"rgba(216,216,208,.06)":"rgba(4,6,8,.08)";
    ctx.fillRect(rng()*256,rng()*256,1+rng()*2,1+rng()*2);
  }
  return texture(THREE,canvas,{repeat:true});
}
export function makeGlassTexture(THREE,{lit=false}={}){
  const {canvas,ctx}=makeCanvas(128);
  const grad=ctx.createLinearGradient(0,0,128,128);
  if(lit){
    grad.addColorStop(0,"#9b764e");
    grad.addColorStop(.46,"#d0a778");
    grad.addColorStop(.76,"#b48a60");
    grad.addColorStop(1,"#8f6b54");
  }else{
    grad.addColorStop(0,"#385463");
    grad.addColorStop(.43,"#536b78");
    grad.addColorStop(.74,"#213c4b");
    grad.addColorStop(1,"#334856");
  }
  ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(48,0);
  ctx.lineTo(127,79);ctx.lineTo(127,109);ctx.closePath();
  ctx.fillStyle=lit?"rgba(255,232,195,.09)":"rgba(217,230,238,.19)";
  ctx.fill();
  ctx.fillStyle=lit?"rgba(65,45,40,.12)":"rgba(9,20,29,.20)";
  ctx.fillRect(107,0,17,128);
  return texture(THREE,canvas);
}
// StandardMaterial shader with real-world texture coordinates so every
// instanced wall strip has the same 30cm x 8cm brick dimensions. Standard
// BoxGeometry UVs would stretch a brick over a whole multi-metre wall strip.
export function installWorldBrickMapping(material,brickMap){
  material.map=null;
  material.color.setHex(0xffffff);
  material.roughness=.94;
  material.onBeforeCompile=(shader)=>{
    shader.uniforms.miniCityBrick={value:brickMap};
    shader.vertexShader=shader.vertexShader.replace(
      "void main() {",
      "varying vec3 vMiniCityWorld;\nvoid main() {");
    shader.vertexShader=shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec4 miniCityPos = vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        miniCityPos = instanceMatrix * miniCityPos;
      #endif
      vMiniCityWorld=(modelMatrix*miniCityPos).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace(
      "void main() {",
      "uniform sampler2D miniCityBrick;\nvarying vec3 vMiniCityWorld;\nvoid main() {");
    shader.fragmentShader=shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      // Choose the actual visible plane using screen derivatives.
      // X/Z walls and all narrow masonry returns use one shared atlas.
      vec3 a=abs(cross(dFdx(vMiniCityWorld),dFdy(vMiniCityWorld)));
      vec2 miniUV = a.x>a.z && a.x>a.y ? vMiniCityWorld.zy :
                    (a.y>a.z ? vMiniCityWorld.xz : vMiniCityWorld.xy);
      vec3 mortarBrick=texture2D(miniCityBrick,miniUV/vec2(1.20,.64)).rgb;
      float lowerDamp=mix(.82,1.0,smoothstep(.35,3.6,vMiniCityWorld.y));
      diffuseColor.rgb *= mortarBrick*lowerDamp;`);
  };
  material.customProgramCacheKey=()=>"mini-city-world-brick-v1";
  material.needsUpdate=true;
  material.userData.miniCityBrickScale=[1.20,.64];
}
// Reuse the validated world-position UV shader with a light aggregate
// atlas rather than the historic brick atlas. Panels/roof keep GPU
// draw-call count fixed; all clear window materials remain untouched.
export function installWorldPanelMapping(material,panelMap){
  installWorldBrickMapping(material,panelMap);
  material.customProgramCacheKey=()=>"mini-city-world-panel-v1";
  material.userData.miniCityPanelScale=[1.20,.64];
}
export function applyFacadeFinishes(THREE,root){
  if(root.userData?.facadeTextureReady&&root.userData.finishes)
    return root.userData.finishes;
  const panel=makePanelTexture(THREE),roofMap=makeRoofTexture(THREE);
  const counts={worldAlignedPanelGroups:0,worldAlignedBrickGroups:0,
    roofGroups:0,glazingGroups:0,textures:2,glassLitGroups:0};
  for(const mesh of root.children){
    const mat=mesh.material;
    if(!mat?.color)continue;
    const original=mat.color.getHex();
    if(original===0xc7c5bd||original===0xc0beb5){
      installWorldPanelMapping(mat,panel);
      counts.worldAlignedPanelGroups++;
    }else if(mesh.name?.includes("flat five-storey roof")){
      // BoxGeometry already carries ordinary UVs. Roof decking is a
      // simple planar slab with a granular rolled-bitumen appearance.
      mat.map=roofMap;
      mat.color.setHex(0xffffff);
      mat.roughness=.96;mat.needsUpdate=true;
      counts.roofGroups++;
    }
    // Glass remains physically transparent; don't restore any older
    // opaque black/amber window decal textures in Building Lab.
  }
  root.userData.facadeTextureReady=true;
  root.userData.provisionalMaterials=false;
  root.userData.stage="3.3";
  root.userData.finishes=counts;
  return counts;
}
