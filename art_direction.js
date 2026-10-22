// MINI CITY 0.3.2 — illustrated art-direction layer for a melancholic city.
// Uses deterministic, authored-feeling painterly textures. No network assets.
export function createArtDirection(THREE,world){
  let seed=2073;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function canvas(w,h){
    const c=document.createElement("canvas");c.width=w;c.height=h;
    return [c,c.getContext("2d")];
  }
  const texture=(c)=>{
    const t=new THREE.CanvasTexture(c);
    t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;return t;
  };
  const [skyCanvas,paint]=canvas(1024,512);
  // Painted rather than uniform backdrop: overcast top, pale horizon, distant
  // bank of layered clouds. Drawn once at startup, rendered in one draw call.
  const skyGradient=paint.createLinearGradient(0,0,0,512);
  skyGradient.addColorStop(0,"#8498a7");
  skyGradient.addColorStop(.36,"#abb6bd");
  skyGradient.addColorStop(.68,"#d1d0c5");
  skyGradient.addColorStop(1,"#d3c5b1");
  paint.fillStyle=skyGradient;paint.fillRect(0,0,1024,512);
  for(let layer=0;layer<3;layer++){
    for(let i=0;i<90;i++){
      const x=rnd()*1050-20;
      const y=85+layer*70+rnd()*130;
      const w=20+rnd()*125,h=3+rnd()*13;
      const alpha=(.017+rnd()*.045)*(layer===1?1:.75);
      paint.fillStyle=layer===0?"rgba(38,59,72,"+alpha+")":"rgba(242,239,222,"+alpha+")";
      paint.beginPath();paint.ellipse(x,y,w,h,(rnd()-.5)*.2,0,Math.PI*2);paint.fill();
    }
  }
  for(let i=0;i<45;i++){
    const x=rnd()*1024,y=302+rnd()*60,w=30+rnd()*160;
    paint.fillStyle="rgba(245,232,203,"+(.012+rnd()*.03)+")";
    paint.fillRect(x,y,w,1+rnd()*5);
  }
  const sky=new THREE.Mesh(
    new THREE.SphereGeometry(1,36,20),
    new THREE.MeshBasicMaterial({map:texture(skyCanvas),side:THREE.BackSide,depthWrite:false,fog:false})
  );
  sky.scale.setScalar(200);
  sky.frustumCulled=false;
  sky.renderOrder=-10;
  world.add(sky);

  // Brush-painted reflections and curtains eliminate the dead-black window dots.
  function windows(lit=false){
    const [c,p]=canvas(128,160);
    p.fillStyle=lit?"#b69c71":"#334f5b";p.fillRect(0,0,128,160);
    const glow=p.createLinearGradient(0,0,128,160);
    glow.addColorStop(0,lit?"#eee0a8":"#83a0a8");
    glow.addColorStop(1,lit?"#b38d63":"#29445a");
    p.fillStyle=glow;p.fillRect(13,14,102,128);
    p.fillStyle=lit?"rgba(141,98,70,.56)":"rgba(31,44,58,.45)";
    p.fillRect(13,14,31,128);p.fillRect(90,14,25,128);
    // Stylized strips of sky in reflection.
    if(!lit){
      p.fillStyle="rgba(211,222,209,.28)";
      p.beginPath();p.moveTo(60,14);p.lineTo(85,14);p.lineTo(45,142);p.lineTo(25,142);p.fill();
    }else{
      p.fillStyle="rgba(251,226,164,.19)";p.fillRect(43,14,47,128);
    }
    p.fillStyle="#697579";p.fillRect(57,9,8,146);p.fillRect(9,78,111,7);
    p.fillStyle=lit?"#8b7773":"#253d47";
    p.fillRect(0,0,9,160);p.fillRect(120,0,8,160);
    p.fillRect(0,0,128,9);p.fillRect(0,152,128,8);
    const material=new THREE.MeshStandardMaterial({
      map:texture(c),roughness:lit?.65:.31,metalness:lit?0:.13,
      emissive:lit?0xd4a46d:0x263e50,
      emissiveIntensity:lit?.4:.06
    });
    return material;
  }

  // Asphalt/sidewalk overlays are grouped by material rather than thousands
  // of WebGL meshes. They give the flat map grime, puddles and road wear.
  const [grimeCanvas,g]=canvas(128,128);
  g.clearRect(0,0,128,128);
  const pool=g.createRadialGradient(64,65,3,64,65,58);
  pool.addColorStop(0,"rgba(24,39,47,.42)");
  pool.addColorStop(.6,"rgba(38,50,54,.16)");
  pool.addColorStop(1,"rgba(24,39,47,0)");
  g.fillStyle=pool;g.fillRect(0,0,128,128);
  for(let i=0;i<28;i++){
    g.fillStyle="rgba(232,226,203,"+(.028+rnd()*.065)+")";
    g.fillRect(12+rnd()*105,20+rnd()*85,1+rnd()*7,.5+rnd()*1.5);
  }
  const grimeMaterial=new THREE.MeshBasicMaterial({
    map:texture(grimeCanvas),transparent:true,depthWrite:false,
    opacity:.7,polygonOffset:true,polygonOffsetFactor:-1
  });
  const plane=new THREE.PlaneGeometry(1,1);
  const dirt=new THREE.InstancedMesh(plane,grimeMaterial,130);
  const transform=new THREE.Object3D();
  for(let i=0;i<130;i++){
    let x=(rnd()-.5)*291,z=(rnd()-.5)*291;
    // Concentrate road wear alongside road edges, not on lawns.
    const road=[-91,0,91];
    if(i%2===0)x=road[Math.floor(rnd()*3)]+(rnd()-.5)*12;
    else z=road[Math.floor(rnd()*3)]+(rnd()-.5)*12;
    transform.position.set(x,.143,z);
    transform.rotation.set(-Math.PI/2,0,rnd()*Math.PI*2);
    transform.scale.set(1.2+rnd()*5,1+rnd()*4,1);
    transform.updateMatrix();
    dirt.setMatrixAt(i,transform.matrix);
  }
  dirt.instanceMatrix.needsUpdate=true;
  dirt.computeBoundingSphere();dirt.frustumCulled=true;
  world.add(dirt);
  return {
    sky,
    darkWindows:windows(false),
    litWindows:windows(true),
    grime:dirt,
    setMood(index){
      // Sky texture remains authored, with gentle mood filter at night.
      const tint=[0xffffff,0xc0aeb2,0x293d5c,0xe0d5c4][index%4];
      sky.material.color.setHex(tint);
      sky.material.needsUpdate=true;
    },
    update(camera){
      sky.position.copy(camera.position);
    }
  };
}
