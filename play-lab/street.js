// MINI CITY · Stage 4.2.1 — one mobile-budget residential street segment.
// World units are metres. Kept separate from the approved house geometry
// and character controller; deterministic placement makes review repeatable.
export const STREET_LAYOUT=Object.freeze({
  length:108,roadNear:16.05,roadFar:25.15,
  sidewalkNear:[9.55,15.98],sidewalkFar:[25.25,30.2],
  rearPath:[-12.05,-8.05],worldWidth:130,worldDepth:85
});
const rect=(kind,x,z,width,depth,y=0)=>({kind,x,z,width,depth,y});
const obstruction=(name,x,z,rx,rz)=>({
  name,minX:x-rx,maxX:x+rx,minZ:z-rz,maxZ:z+rz
});
export function planStreet(building,pads=[]){
  if(!Number.isFinite(building?.length)||!Number.isFinite(building?.width))
    throw Error("House dimensions are required to plan a street");
  const c=STREET_LAYOUT;
  const surfaces=[
    rect("grass",0,0,c.worldWidth,c.worldDepth,-.10),
    rect("front-sidewalk",0,(c.sidewalkNear[0]+c.sidewalkNear[1])/2,
      c.length,c.sidewalkNear[1]-c.sidewalkNear[0],-.055),
    rect("road",0,(c.roadNear+c.roadFar)/2,
      c.length,c.roadFar-c.roadNear,-.065),
    rect("opposite-sidewalk",0,(c.sidewalkFar[0]+c.sidewalkFar[1])/2,
      c.length,c.sidewalkFar[1]-c.sidewalkFar[0],-.055),
    rect("rear-service-path",0,(c.rearPath[0]+c.rearPath[1])/2,
      c.length-16,c.rearPath[1]-c.rearPath[0],-.065),
    // Small footpaths connect the rear courtyard to both street ends.
    rect("side-path-left",-42,-1.1,3.1,24,-.065),
    rect("side-path-right",42,-1.1,3.1,24,-.065)
  ];
  const markings=[];
  // Lane centre line stays open across the marked pedestrian crossing.
  for(let x=-49;x<=49;x+=8){
    if(Math.abs(x)<6)continue;
    markings.push(rect("lane",x,20.60,3.6,.115,-.048));
  }
  // Pedestrian crossing: walking direction across the road is along Z.
  for(const x of [-3.3,-2.2,-1.1,0,1.1,2.2,3.3])
    markings.push(rect("zebra",x,20.60,.64,8.45,-.048));
  const trees=[
    ...[-41,-29,-16,16,29,41].map(x=>({x,z:14.40,row:"front"})),
    ...[-44,-32,-20,-8,8,20,32,44].map(x=>({x,z:28.55,row:"opposite"})),
    ...[-42,-30,-18,-6,6,18,30,42].map(x=>({x,z:-20.1,row:"courtyard"}))
  ];
  const lamps=[
    ...[-35,-10,10,35].map(x=>({x,z:15.27,row:"front"})),
    ...[-35,35].map(x=>({x,z:26.15,row:"opposite"}))
  ];
  const benches=[-30,-12,12,30].map(x=>({x,z:-12.75}));
  const obstacles=[
    ...trees.map((t,i)=>obstruction("tree-"+i,t.x,t.z,.35,.35)),
    ...lamps.map((t,i)=>obstruction("lamp-"+i,t.x,t.z,.20,.20)),
    ...benches.map((t,i)=>obstruction("bench-"+i,t.x,t.z,1.13,.48))
  ];
  // Stop accidental scene changes from placing scenery into walls, door
  // slabs or on the initial player spawn. Collision and art share this plan.
  const house=obstruction("house",0,0,building.length/2,building.width/2);
  const entrances=pads.map((p,i)=>obstruction("entry-"+i,p.x,p.centreZ,
    p.width/2,p.depth/2));
  const overlap=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&
    a.minZ<b.maxZ&&a.maxZ>b.minZ;
  for(const o of obstacles){
    if(overlap(o,house)||entrances.some(p=>overlap(o,p)))
      throw Error("Street furnishing intersects building: "+o.name);
    if(.0>=o.minX-.36&&.0<=o.maxX+.36&&
       13.2>=o.minZ-.36&&13.2<=o.maxZ+.36)
      throw Error("Street furnishing intersects player spawn: "+o.name);
  }
  return {surfaces,markings,trees,lamps,benches,obstacles,
    curbs:[rect("curb",0,c.roadNear,c.length,.18,.025),
      rect("curb",0,c.roadFar,c.length,.18,.025)],
    info:{trees:trees.length,lamps:lamps.length,benches:benches.length,
      roadLength:c.length,roadWidth:c.roadFar-c.roadNear}};
}

