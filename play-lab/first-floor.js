// MINI CITY 4.7.1 — first-floor plan rebuilt against supplied Khrushchevka drawing.
// Back of building is negative Z; entrance/street stays at +6.4m.
// Quadrants (from above): rear-left 2k, rear-right 1k,
// front-left 1k, front-right 3k. NO FURNITURE.
export function planFirstFloor(building,entrance){
  if(building.floors!==5)throw Error("Five-storey plan required");
  const x=entrance.x,y=entrance.floorHeight(0),half=entrance.stairHalf;
  const back=(building.backFacade??-building.width/2)+.27;
  const front=(building.frontFacade??building.width/2)-.28;
  const divider=-3.21,ceilingY=y+building.floorHeight-.16,wall=.11;
  const wingDepth=9.56;
  const wings=[-1,1].map(side=>({
    side,innerX:x+side*half,
    minX:side<0?Math.max(-building.length/2+.24,x-wingDepth):x+half,
    maxX:side<0?x-half:x+wingDepth
  }));
  const doorKinds=["grey","brown","blue","dark"];
  const doors=[{number:1,side:-1,z:-2.42,type:"1к",quadrant:"front"},
    {number:2,side:-1,z:-4.00,type:"2к",quadrant:"rear"},
    {number:3,side:1,z:-2.42,type:"3к",quadrant:"front"},
    {number:4,side:1,z:-4.00,type:"1к",quadrant:"rear"}]
    .map((d,i)=>({...d,x:x+d.side*half,y,width:1.04,
      variant:doorKinds[i],paletteIndex:i}));
  const segments=[],rooms=[],unitAreas=[];
  const rect=(name,minX,maxX,minZ,maxZ)=>({
    name,minX,maxX,minZ,maxZ,minY:y-.10,maxY:ceilingY});
  function wallZ(name,z,left,right,opening){
    if(!opening){segments.push(rect(name,left,right,z-wall/2,z+wall/2));return;}
    const a=opening.x-opening.width/2,b=opening.x+opening.width/2;
    if(a<=left+.04||b>=right-.04)throw Error("Bad transverse opening "+name);
    wallZ(name+"-west",z,left,a);wallZ(name+"-east",z,b,right);
  }
  function wallX(name,xx,backZ,frontZ,opening){
    if(!opening){segments.push(rect(name,xx-wall/2,xx+wall/2,backZ,frontZ));return;}
    const a=opening.z-opening.width/2,b=opening.z+opening.width/2;
    if(a<=backZ+.04||b>=frontZ-.04)throw Error("Bad longitudinal opening "+name);
    wallX(name+"-back",xx,backZ,a);wallX(name+"-front",xx,b,frontZ);
  }
  function room(flat,name,minX,maxX,minZ,maxZ){
    if(maxX-minX<.65||maxZ-minZ<.65)throw Error("Room too small "+name);
    rooms.push({flat,name,minX,maxX,minZ,maxZ});
  }
  for(const w of wings){
    const {side,minX:left,maxX:right,innerX}=w;
    const at=d=>innerX+side*d, near=(a,b)=>(a+b)/2;
    const rearNo=side<0?2:4,frontNo=side<0?1:3;
    const lane=at(2.35),bedSplit=at(4.40);
    // Adjacent apartments NEVER share an interior doorway.
    wallZ("separation-of-flats-"+side,divider,left,right);
    // External edge is a partition against the next, still locked unit,
    // not a duplicated brick facade blocking the genuine outdoor glass.
    const edge=side<0?left:right;
    wallX("neighbour-edge-"+side,edge,back,front);
    // REAR apartment has an independent vestibule from door z=-4.0.
    // Bathroom next to the stair; kitchen beside it; main rooms at the
    // rear real-window facade; two living rooms only in rear-left 2k.
    wallZ("rear-room-boundary-"+side,-6.32,left,right,
      {x:at(1.35),width:.96});
    wallX("rear-bathroom-"+side,lane,-6.32,divider,
      {z:-4.84,width:.84});
    if(side<0){
      wallX("two-room-bedroom-divider",bedSplit,back,-6.32,
        {z:-7.30,width:.94});
      room(2,"Жилая комната 1",left,bedSplit,back,-6.32);
      room(2,"Жилая комната 2",bedSplit,right,back,-6.32);
    }else room(4,"Жилая комната",left,right,back,-6.32);
    room(rearNo,"Кухня",Math.min(edge,lane),Math.max(edge,lane),-6.32,divider);
    room(rearNo,"Санузел",Math.min(innerX,lane),Math.max(innerX,lane),-6.32,divider);
    room(rearNo,"Прихожая",left,right,-5.20,divider);
    // FRONT apartment has its own independent entry hall z=-2.42.
    // Kitchens and bathrooms are around the staircase service core.
    // Living rooms follow the FRONT glazed wall, never the communal shaft.
    wallX("front-wet-core-"+side,lane,-.90,1.45,
      {z:.18,width:.88});
    wallZ("front-rooms-boundary-"+side,1.45,left,right,
      {x:at(3.05),width:1.02});
    room(frontNo,"Прихожая",left,right,divider,-.90);
    room(frontNo,"Кухня",Math.min(edge,lane),Math.max(edge,lane),-.90,1.45);
    room(frontNo,"Санузел",Math.min(innerX,lane),Math.max(innerX,lane),-.90,1.45);
    if(side<0){
      // The left-front 1k has ONE residential room, not a cut-up maze.
      room(1,"Жилая комната",left,right,1.45,front);
    }else{
      // Three genuinely separate living rooms on the right-front 3k.
      const split=at(4.03),splitZ=3.82;
      wallX("three-room-living-divider",split,1.45,front,
        {z:2.38,width:.95});
      const midX=(split+edge)/2;
      wallZ("three-room-third-bedroom",splitZ,Math.min(split,edge),
        Math.max(split,edge),{x:midX,width:.95});
      room(3,"Жилая комната 1",Math.min(innerX,split),Math.max(innerX,split),1.45,front);
      room(3,"Жилая комната 2",Math.min(split,edge),Math.max(split,edge),1.45,splitZ);
      room(3,"Жилая комната 3",Math.min(split,edge),Math.max(split,edge),splitZ,front);
    }
    for(const section of ["front","rear"])
      unitAreas.push({number:section==="front"?frontNo:rearNo,side,
        minX:left,maxX:right,
        minZ:section==="front"?divider:back,
        maxZ:section==="front"?front:divider});
    if(left< -building.length/2||right>building.length/2||
       back<=building.backFacade||front>=building.frontFacade)
      throw Error("First-floor room extends through exterior shell");
  }
  // A real collision boundary along the actual stairwell wall:
  // two openings centered at -4.00/-2.42, exactly as building.js.
  const stairWallColliders=wings.flatMap(w=>{
    const zs=[back,-4.52,-3.48,-2.94,-1.90,front];
    return [[zs[0],zs[1]],[zs[2],zs[3]],[zs[4],zs[5]]]
      .map(([a,b],i)=>rect("flat-side-wall-"+w.side+"-"+i,
        w.innerX-.075,w.innerX+.075,a,b));
  });
  const doorBlockers=doors.map(d=>rect("flat-"+d.number+"-closed",
    d.x-.06,d.x+.06,d.z-.52,d.z+.52));
  const data={floor:1,y,ceilingY,wall,x,wings,doors,rooms,unitAreas,
    segments,doorBlockers,back,front,divider,unfurnished:true,
    template:"Khrushchevka-reference-2k-1k-1k-3k",
    contains:(px,pz,py)=>Math.abs(py-y)<.24&&wings.some(w=>
      px>=w.minX-.11&&px<=w.maxX+.11&&pz>=back&&pz<=front),
    obstacles:[...segments,...stairWallColliders],
    roomCount:(n)=>rooms.filter(r=>r.flat===n&&r.name.startsWith("Жилая комната")).length
  };
  for(const [number,living] of [[1,1],[2,2],[3,3],[4,1]])
    if(data.roomCount(number)!==living)throw Error("Apartment room count "+number);
  return data;
}
export function buildFirstFloor(THREE,plan){
  const root=new THREE.Group();root.name="First floor · furnished: false · plan 2k/1k/1k/3k";
  const geometry=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const mats={
    wall:new THREE.MeshStandardMaterial({color:0xd5ccba,roughness:.95}),
    slab:new THREE.MeshStandardMaterial({color:0x9a937d,roughness:.98}),
    frame:new THREE.MeshStandardMaterial({color:0xd3c9b4,roughness:.88}),
    metal:new THREE.MeshStandardMaterial({color:0x879291,roughness:.66}),
    // Restore the four ORIGINAL distinct door appearances by number,
    // matching building.js apartmentPalette, no uniform brown leaves.
    grey:new THREE.MeshStandardMaterial({color:0x7f8989,roughness:.84}),
    brown:new THREE.MeshStandardMaterial({color:0x64554e,roughness:.85}),
    blue:new THREE.MeshStandardMaterial({color:0x4b6975,roughness:.84}),
    dark:new THREE.MeshStandardMaterial({color:0x444f53,roughness:.83})
  };
  const batches=new Map();
  function box(w,h,d,m,x,y,z){
    if(Math.min(w,h,d)<=0)throw Error("Invalid apartment geometry");
    const q=batches.get(m)||[];if(!batches.has(m))batches.set(m,q);
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);
    dummy.scale.set(w,h,d);dummy.updateMatrix();q.push(dummy.matrix.clone());
  }
  for(const s of plan.segments)
    box(s.maxX-s.minX,s.maxY-s.minY,s.maxZ-s.minZ,mats.wall,
      (s.minX+s.maxX)/2,(s.minY+s.maxY)/2,(s.minZ+s.maxZ)/2);
  // Two separate REAL slabs; the staircase hole remains open.
  for(const w of plan.wings)
    box(w.maxX-w.minX,.14,plan.front-plan.back,mats.slab,
      (w.minX+w.maxX)/2,plan.y-.07,(plan.back+plan.front)/2);
  const doorPivots=new Map();
  for(const d of plan.doors){
    const pivot=new THREE.Group();pivot.name="flat-door-"+d.number;
    pivot.position.set(d.x,plan.y,d.z-.47);
    const leaf=new THREE.Mesh(geometry,mats[d.variant]);
    leaf.scale.set(.09,2.04,.94);leaf.position.set(0,1.02,.47);
    pivot.add(leaf);
    const handle=new THREE.Mesh(geometry,mats.metal);
    handle.scale.set(.034,.12,.08);handle.position.set(-d.side*.078,1.04,.77);
    pivot.add(handle);
    // Restore NUMBER PLATES as well as the previous four door colors.
    // These are children of the hinged leaf, not orphaned on the wall.
    const plate=new THREE.Mesh(geometry,mats.frame);
    plate.scale.set(.014,.18,.18);
    plate.position.set(-d.side*.063,1.84,.47);
    pivot.add(plate);
    const numeral=new THREE.Mesh(geometry,mats.dark);
    numeral.scale.set(.018,.095,.048);
    numeral.position.set(-d.side*.074,1.84,.47);
    pivot.add(numeral);
    root.add(pivot);doorPivots.set(d.number,pivot);
    for(const z of [d.z-.52,d.z+.52])
      box(.15,2.15,.06,mats.frame,d.x,plan.y+1.075,z);
    box(.15,.075,1.10,mats.frame,d.x,plan.y+2.18,d.z);
  }
  for(const [material,transforms] of batches){
    const m=new THREE.InstancedMesh(geometry,material,transforms.length);
    transforms.forEach((matrix,i)=>m.setMatrixAt(i,matrix));
    m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();
    m.castShadow=true;m.receiveShadow=true;root.add(m);
  }
  root.userData.firstFloorAudit={apartments:4,doors:[1,2,3,4],
    variants:plan.doors.map(d=>d.variant),emptyRooms:true,
    template:plan.template,wallSegments:plan.segments.length,
    livingRooms:Object.fromEntries([1,2,3,4].map(n=>[n,plan.roomCount(n)])),
    instancedBatches:batches.size,firstFloorOnly:true};
  return {root,doorPivots,stats:root.userData.firstFloorAudit};
}
