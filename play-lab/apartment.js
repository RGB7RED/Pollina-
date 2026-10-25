// MINI CITY 4.6 · First real flat, apartment No.17 on fifth floor.
// Building exterior / glazing, street, player and free camera stay in
// the same world. The fifth-floor window sill is correctly aligned with
// the existing facade; lower floors need separate alignment work.
export const FIRST_APARTMENT_NUMBER=17;
export function planFirstApartment(building,entry){
  if(building.floors!==5||entry.totalFloors!==5)throw Error("Apartment 17 requires the five-storey first entrance");
  const x=entry.x,floorY=entry.floorHeight(4),stairWall=x-entry.stairHalf;
  const minX=x-6.30,maxX=stairWall,
    backZ=(building.backFacade??-building.width/2)+.27,
    frontZ=(building.frontFacade??building.width/2)-.28;
  const doorway={id:"apartment-17",x:stairWall,z:-2.42,width:1.04,
    hingeZ:-2.42-.47,floorY};
  const step=(building.length-3.7)/building.windowBays;
  const windowX=-building.length/2+1.85+1.5*step; // bay 1, both sides.
  const windowBottom=floorY+.64;
  const windowTop=windowBottom+1.46;
  const ceilingY=(building.firstFloor??2.09)+building.floors*building.floorHeight-.16;
  if(!(windowX-0.7>minX+.15&&windowX+.7<maxX-.3&&
       windowBottom-floorY>.58&&windowTop<ceilingY-.10))
    throw Error("Apartment must align with REAL top-floor facade windows");
  const rooms=[
    {id:"hall",label:"Прихожая",minX,maxX,minZ:-3.08,maxZ:.10},
    {id:"kitchen",label:"Кухня",minX,maxX:minX+2.48,minZ:backZ,maxZ:-3.08},
    {id:"bath",label:"Санузел",minX:minX+2.48,maxX,minZ:backZ,maxZ:-3.08},
    {id:"living",label:"Жилая комната",minX,maxX,minZ:.10,maxZ:frontZ}
  ];
  const wall=.11,topY=ceilingY-.02,wallHeight=topY-floorY;
  const bounds={minX,maxX,minZ:backZ,maxZ:frontZ};
  const ob=(name,minX,maxX,minZ,maxZ)=>({
    name,minX,maxX,minZ,maxZ,minY:floorY-.10,maxY:ceilingY+.01
  });
  const aperture=(name,coord,min,max,center,opening,vertical=false)=>{
    const left=center-opening/2,right=center+opening/2;
    if(left<=min||right>=max)throw Error("Apartment doorway intersects partition "+name);
    return vertical?[
      ob(name+"-a",coord-wall/2,coord+wall/2,min,left),
      ob(name+"-b",coord-wall/2,coord+wall/2,right,max)
    ]:[
      ob(name+"-a",min,left,coord-wall/2,coord+wall/2),
      ob(name+"-b",right,max,coord-wall/2,coord+wall/2)
    ];
  };
  const kitchenDoorX=minX+1.24,bathDoorX=minX+3.48,
    livingDoorX=minX+2.20;
  const openingZ0=doorway.z-doorway.width/2,
    openingZ1=doorway.z+doorway.width/2;
  const obstacles=[
    // The rest of the house's left slab remains solid at this height.
    ob("apartment-left-neighbour",-building.length/2,minX,
      building.backFacade??-building.width/2,building.frontFacade??building.width/2),
    ob("apartment-front-masonry",minX,maxX,frontZ,
      building.frontFacade??building.width/2),
    ob("apartment-back-masonry",minX,maxX,
      building.backFacade??-building.width/2,backZ),
    ob("apartment-left-partition",minX-.10,minX+.05,backZ,frontZ),
    // Real staircase wall, one DOOR aperture only at No.17.
    ob("apartment-stair-wall-back",maxX-.075,maxX+.075,backZ,openingZ0),
    ob("apartment-stair-wall-front",maxX-.075,maxX+.075,openingZ1,frontZ),
    ob("apartment-next-flat-rear",maxX,x+entry.stairHalf,
      building.backFacade??-building.width/2,entry.stair.backZ),
    ...aperture("kitchen-hall", -3.08,minX,minX+2.48,kitchenDoorX,.92),
    ...aperture("bath-hall",-3.08,minX+2.48,maxX,bathDoorX,.88),
    ...aperture("living-hall", .10,minX,maxX,livingDoorX,1.03),
    ob("bath-kitchen-divider",minX+2.48-.06,minX+2.48+.06,backZ,-3.08),
    // Furniture with genuine physical footprints, aligned to the visible meshes.
    ob("kitchen-counter",minX+.10,minX+1.85,backZ+.08,backZ+.62),
    ob("bath-tub",minX+2.70,minX+4.13,backZ+.08,backZ+.78),
    ob("living-sofa",minX+.14,minX+.94,1.12,3.10)
  ];
  const doorBlocker=ob("apartment-17-closed-door",
    maxX-.065,maxX+.065,openingZ0,openingZ1);
  const within=(px,pz,y)=>px>=minX-.035&&px<=maxX+.035&&
    pz>=backZ&&pz<=frontZ&&Math.abs(y-floorY)<.25;
  return {number:FIRST_APARTMENT_NUMBER,floor:5,entryX:x,doorway,doorBlocker,
    floorY,ceilingY,wallHeight,windowX,windowBottom,windowTop,
    bounds,rooms,obstacles,kitchenDoorX,bathDoorX,livingDoorX,
    windows:[{side:"front",x:windowX,z:building.frontFacade??building.width/2,real:true},
      {side:"back",x:windowX,z:building.backFacade??-building.width/2,real:true}],
    contains:within,
    canInteract:(px,pz,y)=>Math.abs(y-floorY)<.24&&
      Math.hypot(px-doorway.x,pz-doorway.z)<1.35,
    zone:(px,pz)=>rooms.find(r=>
      px>=r.minX&&px<=r.maxX&&pz>=r.minZ&&pz<=r.maxZ)?.label||"Квартира №17"
  };
}

