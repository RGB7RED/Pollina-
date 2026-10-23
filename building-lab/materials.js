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
export function makeRoofTexture(THREE){
  const {canvas,ctx}=makeCanvas(),rng=random(901);
  ctx.fillStyle="#383f43";
  ctx.fillRect(0,0,256,256);
  for(let row=0;row<8;row++){
    for(let col=-1;col<6;col++){
      const x=col*55+(row%2)*27.5,y=row*32;
      const c=Math.floor(57+rng()*20);
      ctx.fillStyle=`rgb(${c},${c+5},${c+8})`;
      ctx.fillRect(x+1,y+2,53,29);
      ctx.fillStyle="rgba(14,19,22,.35)";
      ctx.fillRect(x,y+30,55,2);
      ctx.fillStyle="rgba(178,175,163,.075)";
      ctx.fillRect(x+2,y+3,51,2);
    }
  }
  for(let i=0;i<900;i++){
    ctx.fillStyle=rng()>.5?"rgba(0,0,0,.08)":"rgba(213,214,201,.07)";
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
export function applyFacadeFinishes(THREE,root){
  if(root.userData?.facadeTextureReady)return root.userData.finishes;
  const brick=makeBrickTexture(THREE);
  const roofMap=makeRoofTexture(THREE);
  const coolGlass=makeGlassTexture(THREE);
  const warmGlass=makeGlassTexture(THREE,{lit:true});
  const counts={worldAlignedBrickGroups:0,roofGroups:0,glazingGroups:0,
    textures:4,glassLitGroups:0};
  for(const mesh of root.children){
    const mat=mesh.material;
    if(!mat?.color)continue;
    const original=mat.color.getHex();
    if(original===0x977f78||original===0x92766e){
      installWorldBrickMapping(mat,brick);
      if(original===0x92766e)mat.color.setHex(0xe4dcda);
      counts.worldAlignedBrickGroups++;
    }else if(original===0x384b57||original===0xc3a37b){
      const lit=original===0xc3a37b;
      mat.map=lit?warmGlass:coolGlass;
      mat.color.setHex(0xffffff);
      mat.roughness=lit?.32:.19;
      mat.metalness=lit?.05:.23;
      if(lit){
        mat.emissive.setHex(0xc5864d);
        mat.emissiveIntensity=.80;
        counts.glassLitGroups++;
      }
      mat.needsUpdate=true;
      counts.glazingGroups++;
    }else if(mesh.geometry?.getAttribute&&mesh.name?.includes("hipped pitched roof")){
      const pos=mesh.geometry.getAttribute("position");
      const uv=[];
      for(let i=0;i<pos.count;i++){
        // Top projection gives consistent tile size across four roof slopes.
        uv.push(pos.getX(i)*.6,pos.getZ(i)*.7);
      }
      mesh.geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
      mat.map=roofMap;
      mat.color.setHex(0xffffff);
      mat.roughness=.94;
      mat.needsUpdate=true;
      counts.roofGroups++;
    }
  }
  root.userData.facadeTextureReady=true;
  root.userData.provisionalMaterials=false;
  root.userData.stage="3.3";
  root.userData.finishes=counts;
  // The canopy, balcony and sill materials remain lightweight, physically
  // shaded solids. They are not falsely advertised as individually textured.
  return counts;
}
