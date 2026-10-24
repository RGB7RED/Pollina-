// MINI CITY first residential floor: four separate Khrushchevka flats
// based on the reference plan, with no furniture. World coordinates/metres.
export function planFirstFloor(building,entrance){
  const x=entrance.x,y=entrance.floorHeight(0),half=entrance.stairHalf;
  if(building.floors!==5)throw Error("Five-storey prototype required");
  const wingSize=9.56,ceilingY=y+2.24,back=-6.10,front=6.10;
  const wings=[-1,1].map(side=>({
    side,minX:side<0?Math.max(-building.length/2+.24,x-wingSize):x+half,
    maxX:side<0?x-half:x+wingSize,innerX:x+side*half
  }));
  const doors=[{number:1,side:-1,z:-2.42,type:"1к"},
    {number:2,side:-1,z:-4.00,type:"2к"},
    {number:3,side:1,z:-2.42,type:"3к"},
    {number:4,side:1,z:-4.00,type:"1к"}]
    .map(d=>({...d,x:x+d.side*half,y,width:1.04}));
  const wall=.11,segments=[],rooms=[];
  const rect=(name,minX,maxX,minZ,maxZ)=>({
    name,minX,maxX,minZ,maxZ,minY:y-.10,maxY:ceilingY});
  function alongZ(name,z,min,max,at,width=.93){
    if(!(at-width/2>min&&at+width/2<max))throw Error("Bad door opening");
    segments.push(rect(name+"-a",min,at-width/2,z-wall/2,z+wall/2));
    segments.push(rect(name+"-b",at+width/2,max,z-wall/2,z+wall/2));
  }
  function alongX(name,xx,min,max,at,width=.90){
    if(!(at-width/2>min&&at+width/2<max))throw Error("Bad room passage");
    segments.push(rect(name+"-a",xx-wall/2,xx+wall/2,min,at-width/2));
    segments.push(rect(name+"-b",xx-wall/2,xx+wall/2,at+width/2,max));
  }
  for(const wing of wings){
    const {side,minX,maxX,innerX}=wing,left=minX,right=maxX;
    const near=innerX+side*.75;
    // Rear and front flats have independent entrance doors. Private
    // hall of front flat runs beside the side wall from Z=-3 to Z=-0.65.
    alongZ("front-rear-flat-"+side,-.65,left,right,near,1.02);
    const corridorWall=innerX+side*1.33;
    // Private hallway is SEALED from the neighbouring rear flat.
    // Its only connection is to its own front room through the
    // doorway in the transverse partition at Z=-0.65.
    segments.push(rect("private-hall-side-"+side,
      corridorWall-wall/2,corridorWall+wall/2,-3.08,-.65));
    segments.push(rect("private-hall-rear-cap-"+side,
      Math.min(corridorWall,innerX),Math.max(corridorWall,innerX),
      -3.08-wall/2,-3.08+wall/2));
    alongZ("rear-wet-zone-"+side,-4.73,left,right,
      side<0?left+3.05:right-3.05,.92);
    alongX("rear-kitchen-bath-"+side,side<0?right-2.55:left+2.55,
      back,-4.73,-5.42,.90);
    const frontDoorX=side<0?left+3.00:right-3.00;
    alongZ("front-living-"+side,1.68,left,right,frontDoorX,1.00);
    alongX("front-kitchen-bath-"+side,side<0?right-2.36:left+2.36,
      -.65,1.68,.48,.90);
    if(side===1){
      const splitX=left+(right-left)*.49;
      // THREE independent residential rooms (not one big 3K label):
      // left room + two smaller rooms on right, linked by doorways.
      alongX("three-room-right",splitX,1.68,front,2.50,1.0);
      alongZ("third-room-right",3.65,splitX,right,right-1.55,.99);
    }
    const frontNo=side<0?1:3,rearNo=side<0?2:4;
    rooms.push({flat:rearNo,name:"Прихожая",section:"rear"},
      {flat:rearNo,name:"Кухня",section:"rear"},
      {flat:rearNo,name:"Санузел",section:"rear"},
      {flat:rearNo,name:"Жилые комнаты",section:"rear"});
    rooms.push({flat:frontNo,name:"Прихожая",section:"front"},
      {flat:frontNo,name:"Кухня",section:"front"},
      {flat:frontNo,name:"Санузел",section:"front"},
      {flat:frontNo,name:"Жилые комнаты",section:"front"});
    if(left < -building.length/2||right > building.length/2)
      throw Error("Apartment crosses outer facade");
  }
  // Rendered by building.js, but represented independently in the
  // numerical collision plan: do not allow walking through solid
  // side masonry anywhere except the four actual door openings.
  const stairWallColliders=wings.flatMap(wing=>{
    const intervals=[[back,-4.52],[-3.48,-2.94],[-1.90,front]];
    return intervals.map(([z0,z1],i)=>rect("flat-side-wall-"+wing.side+"-"+i,
      wing.innerX-.075,wing.innerX+.075,z0,z1));
  });
  const doorBlockers=doors.map(d=>rect("flat-"+d.number+"-closed",
    d.x-.06,d.x+.06,d.z-.52,d.z+.52));
  return {floor:1,y,ceilingY,x,wall,wings,doors,rooms,segments,
    doorBlockers,back,front,unfurnished:true,template:"Khrushchevka-4-flats",
    contains:(px,pz,py)=>Math.abs(py-y)<.24&&wings.some(w=>
      px>=w.minX-.11&&px<=w.maxX+.11&&pz>=back&&pz<=front),
    obstacles:[...segments,...stairWallColliders]};
}
export function buildFirstFloor(THREE,plan){
  const root=new THREE.Group();root.name="FIRST FLOOR: FOUR UNFURNISHED FLATS";
  const geometry=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const mats={
    wall:new THREE.MeshStandardMaterial({color:0xd5ccba,roughness:.95}),
    slab:new THREE.MeshStandardMaterial({color:0x9a937d,roughness:.98}),
    frame:new THREE.MeshStandardMaterial({color:0xd3c9b4,roughness:.88}),
    wood:new THREE.MeshStandardMaterial({color:0x6b645c,roughness:.84}),
    metal:new THREE.MeshStandardMaterial({color:0x879291,roughness:.66})
  };
  const batches=new Map();function box(w,h,d,m,x,y,z){
    if(Math.min(w,h,d)<=0)throw Error("Bad first-floor box");
    const q=batches.get(m)||[];if(!batches.has(m))batches.set(m,q);
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);
    dummy.scale.set(w,h,d);dummy.updateMatrix();q.push(dummy.matrix.clone());
  }
  for(const s of plan.segments)
    box(s.maxX-s.minX,s.maxY-s.minY,s.maxZ-s.minZ,mats.wall,
      (s.minX+s.maxX)/2,(s.minY+s.maxY)/2,(s.minZ+s.maxZ)/2);
  for(const wing of plan.wings)
    box(wing.maxX-wing.minX,.14,plan.front-plan.back,mats.slab,
      (wing.minX+wing.maxX)/2,plan.y-.07,(plan.back+plan.front)/2);
  const doorPivots=new Map();
  for(const d of plan.doors){
    const pivot=new THREE.Group();pivot.name="flat-door-"+d.number;
    pivot.position.set(d.x,plan.y,d.z-.47);
    const leaf=new THREE.Mesh(geometry,mats.wood);
    leaf.scale.set(.08,2.04,.94);leaf.position.set(0,1.02,.47);
    pivot.add(leaf);
    const knob=new THREE.Mesh(geometry,mats.metal);
    knob.scale.set(.035,.12,.08);knob.position.set(.08,1.04,.77);
    pivot.add(knob);root.add(pivot);doorPivots.set(d.number,pivot);
    for(const z of [d.z-.52,d.z+.52])
      box(.15,2.15,.06,mats.frame,d.x,plan.y+1.075,z);
    box(.15,.075,1.10,mats.frame,d.x,plan.y+2.18,d.z);
  }
  for(const [material,transforms] of batches){
    const instanced=new THREE.InstancedMesh(geometry,material,transforms.length);
    transforms.forEach((m,i)=>instanced.setMatrixAt(i,m));
    instanced.instanceMatrix.needsUpdate=true;instanced.computeBoundingSphere();
    instanced.castShadow=true;instanced.receiveShadow=true;root.add(instanced);
  }
  root.userData.firstFloorAudit={apartments:4,doors:[1,2,3,4],
    emptyRooms:true,template:plan.template,wallSegments:plan.segments.length,
    instancedBatches:batches.size,firstFloorOnly:true};
  return {root,doorPivots,stats:root.userData.firstFloorAudit};
}
