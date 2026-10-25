// MINI CITY · Building Lab 3.2 — real aperture geometry and inhabited facade.
// Original modular blockout based on the user's reference PHOTO; not a
// reproduction or redistribution of the commercial model pictured in it.
// World units ~= metres. No dependencies other than a THREE namespace.
export const BUILDING={
  type:"Soviet brick apartment house",
  floors:5,
  entrances:4,
  length:74,
  width:16.0, // 6.4 m street-facing + 9.6 m rear facade
  frontFacade:6.4,
  backFacade:-9.6,
  plinth:.66,
  firstFloor:2.09,
  floorHeight:2.42,
  roofRise:3.08,
  roofOverhang:.46,
  roofHip:6.45,
  windowBays:28,
  entranceSide:"positive Z",
};
// Six ordinary window bays between adjacent entrances, including 1 → 2.
export const ENTRANCE_BAYS=Object.freeze([3,10,17,24]);
export const STAGES=["3.1 Форма","3.2 Фасад","3.3 Материалы","3.4 Оптимизация"];
function deterministic(seed=7331){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};}
export function planFacade({length=BUILDING.length,bays=BUILDING.windowBays,floors=BUILDING.floors}={}){
  const step=(length-3.7)/bays;
  const points=[];
  for(const side of [1,-1])for(let floor=0;floor<floors;floor++){
    for(let bay=0;bay<bays;bay++){
      const x=-length/2+1.85+(bay+.5)*step;
      const entrance=side===1&&floor===0&&ENTRANCE_BAYS.includes(bay);
      // Reference plan: ONLY TWO ordinary windows remain from the
      // first/last entrance to the respective end of the house.
      const blindBay=side===1&&(bay===0||bay===bays-1);
      // A real-looking uneven residential rhythm, no fully random facade.
      const balcony=(side===1?[2,6,11,16,21,25]:[4,10,16,22]).includes(bay)
        &&floor>0 && !(bay===11&&floor===2) && !(bay===22&&floor===4);
      const variation=(bay*37+floor*19+(side===1?2:5))%9;
      points.push({x,side,floor,bay,entrance,balcony,variation,blindBay});
    }
  }
  return points;
}
function roofGeometry(THREE,width,length,eave,rise,overhang,hip,centreZ=0){
  const X=length/2+overhang,Z=width/2+overhang,R=X-hip,H=eave+rise;
  // Two long trapezoids and two pitched hip-end triangles.
  const v=[
    // south roof slope
    -X,eave,Z,  X,eave,Z,  R,H,0,   -X,eave,Z, R,H,0, -R,H,0,
    // north roof slope
    X,eave,-Z, -X,eave,-Z, -R,H,0,  X,eave,-Z,-R,H,0,R,H,0,
    // left hip
    -X,eave,-Z,-X,eave,Z,-R,H,0,
    // right hip
    X,eave,Z,X,eave,-Z,R,H,0
  ];
  // Keep street-facing eave at +6.4 while extending the opposite facade.
  for(let i=2;i<v.length;i+=3)v[i]+=centreZ;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(v,3));
  geo.computeVertexNormals();
  return geo;
}
export function buildApartmentHouse(THREE,config={}){
  const C={...BUILDING,...config}, root=new THREE.Group();
  root.name="3.2 | first apartment house | architectural facade";
  const rand=deterministic(), shellTop=C.firstFloor+C.floors*C.floorHeight;
  const roofTop=shellTop+C.roofRise, wallDepth=.32;
  const facadeZ=side=>side===1?C.frontFacade:C.backFacade;
  const centreZ=(C.frontFacade+C.backFacade)/2;
  const floorLevel=floor=>C.firstFloor+floor*C.floorHeight;
  const bandStart=floor=>floor===0?C.plinth:floorLevel(floor);
  const bandEnd=floor=>floorLevel(floor+1);
  const sillOffset=.64,regularWindowHeight=1.46;
  const mats={
    brick:new THREE.MeshStandardMaterial({color:0x977f78,roughness:.96}),
    endBrick:new THREE.MeshStandardMaterial({color:0x92766e,roughness:.96}),
    reveal:new THREE.MeshStandardMaterial({color:0x9f8880,roughness:.97}),
    plinth:new THREE.MeshStandardMaterial({color:0x4d4140,roughness:.98}),
    roof:new THREE.MeshStandardMaterial({color:0x454c50,roughness:.91,side:THREE.DoubleSide}),
    roofEdge:new THREE.MeshStandardMaterial({color:0x55585a,roughness:.94}),
    frame:new THREE.MeshStandardMaterial({color:0xb9b6aa,roughness:.84}),
    frameWhite:new THREE.MeshStandardMaterial({color:0xd7d4c9,roughness:.84}),
    frameGrey:new THREE.MeshStandardMaterial({color:0x7f8989,roughness:.84}),
    sash:new THREE.MeshStandardMaterial({color:0x909895,roughness:.85}),
    glass:new THREE.MeshStandardMaterial({color:0x384b57,roughness:.38,metalness:.14}),
    litGlass:new THREE.MeshStandardMaterial({color:0xc3a37b,roughness:.55,emissive:0xb57a43,emissiveIntensity:.38}),
    balcony:new THREE.MeshStandardMaterial({color:0x888889,roughness:.97}),
    balconyMetal:new THREE.MeshStandardMaterial({color:0x646f72,roughness:.86}),
    balconyGlass:new THREE.MeshStandardMaterial({color:0x80989c,roughness:.43,metalness:.10}),
    balconyPanel:new THREE.MeshStandardMaterial({color:0x898c83,roughness:.96}),
    balconyPanelBlue:new THREE.MeshStandardMaterial({color:0x74878a,roughness:.95}),
    balconyPanelTan:new THREE.MeshStandardMaterial({color:0x9d8a77,roughness:.96}),
    entry:new THREE.MeshStandardMaterial({color:0x444f53,roughness:.83}),
    entryBlue:new THREE.MeshStandardMaterial({color:0x4b6975,roughness:.84}),
    entryBrown:new THREE.MeshStandardMaterial({color:0x64554e,roughness:.85}),
    canopy:new THREE.MeshStandardMaterial({color:0x555457,roughness:.98}),
    chimney:new THREE.MeshStandardMaterial({color:0x795e57,roughness:1}),
    foundation:new THREE.MeshStandardMaterial({color:0x87847c,roughness:.98}),
    entryPad:new THREE.MeshStandardMaterial({color:0x898780,roughness:.98}),
    entryRamp:new THREE.MeshStandardMaterial({color:0x91918a,roughness:.96}),
    foyerPaint:new THREE.MeshStandardMaterial({color:0xd0c9b1,roughness:.99}),
    foyerLower:new THREE.MeshStandardMaterial({color:0x76978d,roughness:.98}),
    foyerTile:new THREE.MeshStandardMaterial({color:0x9b9b94,roughness:.96}),
    foyerTileAlt:new THREE.MeshStandardMaterial({color:0xaaa9a0,roughness:.96}),
    foyerRubber:new THREE.MeshStandardMaterial({color:0x4a5050,roughness:1}),
    foyerMailbox:new THREE.MeshStandardMaterial({color:0x7b8584,roughness:.72,metalness:.22}),
    foyerDoor:new THREE.MeshStandardMaterial({color:0x777e79,roughness:.74}),
    foyerWindowGlass:new THREE.MeshStandardMaterial({
      color:0xc9e4e7,roughness:.12,metalness:0,
      transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide
    }),
    vent:new THREE.MeshStandardMaterial({color:0x9ca3a1,roughness:.83}),
    ventDark:new THREE.MeshStandardMaterial({color:0x4b5656,roughness:.88})
  };
  const cube=new THREE.BoxGeometry(1,1,1), dummy=new THREE.Object3D();
  let playableDoor=null,foyerDoor=null;
  const batches=new Map();
  const stats={windows:0,litWindows:0,balconies:0,entrances:0,chimneys:0,
    instancedElements:0,windowHoles:0,doorHoles:0,downpipes:0,airConditioners:0,
    balconyKinds:{A:0,B:0,C:0,D:0}};
  const audit={holes:[],wallPieces:[],windowGlazing:[],windowTypes:new Set(),doorPositions:[],
    entryPads:[],downpipePositions:[],balconyPositions:[],stairwellWindows:[],
    alignedFloors:Array.from({length:C.floors},(_,i)=>floorLevel(i)),
    facadeEnds:{front:C.frontFacade,back:C.backFacade},
    originalFootprint:{length:C.length,width:C.width}};
  function box(w,h,d,material,x,y,z,rx=0,ry=0,rz=0){
    if(w<=0||h<=0||d<=0)throw Error("Invalid architectural box dimensions");
    let transforms=batches.get(material);
    if(!transforms){transforms=[];batches.set(material,transforms);}
    dummy.position.set(x,y,z);
    dummy.rotation.set(rx,ry,rz);
    dummy.scale.set(w,h,d);
    dummy.updateMatrix();
    transforms.push(dummy.matrix.clone());
    stats.instancedElements++;
  }
  // The wall is assembled from solid strips AROUND each void. There is no
  // continuous exterior facade mesh behind windows or entrance doors.
  // Axis "long": horizontal = X, depth = Z. Axis "end": horizontal = Z, depth = X.
  function wallBox(axis,uWidth,h,depth,mat,u,y,normal){
    if(axis==="long")box(uWidth,h,depth,mat,u,y,normal);
    else box(depth,h,uWidth,mat,normal,y,u);
  }
  function wallStrip(axis,side,u0,u1,y0,y1,material){
    if(u1-u0<.00001||y1-y0<.00001)return;
    const normal=axis==="long"?facadeZ(side)-side*wallDepth/2:
      side*(C.length/2-wallDepth/2);
    wallBox(axis,u1-u0,y1-y0,wallDepth,material,(u0+u1)/2,(y0+y1)/2,normal);
    audit.wallPieces.push({axis,side,u0,u1,y0,y1,depth:wallDepth});
  }
  function punch(axis,side,u0,u1,y0,y1,centre,openingWidth,bottom,height,material,kind){
    const left=centre-openingWidth/2,right=centre+openingWidth/2,top=bottom+height;
    if(left<=u0||right>=u1||bottom<=y0||top>=y1)
      throw Error("Opening intersects module edge: "+kind);
    wallStrip(axis,side,u0,left,y0,y1,material);
    wallStrip(axis,side,right,u1,y0,y1,material);
    wallStrip(axis,side,left,right,y0,bottom,material);
    wallStrip(axis,side,left,right,top,y1,material);
    audit.holes.push({axis,side,centre,width:openingWidth,bottom,top,kind});
    if(kind==="door")stats.doorHoles++;else stats.windowHoles++;
    // Thin inner reveal lining follows the solid jamb, lintel and sill,
    // rather than spanning the opening as a fake black rectangle.
    const recess=axis==="long"?facadeZ(side)-side*.09:
      side*(C.length/2-.09);
    const lining=.055;
    wallBox(axis,lining,height,.17,mats.reveal,left+lining/2,(bottom+top)/2,recess);
    wallBox(axis,lining,height,.17,mats.reveal,right-lining/2,(bottom+top)/2,recess);
    wallBox(axis,openingWidth,lining,.17,mats.reveal,centre,top-lining/2,recess);
    wallBox(axis,openingWidth,lining,.17,mats.reveal,centre,bottom+lining/2,recess);
    return {axis,side,centre,width:openingWidth,bottom,top,height,kind};
  }
  function windowDetail(hole,variation,isBalcony=false,isStairWindow=false,isApartmentWindow=false){
    const {axis,side,centre,width,bottom,top,height}=hole;
    const facadeExtent=axis==="long"?Math.abs(facadeZ(side)):C.length/2;
    const glassZ=axis==="long"?facadeZ(side)-side*.235:side*(facadeExtent-.235);
    const frameZ=axis==="long"?facadeZ(side)-side*.17:side*(facadeExtent-.17);
    const sillZ=axis==="long"?facadeZ(side)+side*.095:side*(facadeExtent+.095);
    const frameMat=[mats.frame,mats.frameWhite,mats.frameGrey][variation%3];
    // Apartment flats that can be entered have genuine transparent glass,
    // same physically clear material already used in the stairwell windows.
    const glassMat=(isStairWindow||isApartmentWindow)?mats.foyerWindowGlass:
      (variation%5===0||variation%7===3)?mats.litGlass:mats.glass;
    const depth=frameZ;
    const innerW=width-.16,innerH=height-.17,centreY=(bottom+top)/2;
    // A single opaque glazed surface is INSIDE the perforated wall, not on it.
    wallBox(axis,innerW,innerH,.045,glassMat,centre,centreY,glassZ);
    for(const edge of [-1,1]){
      wallBox(axis,.075,height-.07,.11,frameMat,centre+edge*(width/2-.082),
        centreY,depth);
      wallBox(axis,width-.10,.075,.11,frameMat,centre,centreY+edge*(height/2-.08),depth);
    }
    const variant=variation%4;
    audit.windowTypes.add(variant);
    if(variant===0||isBalcony){
      wallBox(axis,.075,innerH,.11,frameMat,centre+.06,centreY,depth);
    }else if(variant===1){
      for(const fraction of [-1/6,1/6])
        wallBox(axis,.066,innerH,.105,frameMat,centre+innerW*fraction,centreY,depth);
    }else if(variant===2){
      wallBox(axis,.078,innerH,.11,frameMat,centre-innerW*.16,centreY,depth);
      wallBox(axis,innerW,.065,.105,mats.sash,centre,top-.39,depth);
    }else{
      wallBox(axis,.070,innerH,.11,frameMat,centre,centreY,depth);
      wallBox(axis,innerW,.060,.105,frameMat,centre,top-.43,depth);
    }
    // Exterior projecting window sill crosses the wall edge, not the void.
    wallBox(axis,width+.21,.07,.43,mats.foundation,centre,bottom-.055,
      sillZ);
    stats.windows++;
    if(glassMat===mats.litGlass)stats.litWindows++;
    audit.windowGlazing.push({axis,side,opening:hole,variant,
      frontDepth:facadeExtent-.17,glassDepth:facadeExtent-.235});
    if(isStairWindow)audit.stairwellWindows.push({
      floor:Math.round((bottom-(.70+1.39+2.42/2+.80))/2.42)+1,
      centreX:centre,bottom,top,width,wallZ:axis==="long"?facadeZ(side)-side*.16:side*(facadeExtent-.16),
      through:true,transparent:glassMat.transparent===true,type:"facade-bay"
    });
  }
  function entranceDetail(hole,index){
    const x=hole.centre,side=1,face=C.frontFacade;
    const doorMat=[mats.entryBlue,mats.entry,mats.entryBrown,mats.entryBlue][index];
    const centreY=(hole.bottom+hole.top)/2;
    // Door is set back from the wall face by 0.16m, bounded by the cutout.
    // Entrance 1 is a real swinging door. Other three entrances keep their
    // approved appearance and locked collision until their own build stages.
    if(index!==0)box(hole.width-.18,hole.height-.15,.065,doorMat,x,centreY,face-.19);
    box(.075,hole.height-.09,.15,mats.frameGrey,x-hole.width/2+.09,centreY,face-.145);
    box(.075,hole.height-.09,.15,mats.frameGrey,x+hole.width/2-.09,centreY,face-.145);
    box(hole.width-.13,.075,.14,mats.frameGrey,x,hole.top-.10,face-.145);
    box(hole.width-.17,.07,.14,mats.frameGrey,x,hole.bottom+.09,face-.145);
    if(index!==0){
      box(hole.width-.20,.34,.07,mats.glass,x,hole.top-.37,face-.155);
      box(hole.width-.23,.06,.13,mats.frameGrey,x,hole.top-.56,face-.14);
      box(.035,.20,.075,mats.vent,x+.37,centreY-.21,face-.079); // handle
    }
    box(.17,.33,.095,mats.ventDark,x+hole.width/2+.20,1.58,face+.08);
    box(.095,.04,.10,mats.vent,x+hole.width/2+.20,1.60,face+.13);
    box(.43,.24,.08,mats.frameWhite,
      x+(index===0?1.0:0),hole.top+.16,face+.055); // entrance number
    // Replace all three stair boxes with ONE level, car-sized forecourt.
    // A ~4.7 x 1.9 m car fits parallel to the front wall on this 5.5 x 3.15 m pad.
    // Its top is 20 cm below the entrance threshold; the monolithic slab
    // reaches the terrain (no suspended platform, steps or invisible supports).
    const padWidth=5.50,padDepth=3.15,padTop=hole.bottom-.20;
    const padZ=face+padDepth/2-.10;
    box(padWidth,padTop,padDepth,mats.entryPad,x,padTop/2,padZ);
    audit.entryPads.push({x,side:1,width:padWidth,depth:padDepth,
      bottom:0,top:padTop,centreZ:padZ,doorBottom:hole.bottom});
    const canopyY=3.22;
    box(2.62,.17,1.43,mats.canopy,x,canopyY,face+.59);
    box(2.67,.06,.08,mats.roofEdge,x,canopyY-.11,face+1.30);
    for(const sign of [-1,1]){
      box(.09,.10,1.00,mats.balconyMetal,x+sign*1.12,canopyY-.40,face+.46,
        -.40);
    }
    if(index===0){
      // A single continuous first-floor vestibule physically INSIDE the
      // existing house. No parallel scene, loading screen or teleport.
      // The first 1.2 m exterior ramp climbs onto the existing .50 m pad;
      // a small sloping sill then joins the +.70 m indoor floor.
      const firstRampDepth=Math.hypot(1.23,.50);
      box(1.52,.085,firstRampDepth,mats.entryRamp,x,.25,10.035,
        Math.atan2(.50,1.23));
      const sillDepth=Math.hypot(.87,.20);
      box(1.52,.075,sillDepth,mats.entryRamp,x,.60,6.665,
        Math.atan2(.20,.87));
      const floorMid=(3.35+face)/2;
      // 4.5.4.5: one OPEN, room-sized entrance from facade to stairwell.
      // No partition or second door: old +/-0.91m partitions restricted the
      // room to a corridor despite 4.36m of interior building width.
      // Side walls shift inward to cover adjoining apartment-bay windows.
      // Interior narrowing, not a change to the existing outer facade.
      const stairHalfWidth=1.84,foyerHalfWidth=1.74,depth=face-3.35;
      box(foyerHalfWidth*2,.12,depth,mats.foundation,x,.64,floorMid);
      // Paint the inner faces of the SAME shifted structural stairwell walls.
      // They hide neighbouring facade windows without another fake facade.
      for(const sign of [-1,1]){
        const px=x+sign*(stairHalfWidth-.088);
        box(.018,1.20,depth-.24,mats.foyerLower,px,1.36,floorMid);
        box(.018,1.04,depth-.24,mats.foyerPaint,px,2.46,floorMid);
        box(.039,.065,depth-.24,mats.frameWhite,px,2.01,floorMid);
        box(.045,.095,depth-.24,mats.frameWhite,px,.795,floorMid);
      }
      // 4.5.4.4: landing remains at the far/opposite end, where there
      // used to be a blank wall. All four flat doors open from that REAL
      // landing, not from a wall blocking the ascending flight.
      //
      // Reverse the U-stair slope: go from the full-floor REAR landing
      // forward along LEFT flight to front intermediate landing; turn
      // RIGHT; climb back along RIGHT flight to next full-floor rear landing.
      const rearWallZ=-4.85,rearLandingEndZ=-1.58;
      // First residential landing rises one real 12-step flight above foyer.
      // Remaining four storeys are 2.42m apart to preserve the existing
      // building roof and full-sized 2.15m apartment doors.
      const foyerFloor=.70,entryRise=1.39,baseFloor=foyerFloor+entryRise;
      const storeyRise=2.42,rise=storeyRise/2,stepsPerFlight=12;
      const halfLandingZ=2.05;
      const facadeInnerZ=C.frontFacade-wallDepth,frontZ=facadeInnerZ-.12;
      const entranceStartZ=3.35,entranceRun=entranceStartZ-rearLandingEndZ;
      const run=halfLandingZ-rearLandingEndZ,runStep=run/stepsPerFlight;
      const firstX=x-.97,secondX=x+.97;
      const flightWidth=1.58,innerGuardOffset=.79;
      const entryFlightX=secondX,entryFlightWidth=flightWidth;
      const shaftGap=2*(secondX-x)-flightWidth;
      if(shaftGap<=.25||secondX-x+flightWidth/2>=stairHalfWidth-.07)
        throw Error("Stair flight would intersect the new structural side wall");
      const wallBase=foyerFloor;
      const stairHeight=shellTop-wallBase-.08;
      if(baseFloor+(C.floors-1)*storeyRise+2.19>shellTop)
        throw Error("Apartment doors would cross existing roofline");
      // Deepened full-floor platform: enough Z length for TWO 1.04m
      // apartment doors on EACH side wall. Its END masonry is intact
      // and reserved for the electricity cabinets instead of flat doors.
      // All first-floor apartment doors and fifth-floor flat 17 are
      // REAL openings in the original side masonry and painted lining.
      const prototypeDoor={floor:5,number:17,side:-1,z:-2.42,
        bottom:baseFloor+4*storeyRise,width:1.04,height:2.15};
      const firstFloorDoors=[-1,1].flatMap(side=>
        [-2.42,-4.00].map(z=>({side,z,bottom:baseFloor,
          width:1.04,height:2.15})));
      const structuralApertures=[...firstFloorDoors,prototypeDoor];
      function solidSpans(lo,hi,holes){
        let result=[[lo,hi]];
        for(const d of holes){
          const l=d.z-d.width/2,r=d.z+d.width/2;
          result=result.flatMap(([a,b])=>[
            ...(a<l?[[a,Math.min(l,b)]]:[]),
            ...(b>r?[[Math.max(a,r),b]]:[])
          ]).filter(([a,b])=>b-a>.001);
        }
        return result;
      }
      const wallTop=wallBase+stairHeight;
      for(const side of [-1,1]){
        const wX=x+side*stairHalfWidth;
        const holes=structuralApertures.filter(d=>d.side===side);
        const cuts=[wallBase,wallTop,...holes.flatMap(d=>[d.bottom,d.bottom+d.height])]
          .sort((a,b)=>a-b);
        for(let i=0;i<cuts.length-1;i++){
          const bottom=cuts[i],top=cuts[i+1],y=(bottom+top)/2;
          if(top-bottom<.001)continue;
          const active=holes.filter(d=>y>d.bottom&&y<d.bottom+d.height);
          for(const [z0,z1] of solidSpans(rearWallZ,facadeInnerZ,active))
            box(.14,top-bottom,z1-z0,mats.reveal,wX,y,(z0+z1)/2);
          for(const [z0,z1] of solidSpans(rearWallZ+.06,facadeInnerZ-.06,active))
            box(.019,top-bottom,z1-z0,mats.foyerPaint,
              wX-side*.084,y,(z0+z1)/2);
        }
      }
      audit.firstApartmentAperture=prototypeDoor;
      audit.firstFloorApertures=firstFloorDoors;
      box(stairHalfWidth*2+.14,stairHeight,.14,mats.reveal,x,
        wallBase+stairHeight/2,rearWallZ);
      const railMat=mats.balconyMetal,railing={
        height:.94,postSpacing:run/7,balustersPerFlight:8,
        railsPerFlight:3,continuous:true,wallSideRails:0,
        innerGuardLinks:4,frontGuardLinks:4,flightWidth,shaftGap,
        fifthFloorWallConnection:true};
      // Lamps are mounted from the UNDERSIDE of real overhead slabs,
      // never at the top surface of the next apartment landing.
      // The last-floor lamp uses the underside of the existing roof.
      const ceilingFixtures=[];
      function mountCeilingLight(cx,cz,ceilingY,kind,floor,width=.37,depth=.35){
        const housingY=ceilingY-.040,glassY=ceilingY-.084;
        const housingH=.055,glassH=.037;
        if(housingY+housingH/2>=ceilingY||
          glassY+glassH/2>=housingY-housingH/2+.008)
          throw Error("Ceiling fixture must hang below the solid slab");
        box(width,housingH,depth,mats.frameWhite,cx,housingY,cz);
        box(width-.09,glassH,depth-.11,mats.litGlass,cx,glassY,cz);
        ceilingFixtures.push({kind,floor,x:cx,z:cz,
          ceilingY,housingY,glassY,housingH,glassH,
          width,depth,bottomY:glassY-glassH/2,
          belowCeiling:true});
      }
      const stairway=[];
      // FIRST staircase: 12 treads rising from the .70m foyer to +2.09m.
      const entranceTread=entranceRun/stepsPerFlight;
      for(let i=0;i<stepsPerFlight;i++){
        const tz=entranceStartZ-(i+.5)*entranceTread;
        const ty=foyerFloor+(i+1)*entryRise/stepsPerFlight;
        box(entryFlightWidth,.12,entranceTread-.014,mats.foyerTileAlt,
          entryFlightX,ty-.06,tz);
        box(entryFlightWidth,.06,entranceTread-.014,mats.foyerTile,
          entryFlightX,ty-.03,tz);
      }
      // Only the INNER edge of the entrance stairs is exposed; the right
      // edge runs beside a real side wall. No wall-side duplicate railing.
      const entryGuardX=entryFlightX-entryFlightWidth/2+.035;
      const entryGuardLen=Math.hypot(entranceRun,entryRise);
      for(const elevation of [.25,.56,.94])
        box(.075,.075,entryGuardLen,railMat,
          entryGuardX,foyerFloor+entryRise/2+elevation,
          (entranceStartZ+rearLandingEndZ)/2,
          Math.atan2(entryRise,entranceRun));
      for(let i=0;i<=9;i++){
        const t=i/9;
        box(.065,.94,.065,railMat,entryGuardX,
          foyerFloor+entryRise*t+.47,entranceStartZ-t*entranceRun);
      }
      function slantedRail(cx,cy,cz,len,angle,height,mat=railMat){
        box(.075,.075,len,mat,cx,cy+height,cz,angle);
      }
      for(let floor=0;floor<C.floors;floor++){
        const level=baseFloor+floor*storeyRise;
        // Full-floor rear landing: all FOUR apartment doors are here.
        // It is the same 1.8 m deep place on every storey.
        box(stairHalfWidth*2-.18,.16,
          rearLandingEndZ-rearWallZ-.10,mats.foyerTileAlt,
          x,level-.08,(rearLandingEndZ+rearWallZ)/2);
        // Ceiling here is the UNDERSIDE of the next floor slab;
        // fifth floor is capped by the existing roof, not another floor.
        const rearCeilingY=floor<C.floors-1?
          level+storeyRise-.16:shellTop-.16;
        mountCeilingLight(x,rearWallZ+.70,rearCeilingY,
          "apartment-landing",floor+1);
        if(floor===C.floors-1)continue;
        // With the first apartment floor moved to 2.09m, its half-turn
        // is at 3.30m: clearance above the .70m foyer is now 2.44m.
        // All returns may reach the existing facade without obstruction.
        const turnEndZ=frontZ;
        box(stairHalfWidth*2-.18,.16,turnEndZ-halfLandingZ,
          mats.foyerTileAlt,x,level+rise-.08,
          (turnEndZ+halfLandingZ)/2);
        for(let i=0;i<stepsPerFlight;i++){
          const zL=rearLandingEndZ+(i+.5)*runStep;
          const zR=halfLandingZ-(i+.5)*runStep;
          const yL=level+(i+1)*rise/stepsPerFlight;
          const yR=level+rise+(i+1)*rise/stepsPerFlight;
          for(const [cx,cz,y] of [[firstX,zL,yL],[secondX,zR,yR]]){
            box(flightWidth,.120,runStep-.012,mats.foyerTileAlt,cx,y-.060,cz);
            box(flightWidth,.060,runStep-.012,mats.foyerTile,cx,y-.030,cz);
          }
        }
        // Continuous sloped handrails, flat return rails and properly
        // spaced vertical balusters at both INNER and OUTER flight sides.
        // No unsupported long sticks leaning through treads.
        const diagonal=Math.hypot(run,rise);
        for(const [side,cx,angle,bottom] of [
          [-1,firstX,-Math.atan2(rise,run),level],
          [1,secondX,Math.atan2(rise,run),level+rise]
        ]){
          for(const railX of [cx-side*innerGuardOffset]){
            const centreY=bottom+rise/2;
            for(const elevation of [.25,.56,.94])
              slantedRail(railX,centreY,(rearLandingEndZ+halfLandingZ)/2,
                diagonal,angle,elevation);
            for(let i=0;i<=7;i++){
              const t=i/7,z=side<0?
                rearLandingEndZ+t*run:halfLandingZ-t*run;
              const foot=bottom+t*rise;
              box(.065,.94,.065,railMat,railX,foot+.47,z);
              box(.095,.045,.095,mats.frameGrey,railX,foot+.91,z);
            }
          }
        }
        // Physically connect the left/right inner rails at EVERY front
        // window-facing turn, across the open central stairwell edge.
        const frontGuardWidth=2*(firstX+innerGuardOffset-x)*-1;
        const frontGuardZ=halfLandingZ-.045;
        for(const h of [.25,.56,.94])
          box(frontGuardWidth,.075,.075,railMat,
            x,level+rise+h,frontGuardZ);
        for(const off of [-frontGuardWidth/2,0,frontGuardWidth/2])
          box(.065,.94,.065,railMat,x+off,
            level+rise+.47,frontGuardZ);
        // At each rear FULL-FLOOR landing, keep a guard facing the shaft.
        // Floor 1 is left accessible to the incoming right-hand stairs.
        if(floor>0){
          box(frontGuardWidth,.08,.075,railMat,
            x,level+.94,rearLandingEndZ+.02);
          for(const off of [-frontGuardWidth/2,0,frontGuardWidth/2])
            box(.065,.94,.065,railMat,x+off,
              level+.47,rearLandingEndZ+.02);
        }
        stairway.push({fromFloor:floor+1,toFloor:floor+2,
          bottom:level,mid:level+rise,top:level+storeyRise,
          steps:stepsPerFlight*2,returnEndZ:turnEndZ});
      }
      // Stage 4.5.4.8: a rotated BOX is not a true sloping wall
      // paint band. The diagonally rotated cuboid leaves triangular
      // unpainted holes between the stairs, flat return and next level.
      // Use exact world-space wall polygons whose TOP and BOTTOM each
      // follow the flight line. Combine every flight into just ONE green
      // geometry and ONE white-trim geometry (2 small draw calls).
      const slopeGreen=[],slopeTrim=[];
      function wallQuad(target,wallX,z0,z1,height0,height1,low,height){
        const y0=height0+low,y1=height1+low;
        // Two triangles with a continuous sloping boundary (not a tilted box).
        target.push(
          wallX,y0,z0,wallX,y0+height,z0,wallX,y1+height,z1,
          wallX,y0,z0,wallX,y1+height,z1,wallX,y1,z1
        );
      }
      for(let f=0;f<C.floors-1;f++){
        const y=baseFloor+f*storeyRise;
        for(const [side,y0,y1] of [
          [-1,y,y+rise],
          [ 1,y+2*rise,y+rise]
        ]){
          const wx=x+side*(stairHalfWidth-.114);
          wallQuad(slopeGreen,wx,rearLandingEndZ,halfLandingZ,
            y0,y1,-.15,1.33);
          wallQuad(slopeTrim,wx-side*.005,rearLandingEndZ,halfLandingZ,
            y0,y1,1.15,.045);
        }
        // Horizontal front turn is exactly flush with the end of the
        // sloping polygon. No 4cm unpainted termination at the joint.
        for(const side of [-1,1]){
          const wx=x+side*(stairHalfWidth-.114);
          const length=frontZ-halfLandingZ;
          const z=(frontZ+halfLandingZ)/2;
          box(.025,1.18,length,mats.foyerLower,wx,y+rise+.59,z);
          box(.032,.045,length,mats.frameWhite,wx,y+rise+1.1725,z);
        }
      }
      function flushWallFaces(vertices,material){
        if(vertices.length===0)return;
        const geo=new THREE.BufferGeometry();
        geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
        geo.computeVertexNormals();
        const panel=new THREE.Mesh(geo,material);
        panel.receiveShadow=true;
        root.add(panel);
      }
      // Existing green and white materials serve both instanced boxes
      // and these joined planar triangles; no new shader/material batch.
      mats.foyerLower.side=THREE.DoubleSide;
      mats.frameWhite.side=THREE.DoubleSide;
      flushWallFaces(slopeGreen,mats.foyerLower);
      flushWallFaces(slopeTrim,mats.frameWhite);
      audit.slopedWallFinish={
        bands:(C.floors-1)*2,triangles:slopeGreen.length/9,
        trimTriangles:slopeTrim.length/9,
        noTiltedBoxes:true,joinedToFlatLandings:true,
        firstFlight:{z0:rearLandingEndZ,z1:halfLandingZ,
          startY:baseFloor,endY:baseFloor+rise},
        sharedMaterial:true
      };
      // On the FIFTH floor continue the end-of-shaft handrail all the
      // way to the left solid wall. Keep the RIGHT flight's landing
      // unobstructed for the person arriving from the fourth floor.
      const topRailLeft=x-stairHalfWidth+.12;
      const topRailRight=secondX-innerGuardOffset;
      const topRailWidth=topRailRight-topRailLeft;
      const topRailCentre=(topRailLeft+topRailRight)/2;
      const topRailY=baseFloor+4*storeyRise;
      for(const h of [.25,.56,.94])
        box(topRailWidth,.075,.075,railMat,topRailCentre,
          topRailY+h,rearLandingEndZ+.02);
      for(let k=0;k<=4;k++)
        box(.065,.94,.065,railMat,topRailLeft+topRailWidth*k/4,
          topRailY+.47,rearLandingEndZ+.02);
      // Four doors, now exactly TWO on EACH side wall, with a deep
      // turning/approach area. NO apartment door is mounted on the end.
      const apartments=[],doorWidth=1.04,sideDoorWidth=1.04;
      const sideDoorPositions=[-2.42,-4.00];
      const electricPanels=[];
      const numeralSegments={
        0:"abcfed",1:"bc",2:"abged",3:"abgcd",4:"fgbc",
        5:"afgcd",6:"afgecd",7:"abc",8:"abcdefg",9:"abcdfg"
      };
      function numberOnDoor(n,atX,atY,atZ,orientation){
        const chars=String(n).split("");
        const segments={
          a:[0,.043,.063,.011],b:[.036,.020,.012,.041],
          c:[.036,-.024,.012,.041],d:[0,-.047,.063,.011],
          e:[-.036,-.024,.012,.041],f:[-.036,.020,.012,.041],
          g:[0,-.002,.063,.011]
        };
        const width=.095,total=chars.length*width;
        const side=orientation==="left"?1:orientation==="right"?-1:0;
        const angle=side?Math.PI/2:0;
        box(total+.06,.145,.018,mats.frameWhite,
          atX+(side?side*.018:0),atY,atZ+(side?0:.022),0,angle);
        for(let i=0;i<chars.length;i++)for(const symbol of numeralSegments[chars[i]]){
          const [dx,dy,sw,sh]=segments[symbol];
          const off=(i-(chars.length-1)/2)*width+dx;
          box(sw,sh,.023,mats.ventDark,
            atX+(side?side*.036:off),atY+dy,
            atZ+(side?off:.043),0,angle);
        }
      }
      const apartmentPalette=[mats.frameGrey,mats.entryBrown,
        mats.entryBlue,mats.entry];
      for(let floor=0;floor<C.floors;floor++){
        const level=baseFloor+floor*storeyRise;
        // Green/cream paint on the rear and side wall of the REAL
        // landing. Door 1/2 face forward; 3/4 sit on side walls.
        box(stairHalfWidth*2-.30,1.18,.025,mats.foyerLower,
          x,level+.59,rearWallZ+.088);
        box(stairHalfWidth*2-.30,1.28,.025,mats.foyerPaint,
          x,level+1.82,rearWallZ+.088);
        box(stairHalfWidth*2-.30,.052,.036,mats.frameWhite,
          x,level+1.18,rearWallZ+.10);
        for(const sign of [-1,1]){
          const wallX=x+sign*(stairHalfWidth-.09);
          const holes=structuralApertures.filter(d=>
            d.side===sign&&d.bottom===level);
          for(const [z0,z1] of solidSpans(rearWallZ,rearLandingEndZ,holes)){
            const depth=z1-z0,midZ=(z0+z1)/2;
            box(.025,1.20,depth,mats.foyerLower,wallX,level+.60,midZ);
            box(.025,1.20,depth,mats.foyerPaint,wallX,level+1.80,midZ);
            box(.030,.045,depth,mats.frameWhite,wallX,level+1.20,midZ);
          }
          for(const hole of holes){
            const remaining=2.40-hole.height;
            if(remaining>.01)
              box(.025,remaining,hole.width,mats.foyerPaint,
                wallX,level+hole.height+remaining/2,hole.z);
          }
        }
        for(let local=0;local<4;local++){
          const number=floor*4+local+1;
          const side=local<2?-1:1;
          const sidePosition=sideDoorPositions[local%2];
          const doorX=x+side*(stairHalfWidth-.11),doorZ=sidePosition;
          const orientation=side<0?"left":"right";
          const yaw=Math.PI/2;
          if(number!==17&&floor!==0){
            box(sideDoorWidth,2.15,.09,mats.frameWhite,
              doorX,level+1.10,doorZ,0,yaw);
            box(sideDoorWidth-.10,2.04,.10,apartmentPalette[local],
              doorX,level+1.095,doorZ,0,yaw);
            box(.034,.13,.075,mats.vent,
              doorX+(side<0?.085:-.085),level+1.02,doorZ+.22,0,yaw);
            numberOnDoor(number,doorX+(side<0?.100:-.100),
              level+1.90,doorZ,orientation);
          } // No.17 is an ACTUAL hinged door in apartment.js.
          apartments.push({number,floor:floor+1,entrance:1,
            x:doorX,z:doorZ,orientation,side,
            width:sideDoorWidth,zone:"rear-stair-landing",
            accessible:number===17||floor===0});
        }
        // Electricity distribution and four apartment meters on the
        // now-doorless END wall. Shallow wall-mounted metal cabinets.
        const panelZ=rearWallZ+.17,panelY=level+1.43;
        box(1.43,1.03,.105,mats.foyerMailbox,x,panelY,panelZ);
        box(1.35,.93,.018,mats.frameGrey,x,panelY,panelZ+.062);
        for(let meter=0;meter<4;meter++){
          const mx=x+(meter-1.5)*.31;
          box(.255,.37,.022,mats.frameWhite,
            mx,panelY+.13,panelZ+.076);
          box(.17,.09,.025,mats.ventDark,
            mx,panelY+.22,panelZ+.091);
          box(.17,.025,.026,mats.frameGrey,
            mx,panelY-.01,panelZ+.095);
        }
        box(1.21,.035,.029,mats.ventDark,
          x,panelY-.37,panelZ+.087);
        electricPanels.push({floor:floor+1,centreX:x,
          y:panelY,z:panelZ,meters:4,width:1.43});
      }
      // A single continuous, low-poly heating RISER beside the +Z
      // stairwell windows. The 4 real cast-iron radiators sit BELOW
      // four intermediate landing windows; the riser runs the full cage.
      // Mesh boxes form an octagonal-looking pipe, batched per material.
      const radiatorRiser={x:x+1.45,z:facadeInnerZ-.19,
        bottom:.76,top:shellTop-.22};
      const pipeY=(radiatorRiser.bottom+radiatorRiser.top)/2;
      const pipeH=radiatorRiser.top-radiatorRiser.bottom;
      box(.064,pipeH,.064,mats.frameGrey,
        radiatorRiser.x,pipeY,radiatorRiser.z);
      box(.047,pipeH,.076,mats.frameGrey,
        radiatorRiser.x,pipeY,radiatorRiser.z,0,Math.PI/4);
      const radiators=[];
      for(let i=0;i<C.floors-1;i++){
        const landingY=baseFloor+i*storeyRise+rise;
        const radY=landingY+.40;
        const radZ=facadeInnerZ-.17;
        // Backplate, two horizontal manifolds, 10 heat-dissipating ribs.
        box(1.24,.56,.055,mats.frameWhite,x,radY,radZ+.038);
        for(const dy of [-.23,.23])
          box(1.32,.065,.10,mats.frameGrey,x,radY+dy,radZ-.055);
        for(let j=0;j<10;j++){
          const rx=x+(j-4.5)*.115;
          box(.083,.53,.12,mats.frameWhite,rx,radY,radZ-.08);
          box(.035,.41,.126,mats.foyerMailbox,rx,radY,radZ-.115);
        }
        // Two small supply/return tubes to the vertical wall riser.
        for(const dy of [-.19,.19]){
          const connectorLength=radiatorRiser.x-(x+.62);
          box(connectorLength,.055,.055,mats.frameGrey,
            x+.62+connectorLength/2,radY+dy,radZ-.13);
        }
        radiators.push({floorFrom:i+1,floorTo:i+2,
          landingY,x,y:radY,z:radZ,width:1.32,height:.59,
          windowSillY:landingY+.80,clearance:.80-.695});
      }
      audit.heating={riser:radiatorRiser,radiators,
        windowWallZ:facadeInnerZ,instanced:true};
      audit.firstStaircase={
        firstX,secondX,bottomZ:rearLandingEndZ,turnZ:halfLandingZ,
        backZ:rearWallZ,stepsPerFlight,stairwellWidth:stairHalfWidth*2,
        storeyHeight:storeyRise,halfLandingHeight:baseFloor+rise,
        secondFloorHeight:baseFloor+2*rise,stairFlights:2,
        entryFlight:{bottom:foyerFloor,top:baseFloor,
          steps:stepsPerFlight,minZ:rearLandingEndZ,maxZ:entranceStartZ,
          width:entryFlightWidth,centreX:entryFlightX,guardX:entryGuardX}
      };
      audit.completeStaircase={
        floors:C.floors,flights:(C.floors-1)*2+1,
        treads:((C.floors-1)*2+1)*stepsPerFlight,
        firstFloor:baseFloor,storeyRise,foyerFloor,
        levels:stairway,apartmentDoors:apartments,
        landing:{centreX:x,minX:x-stairHalfWidth,maxX:x+stairHalfWidth,
          minZ:rearWallZ,maxZ:rearLandingEndZ,doorsPerFloor:4,
          depth:rearLandingEndZ-rearWallZ,doorWidth,sideDoorWidth,
          leftDoorsPerFloor:2,rightDoorsPerFloor:2,endDoorsPerFloor:0,
          sideDoorPositions},
        electricPanels,
        fifthFloorRail:{left:topRailLeft,right:topRailRight,
          centre:topRailCentre,width:topRailWidth,
          z:rearLandingEndZ+.02,height:topRailY,openRightFlight:true},
        opposite:{firstTurnEndZ:frontZ,upperTurnEndZ:frontZ,
          facadeInnerZ,facadeOuterZ:C.frontFacade,
          upperTurnDepth:frontZ-halfLandingZ,
          openCentreFloors:[1,2,3,4,5],firstTurnClearsFoyer:true},
        railing,
        liftCount:0
      };
      // Removed former full-width y=3.41 foyer ceiling slab: it occluded
      // the vertical stair void / first transom and was not load-bearing.
      // Individual stone slabs with tiny grouted gaps, batched by only
      // two materials to preserve mobile draw-call and memory budgets.
      let tiles=0;
      for(let i=0;i<10;i++){
        for(let j=0;j<8;j++){
          const floorX=x+(i-4.5)*.405;
          const floorZ=3.56+j*.365;
          box(.395,.014,.355,
            (i+j)%2?mats.foyerTile:mats.foyerTileAlt,
            floorX,.710,floorZ);
          tiles++;
        }
      }
      // Anti-slip mat immediately behind the street door.
      box(1.18,.016,.50,mats.foyerRubber,x,.72,5.69);
      for(let i=-3;i<=3;i++)
        box(.015,.018,.44,mats.ventDark,
          x+i*.16,.737,5.69);
      // No second door, door frame, pivot, or opaque wall here.
      // The player sees and walks straight into the enlarged foyer.
      // The 20 existing mailboxes now sit on the RIGHT masonry wall of
      // the FRONT half-landing between apartment floors 1 and 2 (Y=3.30).
      // No boxes are left in the ground-floor vestibule.
      const mailboxLevel=baseFloor+rise,mailboxWallX=x+stairHalfWidth;
      const mailboxSize={depth:.10,height:.210,width:.19};
      let mailboxes=0;
      for(let row=0;row<4;row++)for(let col=0;col<5;col++){
        const bz=3.58+col*.220,by=mailboxLevel+.47+row*.21;
        const frontX=mailboxWallX-.17;
        box(mailboxSize.depth,mailboxSize.height,mailboxSize.width,
          mats.foyerMailbox,mailboxWallX-.11,by,bz);
        box(.012,.032,.12,mats.ventDark,frontX,by+.045,bz);
        box(.014,.020,.032,mats.ventDark,frontX-.002,by-.055,bz+.052);
        mailboxes++;
      }
      // The vestibule light attaches to the UNDERSIDE of the window-
      // facing intermediate landing, not its walking surface (Y=3.30).
      // There is no invented full-width foyer ceiling/solid shaft slab.
      box(.028,.46,.45,mats.ventDark,x-2.078,1.89,4.18);
      for(const offset of [-.12,.03,.16])
        box(.032,.055,.32,mats.foyerPaint,x-2.056,1.89+offset,4.18);
      mountCeilingLight(x,5.14,baseFloor+rise-.16,
        "entrance-vestibule",0,.39,.39);
      audit.ceilingFixtures=ceilingFixtures;
      audit.foyer={
        x,outerZ:face-.19,backZ:3.35,halfWidth:foyerHalfWidth,
        floorLevel:.70,tiles,mailboxes,mailboxLevel,mailboxWallX,
        doorCount:1,secondDoorRemoved:true,mailboxSize,
        upperPaint:0xd0c9b1,lowerPaint:0x76978d
      };
      // Pivot at the LEFT jamb. The door opens inward around its real
      // hinge, rotating into -Z; leaf and handle share the same pivot.
      const hinge=new THREE.Group();
      hinge.name="entrance-1-hinged-door";
      const leafWidth=hole.width-.18,leafHeight=hole.height-.15;
      hinge.position.set(x-leafWidth/2,hole.bottom+.075,face-.19);
      function leafBox(w,h,d,mat,px,py,pz){
        const mesh=new THREE.Mesh(cube,mat);
        mesh.scale.set(w,h,d);mesh.position.set(px,py,pz);
        mesh.castShadow=true;mesh.receiveShadow=true;
        hinge.add(mesh);return mesh;
      }
      leafBox(leafWidth,leafHeight,.075,doorMat,
        leafWidth/2,leafHeight/2,0);
      leafBox(leafWidth-.15,.33,.079,mats.glass,
        leafWidth/2,leafHeight-.37,.045);
      leafBox(leafWidth-.08,.055,.10,mats.frameGrey,
        leafWidth/2,leafHeight-.63,.052);
      leafBox(.045,.20,.10,mats.vent,
        leafWidth-.25,leafHeight*.45,.07);
      root.add(hinge);playableDoor=hinge;
      audit.playableEntrance={
        x,face,doorZ:face-.19,doorWidth:leafWidth,
        threshold:hole.bottom,vestibuleBack:3.35
      };
    }
    stats.entrances++;audit.doorPositions.push(x);
  }
  function balconyDetail(w){
    const x=w.x,side=w.side,face=Math.abs(facadeZ(side));
    const kind=["A","B","C","D"][w.variation%4];
    stats.balconyKinds[kind]++;stats.balconies++;
    audit.balconyPositions.push({x,side,kind,floor:w.floor,bay:w.bay});
    const width=2.18,depth=1.14;
    const base=floorLevel(w.floor)+.45;
    const mid=side*(face+depth/2+.02),front=side*(face+depth+.02);
    box(width,.18,depth+.10,mats.balcony,x,base,mid);
    for(const dir of [-1,1]){
      // Low slab supports are distinct physical elements under the deck.
      box(.11,.12,.93,mats.balconyMetal,x+dir*.83,base-.23,
        side*(face+.48),side*-.28);
    }
    function upright(xpos,y,atZ,h=1.4,mat=mats.frame){
      box(.065,h,.075,mat,xpos,y,atZ);
    }
    if(kind==="A"){
      box(width,.08,.075,mats.balconyMetal,x,base+1.08,front);
      for(const k of [-1,-.5,0,.5,1])
        upright(x+k*(width/2-.04),base+.58,front,.98,mats.balconyMetal);
      for(const dir of [-1,1]){
        const ex=x+dir*width/2;
        box(.07,.08,depth,mats.balconyMetal,ex,base+1.08,mid);
        for(const part of [.3,.78])
          upright(ex,base+.58,side*(face+part),.98,mats.balconyMetal);
      }
      return;
    }
    // Three residential enclosure families: B glass rail, C opaque infill,
    // D mismatched household frames; each includes side returns.
    const infill=kind==="C"?
      [mats.balconyPanel,mats.balconyPanelBlue,mats.balconyPanelTan][w.variation%3]:
      kind==="D"?mats.balconyPanelTan:mats.balconyMetal;
    const lower=kind==="B"?.34:.67;
    box(width,.08,.10,mats.frameGrey,x,base+1.99,front);
    box(width,.08,.10,mats.frameGrey,x,base+.13,front);
    if(kind!=="B")box(width,lower,.09,infill,x,base+.20+lower/2,front);
    else{
      box(width,.31,.075,mats.balconyGlass,x,base+.38,front);
      box(width,.06,.09,mats.balconyMetal,x,base+.56,front);
    }
    const glassBottom=kind==="B"?base+.62:base+.20+lower;
    const glassTop=base+1.96;
    const topH=glassTop-glassBottom;
    box(width-.12,topH,.055,mats.balconyGlass,x,(glassBottom+glassTop)/2,front);
    for(const s of [-1,1])
      upright(x+s*(width/2-.06),base+1.08,front,1.85,mats.frameGrey);
    if(kind==="D"){
      // One narrow utility sash, one wide pane and a high transom.
      const xs=[x-.58,x+.25];
      for(const split of xs)upright(split,(glassBottom+glassTop)/2,front,topH,mats.frameWhite);
      box(width-.12,.06,.095,mats.frameWhite,x,glassTop-.37,front);
      box(.06,.55,.10,mats.frameWhite,x+.45,glassBottom+.29,front);
    }else if(kind==="C"){
      for(const split of [-.30,.43])
        upright(x+split,(glassBottom+glassTop)/2,front,topH,mats.frameGrey);
    }else{
      upright(x,(glassBottom+glassTop)/2,front,topH,mats.frameWhite);
      upright(x+.54,(glassBottom+glassTop)/2,front,topH,mats.frameWhite);
    }
    // Side returns close the real volume. A window block without them
    // would look like a painted facade rather than an enclosed balcony.
    for(const dir of [-1,1]){
      const ex=x+dir*(width/2-.045);
      box(.08,.07,depth,mats.frameGrey,ex,base+1.98,mid);
      if(kind!=="B")box(.07,lower,depth,infill,ex,base+.20+lower/2,mid);
      else box(.06,.34,depth,mats.balconyGlass,ex,base+.36,mid);
      box(.055,topH,depth-.11,mats.balconyGlass,ex,(glassBottom+glassTop)/2,mid);
      for(const part of [.10,.58,1.08])
        upright(ex,(glassBottom+glassTop)/2,side*(face+part),topH,mats.frameGrey);
    }
  }

  // Plinth remains a solid bearing volume BELOW every doorway and window.
  box(C.length,C.plinth,C.width+.06,mats.plinth,0,C.plinth/2,centreZ);
  for(const side of [-1,1]){
    box(C.length+.05,.10,.19,mats.foundation,0,C.plinth+.018,
      facadeZ(side)+side*.025);
  }
  const plan=planFacade(C);
  audit.firstFloorWindowHoles=[];
  const step=(C.length-3.7)/C.windowBays;
  for(const side of [-1,1]){
    // Masonry closing the strips outside the first and final window bay.
    wallStrip("long",side,-C.length/2,-C.length/2+1.85,C.plinth,shellTop,mats.brick);
    wallStrip("long",side,C.length/2-1.85,C.length/2,C.plinth,shellTop,mats.brick);
  }
  for(const w of plan){
    // The outermost former window bay on EACH edge is now solid
    // brick. Keep the footprint and all four entrances at their
    // approved coordinates: from entry #1 to the west end there are
    // bay 1 and 2; from entry #4 to the east end bay 25 and 26.
    if(w.blindBay){
      wallStrip("long",w.side,w.x-step/2,w.x+step/2,
        bandStart(w.floor),bandEnd(w.floor),mats.brick);
      continue;
    }
    // All window bays now use the same common, aligned residential levels.
    // Bay over the FIRST doorway is one continuous 5-storey stairwell.
    // Its four windows are cut separately below, at stair LANDING heights
    // instead of regular apartment-window heights, to avoid half windows.
    if(w.side===1&&w.bay===ENTRANCE_BAYS[0]&&w.floor>0)continue;
    const y0=bandStart(w.floor),y1=bandEnd(w.floor);
    const centre=w.x,side=w.side;
    const isDoor=w.entrance,balcony=w.balcony&&!isDoor;
    const openingWidth=isDoor?1.71:balcony?1.44:1.40;
    const low=isDoor?C.plinth+.04:floorLevel(w.floor)+(balcony?.15:sillOffset);
    const height=isDoor?2.28:balcony?2.20:regularWindowHeight;
    // The first entrance window sits below the old 2F boundary; trim
    // the entry-door masonry at the FIRST actual stair-window sill.
    const entryColumnTop=C.firstFloor+C.floorHeight/2+.80-.035;
    const moduleTop=isDoor&&w.bay===ENTRANCE_BAYS[0]?entryColumnTop:y1;
    const hole=punch("long",side,centre-step/2,centre+step/2,y0,moduleTop,
      centre,openingWidth,low,height,mats.brick,isDoor?"door":"window");
    if(isDoor)entranceDetail(hole,ENTRANCE_BAYS.indexOf(w.bay));
    else {
      windowDetail(hole,w.variation,balcony,false,
        w.floor===4&&w.bay===1);
      if(balcony)balconyDetail(w);
      if(w.floor===0&&[1,2,4,5].includes(w.bay))
        audit.firstFloorWindowHoles.push(hole);
    }
  }
  // First-floor apertures were punched in the common vertical grid above.
  // FIRST entrance: four full-height windows, each placed above its
  // intermediate return. One existing brick column is split into real
  // masonry piers + lintels; never overlay glass on opaque brick.
  const entryBay=plan.find(w=>w.entrance&&w.bay===ENTRANCE_BAYS[0]);
  const wx=entryBay.x,spanLeft=wx-step/2,spanRight=wx+step/2;
  const windowWidth=1.40,windowLeft=wx-windowWidth/2,
    windowRight=wx+windowWidth/2;
  const columnStart=C.firstFloor+C.floorHeight/2+.80-.035;
  wallStrip("long",1,spanLeft,windowLeft,columnStart,shellTop,mats.brick);
  wallStrip("long",1,windowRight,spanRight,columnStart,shellTop,mats.brick);
  let priorTop=columnStart;
  for(let i=0;i<C.floors-1;i++){
    const midY=.70+1.39+(i+.5)*2.42;
    const bottom=midY+.80,height=1.42,top=bottom+height;
    if(bottom<priorTop||top>=shellTop)
      throw Error("Stairwell opening overlaps previous window/roof");
    wallStrip("long",1,windowLeft,windowRight,priorTop,bottom,mats.brick);
    const hole={axis:"long",side:1,centre:wx,width:windowWidth,
      bottom,top,height,kind:"window"};
    audit.holes.push(hole);stats.windowHoles++;
    windowDetail(hole,i,false,true);
    priorTop=top;
  }
  wallStrip("long",1,windowLeft,windowRight,priorTop,shellTop,mats.brick);
  // Inside the EXISTING brick wall, add a continuous cream/green
  // plaster lining. All four window-shaped apertures are subtracted
  // from the interior paint too — NEVER cover the real transparent
  // glazing with a coloured rectangle. Existing outside brick remains.
  const innerWindowZ=C.frontFacade-wallDepth-.018;
  const innerHalfWidth=1.84;
  const firstMid=.70+1.39+2.42/2;
  const windowIntervals=Array.from({length:C.floors-1},(_,i)=>{
    const lo=firstMid+i*2.42+.80;
    return {bottom:lo,top:lo+1.42};
  });
  // Preserve the ORIGINAL operable entrance opening as well.
  const entryDoorVoid={bottom:C.plinth+.04,top:C.plinth+.04+2.28,
    halfWidth:1.71/2};
  // Paint the GREEN DADO up to the SAME 1.18m height as both side
  // walls. The green zone surrounds only the BOTTOM of each window,
  // leaving its upper sash against cream plaster. In 4.5.4.7 a band
  // restarted near the window top because it followed an apartment
  // floor modulo and restarted halfway through each window, producing
  // an inverted green strip across the top of the real glass.
  const greenBands=Array.from({length:C.floors-1},(_,i)=>{
    const landingY=firstMid+i*2.42;
    return {bottom:landingY-.12,top:landingY+1.18};
  });
  const cuts=[.70,shellTop,entryDoorVoid.top,
    ...windowIntervals.flatMap(w=>[w.bottom,w.top]),
    ...greenBands.flatMap(w=>[w.bottom,w.top])];
  const sorted=[...new Set(cuts.filter(v=>v>=.70&&v<=shellTop)
    .map(v=>Number(v.toFixed(5))))].sort((a,b)=>a-b);
  let plasterPanels=0;
  for(let j=0;j<sorted.length-1;j++){
    const y0=sorted[j],y1=sorted[j+1];
    if(y1-y0<.005)continue;
    const midY=(y0+y1)/2;
    // Never restart green near the TOP of an opening. The lower green
    // dado is aligned across the side/front wall corner at +1.18m.
    const lower=midY<1.90||
      greenBands.some(b=>midY>=b.bottom&&midY<b.top);
    const mat=lower?mats.foyerLower:mats.foyerPaint;
    const windowOpen=windowIntervals.some(w=>midY>w.bottom&&midY<w.top);
    const doorwayOpen=midY>entryDoorVoid.bottom&&midY<entryDoorVoid.top;
    const holeHalf=doorwayOpen?entryDoorVoid.halfWidth:windowOpen?.70:0;
    const ranges=holeHalf?
      [[-innerHalfWidth,-holeHalf],[holeHalf,innerHalfWidth]]:
      [[-innerHalfWidth,innerHalfWidth]];
    for(const [l,r] of ranges){
      box(r-l,y1-y0,.025,mat,wx+(l+r)/2,midY,innerWindowZ);
      plasterPanels++;
    }
  }
  // The inside-facing PAINTED WALL ends at the original masonry hole,
  // but the four perpendicular hole REVEALS were still exposed brick.
  // Cover only the real jamb, sill and lintel faces, preserving a
  // 1.29m clear opening and transparent glazing (no central infill).
  const revealDepth=.165;
  const revealMidZ=innerWindowZ+revealDepth/2;
  let finishedWindowReveals=0;
  for(const hole of windowIntervals){
    const mid=(hole.bottom+hole.top)/2;
    for(const side of [-1,1])
      box(.052,hole.top-hole.bottom,revealDepth,mats.foyerPaint,
        wx+side*(.70-.025),mid,revealMidZ);
    for(const edge of [-1,1])
      box(1.35,.052,revealDepth,mats.foyerPaint,
        wx,edge<0?hole.bottom+.025:hole.top-.025,revealMidZ);
    finishedWindowReveals++;
  }
  audit.stairwellInterior={plasterPanels,wallZ:innerWindowZ,
    windowApertures:windowIntervals,entranceAperture:entryDoorVoid,
    greenBands,finishedWindowReveals,
    painted:true,noBrickFacing:true,
    transparentWindowsUnobstructed:true};
  // Two side windows per storey. The end walls are perforated too.
  for(const side of [-1,1]){
    for(let floor=0;floor<C.floors;floor++){
      const y0=bandStart(floor),y1=bandEnd(floor);
      for(const [u0,u1,centre] of [
        [C.backFacade,centreZ,(C.backFacade+centreZ)/2],
        [centreZ,C.frontFacade,(centreZ+C.frontFacade)/2]
      ]){
        const low=floorLevel(floor)+sillOffset,height=regularWindowHeight;
        const hole=punch("end",side,u0,u1,y0,y1,
          centre,1.39,low,height,mats.endBrick,"window");
        windowDetail(hole,(floor*7+(centre>0?3:0)+(side>0?2:1))%9);
      }
    }
  }
  const roof=new THREE.Mesh(
    roofGeometry(THREE,C.width,C.length,shellTop,C.roofRise,C.roofOverhang,C.roofHip,centreZ),
    mats.roof);
  roof.name="hipped pitched roof · 4 real sloped faces";
  roof.castShadow=true;roof.receiveShadow=true;root.add(roof);
  for(const side of [-1,1]){
    box(C.length+1.0,.12,.27,mats.roofEdge,0,shellTop-.08,
      facadeZ(side)+side*(C.roofOverhang-.1));
    box(C.length+1.0,.10,.19,mats.roofEdge,0,shellTop-.29,
      facadeZ(side)+side*.14); // eave-to-wall flashing
    // Place the three middle drains on actual masonry seams BETWEEN bays.
    // Boundaries 8/14/20 touch neither balcony bays nor entrances, on
    // either facade. Fixed metre offsets previously crossed windows/balconies.
    const bayStep=(C.length-3.7)/C.windowBays;
    const safeBoundaries=[8,14,20].map(n=>Math.round(n*C.windowBays/28));
    const pipeSites=[
      {x:-C.length/2+1.45,boundary:null},
      ...safeBoundaries.map(boundary=>({
        x:-C.length/2+1.85+boundary*bayStep,boundary
      })),
      {x:C.length/2-1.45,boundary:null}
    ];
    for(const {x,boundary} of pipeSites){
      const z=facadeZ(side)+side*.145;
      audit.downpipePositions.push({x,side,boundary});
      box(.105,shellTop-.46,.11,mats.roofEdge,x,(shellTop+.46)/2,z);
      box(.18,.10,.16,mats.balconyMetal,x,.34,z+side*.03);
      for(let y=1.55;y<shellTop-.45;y+=2.25)
        box(.22,.055,.20,mats.balconyMetal,x,y,z);
      stats.downpipes++;
    }
    // Expansion / masonry joints stay at spandrels below the glazed zones.
    for(let floor=1;floor<C.floors;floor++){
      box(C.length-.10,.025,.028,mats.reveal,0,
        floorLevel(floor)+.055,facadeZ(side)+side*.017);
    }
  }
  // AC units are positioned on masonry piers, not over cut-out windows.
  for(const side of [-1,1]){
    for(const [bay,floor] of [[1,1],[8,3],[14,2],[19,4],[24,1]]){
      const w=plan.find(a=>a.side===side&&a.floor===floor&&a.bay===bay);
      if(!w||w.balcony)continue;
      const x=w.x+1.09,y=floorLevel(floor)+1.06;
      const z=facadeZ(side)+side*.32;
      box(.57,.47,.36,mats.vent,x,y,z);
      box(.44,.28,.025,mats.ventDark,x,y,z+side*.205);
      for(const off of [-.07,0,.07])
        box(.40,.020,.035,mats.vent,x,y+off,z+side*.228);
      for(const off of [-.18,.18])
        box(.065,.08,.43,mats.balconyMetal,x+off,y-.31,z-side*.05);
      box(.045,.56,.055,mats.roofEdge,x+.32,y-.25,z-side*.03);
      stats.airConditioners++;
    }
  }
  // Roof ventilation stacks still reuse the accepted silhouette.
  for(const x of [-31.5,-22,-11.5,-1.5,11.5,22,31]){
    const z=(rand()-.5)*2.8, rise=1.15+rand()*.42;
    box(.61,rise,.54,mats.chimney,x,shellTop+C.roofRise*.79+rise/2,z);
    box(.78,.17,.69,mats.roofEdge,x,shellTop+C.roofRise*.79+rise+.075,z);
    stats.chimneys++;
  }
  for(const [material,matrices] of batches){
    const mesh=new THREE.InstancedMesh(cube,material,matrices.length);
    mesh.name="instanced facade detail";
    matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  audit.windowTypes=[...audit.windowTypes].sort();
  root.userData={
    stage:"3.2",config:C,counters:stats,roofTop,windowPlan:plan,
    geometryAudit:audit,provisionalMaterials:true,facadeTextureReady:false
  };
  return {root,config:C,stats,roofTop,doorPivot:playableDoor,
    innerDoorPivot:foyerDoor};
}