export function buildFirstApartment(THREE,p){
  const root=new THREE.Group();root.name="MINI CITY · apartment 17 · fifth floor";
  const cube=new THREE.BoxGeometry(1,1,1),batch=new Map(),dummy=new THREE.Object3D();
  const mats={
    wall:new THREE.MeshStandardMaterial({color:0xd9d1bf,roughness:.98}),
    dado:new THREE.MeshStandardMaterial({color:0x91a6a1,roughness:.97}),
    trim:new THREE.MeshStandardMaterial({color:0xe5ded0,roughness:.85}),
    parquet:new THREE.MeshStandardMaterial({color:0xa18261,roughness:.90}),
    tile:new THREE.MeshStandardMaterial({color:0xa6aaa2,roughness:.86}),
    wood:new THREE.MeshStandardMaterial({color:0x8b6c51,roughness:.83}),
    cabinet:new THREE.MeshStandardMaterial({color:0xc6b6a0,roughness:.82}),
    metal:new THREE.MeshStandardMaterial({color:0x848f8e,metalness:.23,roughness:.5}),
    glass:new THREE.MeshStandardMaterial({color:0x6a8b9a,metalness:.18,roughness:.33}),
    textile:new THREE.MeshStandardMaterial({color:0x6d8e89,roughness:1})
  };
  function box(w,h,d,mat,x,y,z){
    if(Math.min(w,h,d)<=0)throw Error("Invalid apartment box");
    let list=batch.get(mat);if(!list){list=[];batch.set(mat,list)}
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);
    dummy.scale.set(w,h,d);dummy.updateMatrix();list.push(dummy.matrix.clone());
  }
  function partitionZ(z,x0,x1,doorX,doorWidth){
    const l=doorX-doorWidth/2,r=doorX+doorWidth/2,th=.11;
    for(const [a,b] of [[x0,l],[r,x1]])
      box(b-a,p.wallHeight,th,mats.wall,(a+b)/2,p.floorY+p.wallHeight/2,z);
    box(doorWidth,p.wallHeight-2.12,th,mats.wall,
      doorX,p.floorY+2.12+(p.wallHeight-2.12)/2,z);
    // Simple cream frame: opening is genuinely empty, not a texture.
    for(const edge of [l,r])
      box(.065,2.12,.15,mats.trim,edge,p.floorY+1.06,z);
    box(doorWidth+.065,.055,.15,mats.trim,doorX,p.floorY+2.12,z);
  }
  const {minX,maxX,minZ,maxZ}=p.bounds;
  const innerX=(minX+maxX)/2,centreY=p.floorY+p.wallHeight/2;
  box(maxX-minX,.13,maxZ-minZ,mats.parquet,innerX,p.floorY-.074,(minZ+maxZ)/2);
  // Tile zones overlay the same physical slab; no extra full-height level.
  for(const id of ["kitchen","bath"]){
    const room=p.rooms.find(r=>r.id===id);
    box(room.maxX-room.minX-.03,.012,room.maxZ-room.minZ-.03,
      mats.tile,(room.maxX+room.minX)/2,p.floorY+.006,(room.minZ+room.maxZ)/2);
  }
  box(maxX-minX,.13,maxZ-minZ,mats.wall,innerX,p.ceilingY+.065,(minZ+maxZ)/2);
  // Partition to neighbouring apartment on west edge.
  box(.12,p.wallHeight,maxZ-minZ,mats.wall,minX,p.floorY+p.wallHeight/2,(minZ+maxZ)/2);
  // No fake windows: the ORIGINAL front and rear facade already has
  // true masonry openings and glazing at p.windowX and p.windowBottom.
  for(const z of [minZ,maxZ]){
    const halfWindow=.70,l=p.windowX-halfWindow,r=p.windowX+halfWindow;
    for(const [a,b] of [[minX,l],[r,maxX]])
      box(b-a,p.wallHeight,.06,mats.wall,(a+b)/2,centreY,z);
    const sillHeight=p.windowBottom-p.floorY;
    box(1.40,sillHeight,.06,mats.wall,p.windowX,p.floorY+sillHeight/2,z);
    const above=p.ceilingY-p.windowTop;
    box(1.40,above,.06,mats.wall,p.windowX,p.windowTop+above/2,z);
    box(1.55,.045,.21,mats.trim,p.windowX,p.windowBottom-.03,z);
  }
  // Stairwell side wall is cut around apartment 17 in buildApartmentHouse.
  // Just frame its actual opening. Other nineteen apartment doors stay static.
  const dz=p.doorway.z,h=2.12;
  for(const edge of [-p.doorway.width/2,p.doorway.width/2])
    box(.21,h,.064,mats.trim,p.doorway.x,p.floorY+h/2,dz+edge);
  box(.21,.085,p.doorway.width+.10,mats.trim,p.doorway.x,p.floorY+h+.02,dz);
  // Two-tone lower hallway finish; actual walls above still cream.
  const hall=p.rooms.find(r=>r.id==="hall");
  for(const z of [hall.minZ+.035,hall.maxZ-.035])
    box(maxX-minX,.94,.022,mats.dado,innerX,p.floorY+.47,z);
  partitionZ(-3.08,minX,minX+2.48,p.kitchenDoorX,.92);
  partitionZ(-3.08,minX+2.48,maxX,p.bathDoorX,.88);
  partitionZ(.10,minX,maxX,p.livingDoorX,1.03);
  box(.11,p.wallHeight,3.04,mats.wall,minX+2.48,centreY,(-6.12-3.08)/2);
  // Kitchen set, actual furniture with room-specific silhouettes.
  box(1.70,.81,.52,mats.cabinet,minX+.99,p.floorY+.405,minZ+.36);
  box(1.85,.055,.60,mats.metal,minX+1.02,p.floorY+.85,minZ+.34);
  box(.62,.078,.48,mats.metal,minX+.68,p.floorY+.91,minZ+.34);
  for(const off of [-.16,.16])
    box(.095,.015,.095,mats.wood,minX+1.45+off,p.floorY+.889,minZ+.33);
  // Compact bathroom: tub, basin and cistern.
  box(1.35,.48,.61,mats.wall,minX+3.42,p.floorY+.26,minZ+.39);
  box(.57,.13,.39,mats.wall,minX+3.61,p.floorY+.81,-3.68);
  box(.36,.05,.27,mats.metal,minX+3.61,p.floorY+.90,-3.68);
  // Living room: sofa, low table and rug.
  box(.84,.38,1.92,mats.textile,minX+.57,p.floorY+.25,2.13);
  box(.19,.76,1.92,mats.wood,minX+.18,p.floorY+.39,2.13);
  box(.92,.06,.67,mats.wood,minX+2.45,p.floorY+.43,2.60);
  box(2.55,.016,2.65,mats.textile,minX+2.12,p.floorY+.018,2.64);
  // Real hinged leaf rotating into the apartment. No double scene
  // and no movement/interaction logic inside this rendering module.
  const pivot=new THREE.Group();pivot.name="apartment-17-hinged-door";
  pivot.position.set(p.doorway.x-.07,p.floorY,p.doorway.hingeZ);
  function swingBox(w,h,d,mat,x,y,z){
    const m=new THREE.Mesh(cube,mat);
    m.scale.set(w,h,d);m.position.set(x,y,z);
    m.castShadow=true;m.receiveShadow=true;pivot.add(m);
  }
  swingBox(.068,2.04,.94,mats.wood,0,1.02,.47);
  swingBox(.025,.10,.12,mats.metal,.052,1.05,.77);
  swingBox(.018,.16,.10,mats.metal,-.052,1.05,.77);
  root.add(pivot);
  let boxes=0;
  for(const [mat,list] of batch){
    const mesh=new THREE.InstancedMesh(cube,mat,list.length);
    mesh.name="apartment-17 static furniture and walls";
    list.forEach((m,i)=>mesh.setMatrixAt(i,m));
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);boxes+=list.length;
  }
  root.userData.apartmentAudit={
    number:17,floor:5,floorY:p.floorY,windowBottom:p.windowBottom,
    windowTop:p.windowTop,windowX:p.windowX,windows:p.windows,
    roomNames:p.rooms.map(r=>r.label),furnitureBoxes:boxes,
    batchedMeshes:batch.size,doorPivot:!!pivot,insideExistingBuilding:true,
    exteriorWindowsUnmodified:true
  };
  return {root,doorPivot:pivot,stats:root.userData.apartmentAudit};
}
