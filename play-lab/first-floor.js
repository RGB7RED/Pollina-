// MINI CITY 4.7.2 — four independent, EMPTY Khrushchevka apartments.
// Reference map: north/rear = top of plan, south/front = entry street.
// Top left 2-room, top right 1-room, bottom left 1-room,
// bottom right 3-room. Wet rooms adjoin the staircase service core.
// All 4 halls, kitchens, bathrooms and bedrooms have REAL wall openings.
export function planFirstFloor(building,entrance){
  if(building.floors!==5)throw Error("Five-storey reference required");
  const x=entrance.x,y=entrance.floorHeight(0),half=entrance.stairHalf;
  // Finished room faces stay WITHIN the inner face of the concrete
  // exterior panels, not in or behind their transparent glass.
  const back=(building.backFacade??-building.width/2)+.42;
  const front=(building.frontFacade??building.width/2)-.42;
  const divider=-3.21,ceilingY=y+building.floorHeight-.16;
  const wall=.11,openingHeight=2.08;
  // First stairwell is bay 3; its right residential glazing is ONLY
  // bays 4, 5 and 6. End the wing at the bay 6/7 MIDPOINT, not at an
  // arbitrary 9.56m distance that clips the next fourth window (bay 7).
  const bayStep=(building.length-3.7)/building.windowBays;
  const bayCentre=bay=>-building.length/2+1.85+(bay+.5)*bayStep;
  if(Math.abs(x-bayCentre(3))>.02)
    throw Error("First-floor prototype expects the first entrance (bay 3)");
  const rightWingEnd=(bayCentre(6)+bayCentre(7))/2;
  if(ceilingY-y<=openingHeight+.06)
    throw Error("Room doors would intersect next-floor slab");
  // Restrict the right wing without changing the west-end panel windows.
  // Structural stair wall is 14cm thick and centred on x±stairHalf.
  // Residential finished areas begin beyond its OUTER face, never
  // inside the old staircase masonry or painted stairwell panels.
  const stairWallFace=.08;
  const wings=[-1,1].map(side=>({
    side,innerX:x+side*half,
    // The westmost prototype wing must meet the REAL end-panel inner
    // face, rather than terminate 0.8m before the facade and leave a
    // hidden dead corridor behind its actual windows.
    minX:side<0?-building.length/2+.36:x+half+stairWallFace,
    maxX:side<0?x-half-stairWallFace:rightWingEnd
  }));
  // Preserve the original four door colours BY PHYSICAL LOCATION while
  // numbering the right front/rear 1/2 and left front/rear 3/4.
  const doorKinds=["grey","brown","blue","dark"];
  const doors=[
    {number:4,side:-1,z:-2.42,type:"1к",quadrant:"front"},
    {number:3,side:-1,z:-4.00,type:"2к",quadrant:"rear"},
    {number:1,side:1,z:-2.42,type:"1к",quadrant:"front"},
    {number:2,side:1,z:-4.00,type:"1к",quadrant:"rear"}
  ].map((d,i)=>({...d,x:x+d.side*half,y,width:1.04,
    variant:doorKinds[i],paletteIndex:i}));
  const segments=[],rooms=[],unitAreas=[],openings=[];
  function rect(name,minX,maxX,minZ,maxZ,minY=y-.10,maxY=ceilingY){
    if(maxX-minX<=.001||maxZ-minZ<=.001||maxY-minY<=.001)
      throw Error("Invalid partition dimensions "+name);
    return {name,minX,maxX,minZ,maxZ,minY,maxY};
  }
  function wallZ(name,z,left,right,doors=[]){
    let edge=left;
    for(const [i,gap] of doors.slice().sort((a,b)=>a.x-b.x).entries()){
      const a=gap.x-gap.width/2,b=gap.x+gap.width/2;
      if(a<=edge+.08||b>=right-.08)
        throw Error("Transverse room opening overlaps another "+name);
      segments.push(rect(name+"-solid-"+i,edge,a,z-wall/2,z+wall/2));
      segments.push(rect(name+"-lintel-"+i,a,b,z-wall/2,z+wall/2,
        y+openingHeight,ceilingY));
      openings.push({name:name+"-door-"+i,axis:"z",x:gap.x,z,
        width:gap.width,height:openingHeight});
      edge=b;
    }
    segments.push(rect(name+"-tail",edge,right,z-wall/2,z+wall/2));
  }
  function wallX(name,xx,backZ,frontZ,doors=[]){
    let edge=backZ;
    for(const [i,gap] of doors.slice().sort((a,b)=>a.z-b.z).entries()){
      const a=gap.z-gap.width/2,b=gap.z+gap.width/2;
      if(a<=edge+.08||b>=frontZ-.08)
        throw Error("Longitudinal room opening overlaps another "+name);
      segments.push(rect(name+"-solid-"+i,xx-wall/2,xx+wall/2,edge,a));
      segments.push(rect(name+"-lintel-"+i,xx-wall/2,xx+wall/2,a,b,
        y+openingHeight,ceilingY));
      openings.push({name:name+"-door-"+i,axis:"x",x:xx,z:gap.z,
        width:gap.width,height:openingHeight});
      edge=b;
    }
    segments.push(rect(name+"-tail",xx-wall/2,xx+wall/2,edge,frontZ));
  }
  function room(flat,name,minX,maxX,minZ,maxZ){
    if(maxX-minX<.75||maxZ-minZ<.75)
      throw Error("Room too narrow: "+flat+" "+name);
    rooms.push({flat,name,minX,maxX,minZ,maxZ});
  }
  const unit=(number,side,which,left,right,z0,z1)=>unitAreas.push({
    number,side,section:which,minX:left,maxX:right,minZ:z0,maxZ:z1
  });
  for(const w of wings){
    const {side,minX:left,maxX:right,innerX}=w;
    const at=d=>innerX+side*d;
    const near=at(1.32),outer=side<0?left:right;
    const inner=innerX;
    const corridor0=Math.min(inner,near),corridor1=Math.max(inner,near);
    const wet0=Math.min(outer,near),wet1=Math.max(outer,near);
    const rearNo=side<0?3:2,frontNo=side<0?4:1;
    if(right-left<6.70||back>-10.25)
      throw Error("Insufficient real house depth for separate reference rooms");
    // Unbroken wall between the independently entered north and south homes.
    wallZ("separate-homes-"+side,divider,left,right);
    // Edge of the modelled wing seals it against the next building unit,
    // leaving existing transparent facade windows completely untouched.
    if(side<0){
      // Negative-X end wall contains TWO actual transparent windows.
      // The former full-height "outer-neighbour" solid slab completely
      // concealed both windows from the flats. Subtract matching holes.
      const middle=(building.frontFacade+building.backFacade)/2;
      const endWindowZ=[(building.backFacade+middle)/2,
        (middle+building.frontFacade)/2],halfWindow=1.39/2;
      let edge=back;
      for(let i=0;i<endWindowZ.length;i++){
        const z=endWindowZ[i],left=z-halfWindow,right=z+halfWindow;
        if(left<=edge||right>=front)throw Error("End window outside flat");
        segments.push(rect("end-lining-solid-"+i,outer-wall/2,outer+wall/2,
          edge,left));
        const sill=y+.64,lintel=sill+1.46;
        segments.push(rect("end-lining-sill-"+i,outer-wall/2,outer+wall/2,
          left,right,y-.10,sill));
        segments.push(rect("end-lining-head-"+i,outer-wall/2,outer+wall/2,
          left,right,lintel,ceilingY));
        edge=right;
      }
      segments.push(rect("end-lining-tail",outer-wall/2,outer+wall/2,edge,front));
    }else wallX("outer-neighbour-"+side,outer,back,front);

    // NORTH REAR APARTMENT: door z=-4.00 into its own 1.32m-wide
    // lengthwise hall; two separate wet-room entrances and a cross
    // corridor giving individual access to both north-facing bedrooms.
    // The west end-panel window centred at z=-7.85 occupies
    // [-8.545,-7.155]. Neither the bedroom boundary nor the cross-hall
    // partition may terminate in that glazing (including the frame).
    // Keep the corridor BETWEEN these two structural cross-walls.
    const rearBedroomFront=-9.00,rearHallFront=-6.90,wetSplit=-5.22;
    const wetDoorKitchen=-6.12,wetDoorBathroom=-4.25;
    wallX("rear-private-hall-"+side,near,rearHallFront,divider,[
      {z:wetDoorKitchen,width:.90},
      {z:wetDoorBathroom,width:.90}
    ]);
    wallZ("rear-cross-hall-kitchen-"+side,rearHallFront,
      wet0,wet1,[{x:(wet0+wet1)/2,width:.96}]);
    wallZ("rear-kitchen-bath-"+side,wetSplit,wet0,wet1);
    room(rearNo,"Прихожая",corridor0,corridor1,rearHallFront,divider);
    room(rearNo,"Кухня",wet0,wet1,rearHallFront,wetSplit);
    room(rearNo,"Санузел",wet0,wet1,wetSplit,divider);
    // The cross hall occupies the full wing width for one metre and
    // connects to the private hall without going through the kitchen.
    room(rearNo,"Коридор",left,right,rearBedroomFront,rearHallFront);
    if(side<0){
      const split=at(4.32);
      wallX("rear-two-bedrooms-divider",split,back,rearBedroomFront);
      const c1=(left+split)/2,c2=(split+right)/2;
      wallZ("rear-bedrooms-entry-"+side,rearBedroomFront,left,right,[
        {x:c1,width:.95},{x:c2,width:.95}
      ]);
      room(3,"Жилая комната 1",left,split,back,rearBedroomFront);
      room(3,"Жилая комната 2",split,right,back,rearBedroomFront);
    }else{
      wallZ("rear-bedroom-entry-"+side,rearBedroomFront,left,right,[
        {x:(left+right)/2,width:1.03}
      ]);
      room(2,"Жилая комната 1",left,right,back,rearBedroomFront);
    }
    unit(rearNo,side,"rear",left,right,back,divider);

    // SOUTH FRONT APARTMENT: own z=-2.42 doorway. The long hall lies
    // next to the stair. Kitchen and bathroom each open DIRECTLY off
    // that hall; a transverse corridor serves all living rooms.
    // The other west end-panel window is z=+1.65, from +0.955
    // to +2.345. Both corridor boundaries must clear that full sash.
    const frontCrossBack=.80,frontBedrooms=2.60;
    const frontWetSplit=-.62;
    // Flat 1: the original kitchen and bath become ONE wide kitchen.
    // Keep the hallway boundaries; replace its two small wet-room doors
    // with one clear entrance to the enlarged kitchen.
    wallX("front-private-hall-"+side,near,divider,frontCrossBack,
      side>0?[{z:-1.10,width:1.08}]:[
        {z:-1.80,width:.88},{z:.25,width:.88}
      ]);
    if(side<0)wallZ("front-kitchen-bath-"+side,frontWetSplit,wet0,wet1);
    wallZ("front-cross-hall-wet-"+side,frontCrossBack,wet0,wet1,
      [{x:(wet0+wet1)/2,width:.96}]);
    room(frontNo,"Прихожая",corridor0,corridor1,divider,frontCrossBack);
    if(side>0){
      room(1,"Кухня",wet0,wet1,divider,frontCrossBack);
    }else{
      room(frontNo,"Кухня",wet0,wet1,divider,frontWetSplit);
      room(frontNo,"Санузел",wet0,wet1,frontWetSplit,frontCrossBack);
    }
    room(frontNo,"Коридор",left,right,frontCrossBack,frontBedrooms);
    if(side>0){
      // Flat 1 retains all three original front window bays 4, 5, 6.
      // The single new partition sits BETWEEN window bays 5 and 6.
      const bayX=n=>-building.length/2+1.85+
        (n+.5)*(building.length-3.7)/building.windowBays;
      const s2=(bayX(5)+bayX(6))/2;
      if(!(left+1.80<s2&&s2+1<right))
        throw Error("Flat 1 bath partition cannot fit between facade windows");
      // Combine former rooms 1+2 into one living room with both windows.
      // Former room 3 becomes a spacious bath, with the wall between
      // window bays 5/6 (never through a frame). Keep the corridor.
      wallX("flat1-bath-partition",s2,frontBedrooms,front);
      wallZ("flat1-room-bath-access",frontBedrooms,left,right,[
        {x:(left+s2)/2,width:1.04},
        {x:(s2+right)/2,width:.98}
      ]);
      room(1,"Жилая комната 1",left,s2,frontBedrooms,front);
      room(1,"Санузел",s2,right,frontBedrooms,front);
    }else{
      wallZ("front-one-bedroom-access",frontBedrooms,left,right,[
        {x:at(1.62),width:1.04}
      ]);
      room(4,"Жилая комната",left,right,frontBedrooms,front);
    }
    unit(frontNo,side,"front",left,right,divider,front);
    if(left< -building.length/2||right>building.length/2||
       back<=building.backFacade||front>=building.frontFacade)
      throw Error("Room extends outside actual masonry envelope");
  }
  // Enclose the void behind the staircase as a second REAL room of flat 2.
  const annex={number:2,minX:x-half+.12,maxX:x+half-.12,
    minZ:back,maxZ:-4.93,doorZ:-7.76,doorWidth:1.22};
  if(!(annex.doorZ-annex.doorWidth/2 > -9.00+.18 &&
       annex.doorZ+annex.doorWidth/2 < -6.90-.12))
    throw Error("Annex doorway must join flat 2 cross-hall");
  room(2,"Жилая комната 2",annex.minX,annex.maxX,annex.minZ,annex.maxZ);
  // Back facade bay 3 retains its full transparent window.
  const rearWindowX=bayCentre(3),rearWindowHalf=.70;
  const rearLineZ=building.backFacade+.355;
  const backLining=(name,a,b,lo=y-.10,hi=ceilingY)=>{
    if(b-a>.001)segments.push(rect(name,a,b,rearLineZ-.025,rearLineZ+.025,lo,hi));
  };
  backLining("annex-rear-left",annex.minX,rearWindowX-rearWindowHalf);
  backLining("annex-rear-sill",rearWindowX-rearWindowHalf,
    rearWindowX+rearWindowHalf,y-.10,y+.64);
  backLining("annex-rear-lintel",rearWindowX-rearWindowHalf,
    rearWindowX+rearWindowHalf,y+2.10,ceilingY);
  backLining("annex-rear-right",rearWindowX+rearWindowHalf,annex.maxX);
  // The original stair masonry begins at Z=-4.85, but the new
  // 19-metre-deep building extends 7.75m behind it. Both missing
  // corridor-side walls MUST reach all the way to the rear facade.
  const originalStairRear=-4.85;
  for(const w of wings){
    if(w.side<0){
      segments.push(rect("rear-stair-side-continuation-"+w.side,
        w.innerX-wall/2,w.innerX+wall/2,back,originalStairRear));
    }else{
      // Keep an upper lintel but cut a physical passage below it.
      segments.push(rect("rear-stair-side-continuation-1",
        w.innerX-wall/2,w.innerX+wall/2,back,originalStairRear,
        y+openingHeight,ceilingY));
      wallX("annex-access-2",w.innerX,back,originalStairRear,
        [{z:annex.doorZ,width:annex.doorWidth}]);
    }
  }
  // Interior facing of both REAL outer concrete facades. Split it by
  // each actual transparent window; never cover glazing with a
  // second opaque wall or allow partition ends to intersect sashes.
  const facadeLining=[];
  const sillY=y+.64,lintelY=sillY+1.46;
  const fullWindowWidth=1.40;
  for(const wing of wings)for(const side of [-1,1]){
    const z=side===1?building.frontFacade-.355:
      building.backFacade+.355;
    let edge=wing.minX;
    const allBays=Array.from({length:building.windowBays},(_,i)=>
      ({bay:i,x:-building.length/2+1.85+(i+.5)*bayStep}))
      .filter(w=>w.x+fullWindowWidth/2>wing.minX+.001&&
        w.x-fullWindowWidth/2<wing.maxX-.001&&
        !(side===1&&[3,10,17,24].includes(w.bay)));
    for(const [index,win] of allBays.entries()){
      const l=Math.max(wing.minX,win.x-fullWindowWidth/2);
      const r=Math.min(wing.maxX,win.x+fullWindowWidth/2);
      if(l>edge+.001)
        facadeLining.push(rect("panel-lining-solid-"+wing.side+"-"+side+"-"+index,
          edge,l,z-.025,z+.025));
      if(r-l>.01){
        facadeLining.push(rect("panel-lining-sill-"+wing.side+"-"+side+"-"+index,
          l,r,z-.025,z+.025,y-.10,sillY));
        facadeLining.push(rect("panel-lining-head-"+wing.side+"-"+side+"-"+index,
          l,r,z-.025,z+.025,lintelY,ceilingY));
      }
      edge=Math.max(edge,r);
    }
    if(wing.maxX-edge>.001)
      facadeLining.push(rect("panel-lining-tail-"+wing.side+"-"+side,
        edge,wing.maxX,z-.025,z+.025));
  }
  segments.push(...facadeLining);
  // Explicit guard against NEW partitions cutting the middle of any
  // facade window. Only walls perpendicular to the facade can do so.
  const windowConflicts=[];
  for(const w of wings){
    const windows=Array.from({length:building.windowBays},(_,bay)=>
      -building.length/2+1.85+(bay+.5)*bayStep)
      .filter(x=>x>=w.minX&&x<=w.maxX);
    for(const wall of segments){
      if(!wall.name.includes("three-room-separation")&&
         !wall.name.includes("flat1-bath-partition")&&
         !wall.name.includes("rear-two-bedrooms-divider"))continue;
      for(const cx of windows)
        if(wall.minX<cx+.72&&wall.maxX>cx-.72 &&
          (wall.maxZ>=front-.20||wall.minZ<=back+.20))
          windowConflicts.push({wall:wall.name,windowX:cx});
    }
  }
  if(windowConflicts.length)
    throw Error("Partition intersects exterior window: "+JSON.stringify(windowConflicts));
  const stairWallColliders=wings.flatMap(w=>{
    const spans=w.side<0
      ?[[back,-4.52],[-3.48,-2.94],[-1.90,front]]
      :[[back,annex.doorZ-annex.doorWidth/2],
        [annex.doorZ+annex.doorWidth/2,-4.52],
        [-3.48,-2.94],[-1.90,front]];
    return spans.map(([a,b],i)=>rect("flat-side-wall-"+w.side+"-"+i,
      w.innerX-.075,w.innerX+.075,a,b));
  });
  const doorBlockers=doors.map(d=>rect("flat-"+d.number+"-closed",
    d.x-.06,d.x+.06,d.z-.52,d.z+.52));
  const data={
    floor:1,y,ceilingY,wall,x,wings,annex,doors,rooms,unitAreas,openings,
    segments,doorBlockers,back,front,divider,unfurnished:true,
    facadeLiningCount:facadeLining.length,
    windowConflicts,roofStyle:"flat-panel",
    template:"Khrushchevka-reference-flat1-combined-kitchen-and-bath", 
    bounds:{back:building.backFacade,front:building.frontFacade},
    contains:(px,pz,py)=>Math.abs(py-y)<.24&&(
      wings.some(w=>px>=w.minX-.11&&px<=w.maxX+.11&&pz>=back&&pz<=front)||
      (px>=annex.minX&&px<=annex.maxX&&pz>=annex.minZ&&pz<=annex.maxZ)),
    obstacles:[...segments,...stairWallColliders],
    roomCount:n=>rooms.filter(r=>r.flat===n&&r.name.startsWith("Жилая комната")).length
  };
  for(const [number,count] of [[1,1],[2,2],[3,2],[4,1]])
    if(data.roomCount(number)!==count)
      throw Error("Apartment "+number+" does not match reference");
  return data;
}
export function buildFirstFloor(THREE,plan){
  const root=new THREE.Group();root.name="First floor · flat 1 replan";
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
  // No 8–12cm black crevice at the join with the old -4.85m stair
  // masonry: BOTH slabs physically pass under the wall and intersect
  // the side walls by their half-thickness. Walkable room boundaries
  // remain unchanged, so no floor is laid on the staircase itself.
  const annex=plan.annex;
  const slabMinX=annex.minX-.20,slabMaxX=annex.maxX+.20;
  const slabFrontZ=-4.77; // extends 8cm through former -4.85m wall
  const slabCentreX=(slabMinX+slabMaxX)/2;
  const slabCentreZ=(annex.minZ+slabFrontZ)/2;
  box(slabMaxX-slabMinX,.14,slabFrontZ-annex.minZ,mats.slab,
    slabCentreX,plan.y-.07,slabCentreZ);
  box(slabMaxX-slabMinX,.12,slabFrontZ-annex.minZ,mats.slab,
    slabCentreX,plan.ceilingY+.06,slabCentreZ);
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
    const numeralSegments={
      a:[0,.055,.075,.011],b:[.043,.026,.011,.046],
      c:[.043,-.026,.011,.046],d:[0,-.055,.075,.011],
      e:[-.043,-.026,.011,.046],f:[-.043,.026,.011,.046],
      g:[0,0,.075,.011]
    };
    for(const mark of ({1:"bc",2:"abged",3:"abgcd",4:"fgbc"})[d.number]){
      const [oz,oy,w,h]=numeralSegments[mark];
      const numeral=new THREE.Mesh(geometry,mats.dark);
      numeral.scale.set(.018,h,w);
      numeral.position.set(-d.side*.074,1.84+oy,.47+oz);
      pivot.add(numeral);
    }
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
