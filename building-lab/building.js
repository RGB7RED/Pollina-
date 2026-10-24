// MINI CITY · Building Lab 3.2 — real aperture geometry and inhabited facade.
// Original modular blockout based on the user's reference PHOTO; not a
// reproduction or redistribution of the commercial model pictured in it.
// World units ~= metres. No dependencies other than a THREE namespace.
export const BUILDING={
  type:"Soviet brick apartment house",
  floors:5,
  entrances:4,
  length:74,
  width:12.8,
  plinth:.66,
  floorHeight:2.78,
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
      // A real-looking uneven residential rhythm, no fully random facade.
      const balcony=(side===1?[2,6,11,16,21,25]:[4,10,16,22]).includes(bay)
        &&floor>0 && !(bay===11&&floor===2) && !(bay===22&&floor===4);
      const variation=(bay*37+floor*19+(side===1?2:5))%9;
      points.push({x,side,floor,bay,entrance,balcony,variation});
    }
  }
  return points;
}
function roofGeometry(THREE,width,length,eave,rise,overhang,hip){
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
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(v,3));
  geo.computeVertexNormals();
  return geo;
}
export function buildApartmentHouse(THREE,config={}){
  const C={...BUILDING,...config}, root=new THREE.Group();
  root.name="3.2 | first apartment house | architectural facade";
  const rand=deterministic(), shellTop=C.plinth+C.floors*C.floorHeight;
  const roofTop=shellTop+C.roofRise, wallDepth=.32;
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
    entryPads:[],downpipePositions:[],balconyPositions:[],originalFootprint:{length:C.length,width:C.width}};
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
    const normal=side*((axis==="long"?C.width:C.length)/2-wallDepth/2);
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
    const recess=side*((axis==="long"?C.width:C.length)/2-.09);
    const lining=.055;
    wallBox(axis,lining,height,.17,mats.reveal,left+lining/2,(bottom+top)/2,recess);
    wallBox(axis,lining,height,.17,mats.reveal,right-lining/2,(bottom+top)/2,recess);
    wallBox(axis,openingWidth,lining,.17,mats.reveal,centre,top-lining/2,recess);
    wallBox(axis,openingWidth,lining,.17,mats.reveal,centre,bottom+lining/2,recess);
    return {axis,side,centre,width:openingWidth,bottom,top,height,kind};
  }
  function windowDetail(hole,variation,isBalcony=false){
    const {axis,side,centre,width,bottom,top,height}=hole;
    const facadeExtent=(axis==="long"?C.width:C.length)/2;
    const frameMat=[mats.frame,mats.frameWhite,mats.frameGrey][variation%3];
    const glassMat=(variation%5===0||variation%7===3)?mats.litGlass:mats.glass;
    const depth=side*(facadeExtent-.17);
    const innerW=width-.16,innerH=height-.17,centreY=(bottom+top)/2;
    // A single opaque glazed surface is INSIDE the perforated wall, not on it.
    wallBox(axis,innerW,innerH,.045,glassMat,centre,centreY,side*(facadeExtent-.235));
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
      side*(facadeExtent+.095));
    stats.windows++;
    if(glassMat===mats.litGlass)stats.litWindows++;
    audit.windowGlazing.push({axis,side,opening:hole,frontDepth:facadeExtent-.17,
      glassDepth:facadeExtent-.235});
  }
  function entranceDetail(hole,index){
    const x=hole.centre,side=1,face=C.width/2;
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
    box(.43,.24,.08,mats.frameWhite,x,hole.top+.16,face+.055); // entrance number
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
      box(1.70,.12,face-3.35,mats.foundation,x,.64,floorMid);
      // Stage 4.5.2: real, authored Khrushchev entrance in this SAME
      // building volume. Split into a street-side vestibule and a small
      // first-floor landing, joined by a second genuinely hinged door.
      const innerZ=4.82;
      const depth=face-3.35;
      for(const off of [-.91,.91]){
        box(.14,2.59,depth,mats.reveal,x+off,2.045,floorMid);
        // Thin paint strips on the INSIDE of the structural wall:
        // mint-green lower half, warm limewash upper half.
        const inX=x+Math.sign(off)*.829;
        box(.018,1.20,depth-.24,mats.foyerLower,inX,1.36,floorMid);
        box(.018,1.22,depth-.24,mats.foyerPaint,inX,2.57,floorMid);
        box(.039,.065,depth-.24,mats.frameWhite,inX,2.01,floorMid);
        box(.045,.095,depth-.24,mats.frameWhite,inX,.795,floorMid);
      }
      // 4.5.4.2: landing is NOW at the far/opposite end, where there
      // used to be a blank wall. All four flat doors open from that REAL
      // landing, not from a wall blocking the ascending flight.
      //
      // Reverse the U-stair slope: go from the full-floor REAR landing
      // forward along LEFT flight to front intermediate landing; turn
      // RIGHT; climb back along RIGHT flight to next full-floor rear landing.
      const rearWallZ=-3.38,rearLandingEndZ=-1.58;
      const halfLandingZ=2.45,frontZ=3.28;
      const rise=C.floorHeight/2,stepsPerFlight=12;
      const run=halfLandingZ-rearLandingEndZ,runStep=run/stepsPerFlight;
      const firstX=x-1.34,secondX=x+1.34,baseFloor=.70;
      const stairHalfWidth=2.08,stairHeight=C.plinth+C.floors*C.floorHeight-.68;
      // Widened stairwell: >1.65 m deep rear FULL floor platform versus
      // previous ~0.89 m turnaround. Central continuous aisle is kept
      // between flights to reach the rear floor-1 apartment doors.
      for(const side of [-1,1]){
        const wX=x+side*stairHalfWidth;
        box(.14,stairHeight,frontZ-rearWallZ,mats.reveal,
          wX,baseFloor+stairHeight/2,(frontZ+rearWallZ)/2);
        box(.019,stairHeight-.20,frontZ-rearWallZ-.12,mats.foyerPaint,
          wX-side*.084,baseFloor+(stairHeight-.20)/2,
          (frontZ+rearWallZ)/2);
      }
      box(stairHalfWidth*2+.14,stairHeight,.14,mats.reveal,x,
        baseFloor+stairHeight/2,rearWallZ);
      const railMat=mats.balconyMetal,railing={
        height:.94,postSpacing:run/7,balustersPerFlight:8,
        railsPerFlight:3,continuous:true};
      const stairway=[];
      function slantedRail(cx,cy,cz,len,angle,height,mat=railMat){
        box(.075,.075,len,mat,cx,cy+height,cz,angle);
      }
      for(let floor=0;floor<C.floors;floor++){
        const level=baseFloor+floor*C.floorHeight;
        // Full-floor rear landing: all FOUR apartment doors are here.
        // It is the same 1.8 m deep place on every storey.
        box(stairHalfWidth*2-.18,.16,
          rearLandingEndZ-rearWallZ-.10,mats.foyerTileAlt,
          x,level-.08,(rearLandingEndZ+rearWallZ)/2);
        // Permanent central approach under every flight; 1.28 m wide.
        box(1.28,.16,frontZ-rearLandingEndZ,mats.foyerTileAlt,
          x,level-.08,(frontZ+rearLandingEndZ)/2);
        box(.37,.056,.35,mats.frameWhite,x,level+2.47,rearWallZ+.70);
        box(.28,.035,.24,mats.litGlass,x,level+2.44,rearWallZ+.70);
        if(floor===C.floors-1)continue;
        // The half-storey turnaround is now at FRONT and not the
        // apartment-door end. Headroom of the vestibule is unchanged.
        box(stairHalfWidth*2-.18,.16,frontZ-halfLandingZ,
          mats.foyerTileAlt,x,level+rise-.08,
          (frontZ+halfLandingZ)/2);
        for(let i=0;i<stepsPerFlight;i++){
          const zL=rearLandingEndZ+(i+.5)*runStep;
          const zR=halfLandingZ-(i+.5)*runStep;
          const yL=level+(i+1)*rise/stepsPerFlight;
          const yR=level+rise+(i+1)*rise/stepsPerFlight;
          for(const [cx,cz,y] of [[firstX,zL,yL],[secondX,zR,yR]]){
            box(1.15,.120,runStep-.012,mats.foyerTileAlt,cx,y-.060,cz);
            box(1.15,.060,runStep-.012,mats.foyerTile,cx,y-.030,cz);
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
          for(const railX of [cx+side*.57,cx-side*.57]){
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
        // Front half-landing guard protecting the open centre shaft.
        // A horizontal top rail connects the ascending flight rails.
        for(const z of [halfLandingZ+.20,frontZ-.15]){
          box(stairHalfWidth*2-.36,.08,.075,railMat,
            x,level+rise+.94,z);
          box(stairHalfWidth*2-.36,.056,.075,railMat,
            x,level+rise+.47,z);
          for(const px of [-1.80,-1.2,-.6,0,.6,1.2,1.80])
            box(.068,.94,.068,railMat,x+px,level+rise+.47,z);
        }
        stairway.push({fromFloor:floor+1,toFloor:floor+2,
          bottom:level,mid:level+rise,top:level+C.floorHeight,
          steps:stepsPerFlight*2});
      }
      // Four doors in the OPPOSITE rear landing: two at centre rear
      // wall, and one each on the two SIDE walls. No extra room.
      const apartments=[],doorWidth=.77,sideDoorWidth=.82;
      const doorCenters=[-.92,.92],sideDoorZ=-2.40,
        rearDoorZ=rearWallZ+.14;
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
        const level=baseFloor+floor*C.floorHeight;
        // Green/cream paint on the rear and side wall of the REAL
        // landing. Door 1/2 face forward; 3/4 sit on side walls.
        box(4.04,1.18,.025,mats.foyerLower,
          x,level+.59,rearWallZ+.088);
        box(4.04,1.28,.025,mats.foyerPaint,
          x,level+1.82,rearWallZ+.088);
        box(4.04,.052,.036,mats.frameWhite,
          x,level+1.18,rearWallZ+.10);
        for(const sign of [-1,1]){
          const wallX=x+sign*(stairHalfWidth-.09);
          box(.025,1.20,1.68,mats.foyerLower,
            wallX,level+.60,(rearWallZ+rearLandingEndZ)/2);
          box(.025,1.30,1.68,mats.foyerPaint,
            wallX,level+1.85,(rearWallZ+rearLandingEndZ)/2);
        }
        for(let local=0;local<4;local++){
          const number=floor*4+local+1,centre=local<2;
          const orientation=centre?"front":local===2?"left":"right";
          const off=centre?doorCenters[local]:
            (local===2?-stairHalfWidth+.11:stairHalfWidth-.11);
          const doorX=x+off,doorZ=centre?rearDoorZ:sideDoorZ;
          const yaw=centre?0:Math.PI/2;
          const width=centre?doorWidth:sideDoorWidth;
          box(width,2.15,.09,mats.frameWhite,
            doorX,level+1.10,doorZ,0,yaw);
          box(width-.10,2.04,.10,apartmentPalette[local],
            doorX,level+1.095,
            centre?doorZ+.065:doorZ,0,yaw);
          if(centre){
            box(.034,.13,.075,mats.vent,
              doorX+.23,level+1.02,doorZ+.15);
            numberOnDoor(number,doorX,level+1.90,doorZ+.130,orientation);
          }else{
            const sign=orientation==="left"?1:-1;
            box(.034,.13,.075,mats.vent,
              doorX+sign*.085,level+1.02,doorZ+.22,0,yaw);
            numberOnDoor(number,doorX+sign*.100,
              level+1.90,doorZ,orientation);
          }
          apartments.push({number,floor:floor+1,entrance:1,
            x:doorX,z:doorZ,orientation,zone:"rear-stair-landing",
            accessible:false});
        }
      }
      audit.firstStaircase={
        firstX,secondX,bottomZ:rearLandingEndZ,turnZ:halfLandingZ,
        backZ:rearWallZ,stepsPerFlight,stairwellWidth:stairHalfWidth*2,
        storeyHeight:C.floorHeight,halfLandingHeight:baseFloor+rise,
        secondFloorHeight:baseFloor+2*rise,stairFlights:2
      };
      audit.completeStaircase={
        floors:C.floors,flights:(C.floors-1)*2,
        treads:(C.floors-1)*stepsPerFlight*2,
        levels:stairway,apartmentDoors:apartments,
        landing:{centreX:x,minX:x-stairHalfWidth,maxX:x+stairHalfWidth,
          minZ:rearWallZ,maxZ:rearLandingEndZ,doorsPerFloor:4,
          depth:rearLandingEndZ-rearWallZ},
        railing,
        liftCount:0
      };
      box(1.96,.13,depth,mats.foundation,x,3.41,floorMid);
      // Individual stone slabs with tiny grouted gaps, batched by only
      // two materials to preserve mobile draw-call and memory budgets.
      let tiles=0;
      for(let i=0;i<4;i++){
        for(let j=0;j<8;j++){
          const floorX=x+(i-1.5)*.405;
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
      // Real inner doorway. Solid jambs and lintel leave a 1.42 m-wide
      // void below the lintel; the pivot leaf swings into the landing.
      for(const side of [-1,1]){
        box(.135,2.30,.14,mats.frameWhite,
          x+side*.777,1.86,innerZ);
      }
      box(1.69,.48,.14,mats.frameWhite,x,3.10,innerZ);
      const inner=new THREE.Group();
      inner.name="entrance-1-inner-hinged-door";
      const innerWidth=1.39,innerHeight=2.13;
      inner.position.set(x-innerWidth/2,.73,innerZ);
      function doorPart(w,h,d,mat,px,py,pz){
        const mesh=new THREE.Mesh(cube,mat);
        mesh.scale.set(w,h,d);mesh.position.set(px,py,pz);
        mesh.castShadow=true;mesh.receiveShadow=true;
        inner.add(mesh);
      }
      // REAL open window, not tinted paint drawn on a solid metal slab.
      // The metal leaf is assembled around an actual rectangular void.
      const stile=.175,glassBottom=.91,glassTop=1.97;
      doorPart(innerWidth,glassBottom,.067,mats.foyerDoor,
        innerWidth/2,glassBottom/2,0);
      doorPart(stile,glassTop-glassBottom,.067,mats.foyerDoor,
        stile/2,(glassBottom+glassTop)/2,0);
      doorPart(stile,glassTop-glassBottom,.067,mats.foyerDoor,
        innerWidth-stile/2,(glassBottom+glassTop)/2,0);
      doorPart(innerWidth,innerHeight-glassTop,.067,mats.foyerDoor,
        innerWidth/2,(innerHeight+glassTop)/2,0);
      // Transparent glazing at the opening (depthWrite off): player can
      // see the REAL first stair flight through the CLOSED inner door.
      doorPart(innerWidth-2*stile,glassTop-glassBottom,.024,
        mats.foyerWindowGlass,innerWidth/2,(glassBottom+glassTop)/2,.010);
      doorPart(innerWidth-2*stile,.043,.10,mats.frameGrey,
        innerWidth/2,glassBottom-.014,.052);
      doorPart(.045,.16,.10,mats.vent,
        innerWidth-.22,innerHeight*.44,.081);
      root.add(inner);foyerDoor=inner;
      // Twenty individual postal boxes: 5 columns x 4 rows (future
      // flats 1–20), fixed to the landing-side right wall, not hovering
      // in the character's walking corridor.
      let mailboxes=0;
      for(let row=0;row<4;row++)for(let col=0;col<5;col++){
        const bz=3.60+col*.172,by=1.21+row*.205;
        box(.075,.177,.162,mats.foyerMailbox,x+.781,by,bz);
        box(.011,.028,.10,mats.ventDark,x+.734,by+.04,bz);
        box(.013,.018,.028,mats.ventDark,x+.733,by-.042,bz+.045);
        mailboxes++;
      }
      // A small notice board and illuminated overhead fixture: no heavy
      // shadows or duplicate indoor scene are required.
      box(.028,.46,.45,mats.ventDark,x-.798,1.89,3.99);
      for(const offset of [-.12,.03,.16])
        box(.032,.055,.32,mats.foyerPaint,x-.777,1.89+offset,3.99);
      box(.39,.055,.39,mats.frameWhite,x,3.325,5.14);
      box(.30,.037,.30,mats.litGlass,x,3.290,5.14);
      audit.foyer={
        x,outerZ:face-.19,innerDoorZ:innerZ,backZ:3.35,
        floorLevel:.70,tiles,mailboxes,doorCount:2,
        secondDoorWindow:{width:innerWidth-2*stile,
          bottom:glassBottom,top:glassTop,transparent:true},
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
    const x=w.x,side=w.side,face=C.width/2;
    const kind=["A","B","C","D"][w.variation%4];
    stats.balconyKinds[kind]++;stats.balconies++;
    audit.balconyPositions.push({x,side,kind,floor:w.floor,bay:w.bay});
    const width=2.18,depth=1.14;
    const base=C.plinth+w.floor*C.floorHeight+.45;
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
  box(C.length,C.plinth,C.width+.06,mats.plinth,0,C.plinth/2,0);
  for(const side of [-1,1]){
    box(C.length+.05,.10,.19,mats.foundation,0,C.plinth+.018,
      side*(C.width/2+.025));
  }
  const plan=planFacade(C);
  const step=(C.length-3.7)/C.windowBays;
  for(const side of [-1,1]){
    // Masonry closing the strips outside the first and final window bay.
    wallStrip("long",side,-C.length/2,-C.length/2+1.85,C.plinth,shellTop,mats.brick);
    wallStrip("long",side,C.length/2-1.85,C.length/2,C.plinth,shellTop,mats.brick);
  }
  for(const w of plan){
    const y0=C.plinth+w.floor*C.floorHeight,y1=y0+C.floorHeight;
    const centre=w.x,side=w.side;
    const isDoor=w.entrance,balcony=w.balcony&&!isDoor;
    const openingWidth=isDoor?1.71:balcony?1.44:1.40;
    const low=y0+(isDoor?.04:balcony?.23:.695);
    const height=isDoor?2.28:balcony?2.20:1.59;
    const hole=punch("long",side,centre-step/2,centre+step/2,y0,y1,
      centre,openingWidth,low,height,mats.brick,isDoor?"door":"window");
    if(isDoor)entranceDetail(hole,ENTRANCE_BAYS.indexOf(w.bay));
    else {
      windowDetail(hole,w.variation,balcony);
      if(balcony)balconyDetail(w);
    }
  }
  // Two side windows per storey. The end walls are perforated too.
  for(const side of [-1,1]){
    for(let floor=0;floor<C.floors;floor++){
      const y0=C.plinth+floor*C.floorHeight;
      for(const [u0,u1,centre] of [[-C.width/2,0,-2.8],[0,C.width/2,2.8]]){
        const low=y0+.72,height=1.57;
        const hole=punch("end",side,u0,u1,y0,y0+C.floorHeight,
          centre,1.39,low,height,mats.endBrick,"window");
        windowDetail(hole,(floor*7+(centre>0?3:0)+(side>0?2:1))%9);
      }
    }
  }
  const roof=new THREE.Mesh(
    roofGeometry(THREE,C.width,C.length,shellTop,C.roofRise,C.roofOverhang,C.roofHip),
    mats.roof);
  roof.name="hipped pitched roof · 4 real sloped faces";
  roof.castShadow=true;roof.receiveShadow=true;root.add(roof);
  for(const side of [-1,1]){
    box(C.length+1.0,.12,.27,mats.roofEdge,0,shellTop-.08,
      side*(C.width/2+C.roofOverhang-.1));
    box(C.length+1.0,.10,.19,mats.roofEdge,0,shellTop-.29,
      side*(C.width/2+.14)); // eave-to-wall flashing
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
      const z=side*(C.width/2+.145);
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
        C.plinth+floor*C.floorHeight+.055,side*(C.width/2+.017));
    }
  }
  // AC units are positioned on masonry piers, not over cut-out windows.
  for(const side of [-1,1]){
    for(const [bay,floor] of [[1,1],[8,3],[14,2],[19,4],[24,1]]){
      const w=plan.find(a=>a.side===side&&a.floor===floor&&a.bay===bay);
      if(!w||w.balcony)continue;
      const x=w.x+1.09,y=C.plinth+floor*C.floorHeight+1.14;
      const z=side*(C.width/2+.32);
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
