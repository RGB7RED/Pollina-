// MINI CITY 4.3.1A — mobile-friendly procedural materials, no third-party textures.
export function createBusStopMaterials(THREE){
  const standard=(color,roughness=.66,metalness=0)=>new THREE.MeshStandardMaterial({
    color,roughness,metalness
  });
  return {
    metal:standard(0x343434,.48,.65),
    trim:standard(0x5d5145,.58,.5),
    wood:standard(0x8b6042,.82,.05),
    glass:new THREE.MeshStandardMaterial({
      color:0x9fbcc2,metalness:.04,roughness:.16,
      transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide
    }),
    roof:new THREE.MeshStandardMaterial({
      color:0xe6c475,roughness:.33,metalness:0,
      transparent:true,opacity:.80,depthWrite:false,side:THREE.DoubleSide
    }),
    blue:standard(0x13609e,.48,.08),
    board:standard(0x253740,.8,.15),
    bolts:standard(0x94948b,.43,.8)
  };
}