// Render batched low-poly street furniture, NOT 22 independent tree materials
// and thousands of extra draw calls on an iPhone 12.
export function buildStreet(THREE,plan){
  const root=new THREE.Group();
  root.name="MINI CITY | 4.2.1 | first street";
  const materials={
    grass:new THREE.MeshStandardMaterial({color:0x6f846d,roughness:1}),
    sidewalk:new THREE.MeshStandardMaterial({color:0xaca8a0,roughness:.97}),
    road:new THREE.MeshStandardMaterial({color:0x484e52,roughness:.98}),
    paving:new THREE.MeshStandardMaterial({color:0x99978d,roughness:.97}),
    roadMark:new THREE.MeshBasicMaterial({color:0xd6d2bc}),
    curb:new THREE.MeshStandardMaterial({color:0x8f8f89,roughness:.96}),
    bark:new THREE.MeshStandardMaterial({color:0x635044,roughness:1}),
    leaves:new THREE.MeshStandardMaterial({color:0x587454,roughness:1,flatShading:true}),
    leaves2:new THREE.MeshStandardMaterial({color:0x728762,roughness:1,flatShading:true}),
    lamp:new THREE.MeshStandardMaterial({color:0x404c52,roughness:.77,metalness:.12}),
    glow:new THREE.MeshStandardMaterial({color:0xffdfac,emissive:0xffbb70,emissiveIntensity:1.35,roughness:.7}),
    wood:new THREE.MeshStandardMaterial({color:0x806451,roughness:.96})
  };
  const plane=(width,depth,material,x,y,z)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
    mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  for(const p of plan.surfaces){
    const mat=p.kind==="grass"?materials.grass:
      p.kind==="road"?materials.road:
      p.kind.includes("path")?materials.paving:materials.sidewalk;
    plane(p.width,p.depth,mat,p.x,p.y,p.z);
  }
  // One marking batch, shared geometry and one material.
  function batch(name,geometry,material,items,positionScale){
    if(items.length===0)return null;
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    mesh.name=name;
    mesh.frustumCulled=false; // few dozen visible items; avoid bad partial AABBs
    const temp=new THREE.Object3D();
    items.forEach((item,i)=>{
      const [x,y,z,sx,sy,sz]=positionScale(item);
      temp.position.set(x,y,z);temp.rotation.set(0,0,0);
      temp.scale.set(sx,sy,sz);temp.updateMatrix();
      mesh.setMatrixAt(i,temp.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();
    root.add(mesh);
    return mesh;
  }
  const cube=new THREE.BoxGeometry(1,1,1);
  batch("lane-and-crosswalk",cube,materials.roadMark,plan.markings,
    m=>[m.x,m.y,m.z,m.width,.008,m.depth]);
  batch("raised-curbs",cube,materials.curb,plan.curbs,
    m=>[m.x,m.y,m.z,m.width,.12,m.depth]);
  const trunk=new THREE.CylinderGeometry(.20,.28,2.35,6);
  const crown=new THREE.DodecahedronGeometry(1,0);
  batch("trees-trunks",trunk,materials.bark,plan.trees,t=>[t.x,1.16,t.z,1,1,1]);
  batch("trees-canopy-low",crown,materials.leaves,plan.trees,t=>
    [t.x,3.12,t.z,1.22,1.11,1.19]);
  batch("trees-canopy-high",crown,materials.leaves2,plan.trees,t=>
    [t.x+.18,4.16,t.z-.07,.89,.87,.93]);
  const pole=new THREE.CylinderGeometry(.075,.105,5.20,6);
  batch("street-lamp-poles",pole,materials.lamp,plan.lamps,t=>
    [t.x,2.60,t.z,1,1,1]);
  batch("street-lamp-arms",cube,materials.lamp,plan.lamps,t=>
    [t.x+.35,5.10,t.z,.80,.10,.12]);
  // Emissive only; six real-time point lights would be expensive on iPhone.
  batch("street-lamp-heads",cube,materials.glow,plan.lamps,t=>
    [t.x+.70,5.01,t.z,.33,.075,.23]);
  batch("benches-seats",cube,materials.wood,plan.benches,b=>
    [b.x,.57,b.z,2.03,.13,.56]);
  batch("benches-backs",cube,materials.wood,plan.benches,b=>
    [b.x,1.00,b.z-.27,2.03,.81,.12]);
  const legs=plan.benches.flatMap(b=>[
    {x:b.x-.72,z:b.z-.16},{x:b.x+.72,z:b.z-.16},
    {x:b.x-.72,z:b.z+.16},{x:b.x+.72,z:b.z+.16}
  ]);
  batch("benches-legs",cube,materials.lamp,legs,l=>
    [l.x,.28,l.z,.12,.56,.12]);
  root.userData.streetStats={...plan.info,
    obstacleCount:plan.obstacles.length,
    drawGroups:root.children.length};
  return root;
}
