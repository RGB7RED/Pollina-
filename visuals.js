// MINI CITY 0.3.1 — deterministic procedural surface textures.
// No external texture requests; subtle asphalt, plaster and slab seams help
// the neighbourhood feel like a restrained, overcast Petersburg district.
export function createDistrictMaterials(THREE) {
  let seed=84371;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const canvas=(size=256)=>{const c=document.createElement("canvas");c.width=c.height=size;return [c,c.getContext("2d")];};
  const finish=(c)=>{
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.anisotropy=2;return t;
  };
  function plaster(base,index){
    const [c,ctx]=canvas();
    ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
    for(let i=0;i<1600;i++){
      const x=rand()*256,y=rand()*256,w=1+rand()*7;
      const alpha=.025+rand()*.06;
      ctx.fillStyle=rand()>.51?"rgba(240,238,225,"+alpha+")":"rgba(25,32,38,"+alpha+")";
      ctx.fillRect(x,y,w,.7+rand()*2);
    }
    // Soviet panel joints and slight weathering at the borders.
    ctx.lineWidth=3;ctx.strokeStyle="rgba(55,57,58,.23)";
    for(const y of [10,84,162,244]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
    for(const x of [8,127,250]){
      ctx.strokeStyle="rgba(49,55,54,.12)";ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();
    }
    const gradient=ctx.createLinearGradient(0,0,0,256);
    gradient.addColorStop(0,"rgba(255,255,255,.055)");
    gradient.addColorStop(1,"rgba(39,36,36,.16)");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
    // Flecks around window bands.
    for(let j=0;j<14;j++){
      ctx.fillStyle="rgba(60,70,62,.085)";
      ctx.fillRect(rand()*256,rand()*256,1+rand()*20,1+rand()*4);
    }
    return new THREE.MeshStandardMaterial({map:finish(c),color:0xffffff,roughness:.94,metalness:0});
  }
  function ground(type){
    const [c,ctx]=canvas();
    const shades=type==="road"?["#424848","#4a5051","#3d4547"]:type==="paving"?["#9ea29d","#a6aaa4","#939d99"]:["#747c6a","#7e856f","#687462"];
    ctx.fillStyle=shades[0];ctx.fillRect(0,0,256,256);
    for(let i=0;i<2600;i++){
      ctx.fillStyle=shades[Math.floor(rand()*shades.length)];
      ctx.globalAlpha=.08+rand()*.25;
      ctx.fillRect(rand()*256,rand()*256,1+rand()*5,1+rand()*4);
    }
    ctx.globalAlpha=1;
    if(type==="paving"){
      ctx.lineWidth=1.1;ctx.strokeStyle="rgba(60,71,69,.24)";
      for(let x=0;x<=256;x+=42){
        ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();
      }
      for(let y=0;y<=256;y+=43){
        ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();
      }
    }
    if(type==="road"){
      for(let n=0;n<10;n++){
        const x=rand()*256,y=rand()*256;
        ctx.strokeStyle="rgba(15,21,23,.15)";ctx.lineWidth=.8;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+11,y+6);ctx.lineTo(x+18,y+2);ctx.stroke();
      }
    }
    return new THREE.MeshStandardMaterial({map:finish(c),roughness:1});
  }
  const facades=[
    "#a8a9a3","#a89f92","#8c9c97","#b7ada1","#a7a49a","#afa99f"
  ].map(plaster);
  return {
    facades,
    asphalt:ground("road"),
    pavement:ground("paving"),
    grass:ground("grass"),
    roof:new THREE.MeshStandardMaterial({color:0x646c6e,roughness:.97})
  };
}
