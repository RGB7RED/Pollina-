// MINI CITY · Building Lab 3.1 — architectural geometry contract.
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
  windowBays:27,
  entranceSide:"positive Z",
};
export const STAGES=["3.1 Форма","3.2 Фасад","3.3 Материалы","3.4 Оптимизация"];
function deterministic(seed=7331){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};}
export function planFacade({length=BUILDING.length,bays=BUILDING.windowBays,floors=BUILDING.floors}={}){
  const step=(length-3.7)/bays;
  const points=[];
  for(const side of [1,-1])for(let floor=0;floor<floors;floor++){
    for(let bay=0;bay<bays;bay++){
      const x=-length/2+1.85+(bay+.5)*step;
      const entrance=side===1&&floor===0&&[3,9,16,23].includes(bay);
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
  const C={...BUILDING,...config};
  const root=new THREE.Group();
  root.name="3.1 | first apartment house | blockout";
  const rand=deterministic();
  const shellTop=C.plinth+C.floors*C.floorHeight;
  const roofTop=shellTop+C.roofRise;
  const mats={
    brick:new THREE.MeshStandardMaterial({color:0x977f78,roughness:.96}),
    endBrick:new THREE.MeshStandardMaterial({color:0x92766e,roughness:.96}),
    plinth:new THREE.MeshStandardMaterial({color:0x4d4140,roughness:.98}),
    roof:new THREE.MeshStandardMaterial({color:0x454c50,roughness:.91,side:THREE.DoubleSide}),
    roofEdge:new THREE.MeshStandardMaterial({color:0x55585a,roughness:.94}),
    frame:new THREE.MeshStandardMaterial({color:0xb9b6aa,roughness:.84}),
    sash:new THREE.MeshStandardMaterial({color:0x909895,roughness:.85}),
    glass:new THREE.MeshStandardMaterial({color:0x384b57,roughness:.38,metalness:.14}),
    litGlass:new THREE.MeshStandardMaterial({color:0xc3a37b,roughness:.55,emissive:0xb57a43,emissiveIntensity:.38}),
    balcony:new THREE.MeshStandardMaterial({color:0x888889,roughness:.97}),
    balconyMetal:new THREE.MeshStandardMaterial({color:0x646f72,roughness:.86}),
    balconyGlass:new THREE.MeshStandardMaterial({color:0x80989c,roughness:.43,metalness:.10}),
    entry:new THREE.MeshStandardMaterial({color:0x444f53,roughness:.83}),
    canopy:new THREE.MeshStandardMaterial({color:0x555457,roughness:.98}),
    chimney:new THREE.MeshStandardMaterial({color:0x795e57,roughness:1}),
    foundation:new THREE.MeshStandardMaterial({color:0x87847c,roughness:.98})
  };
  const u=new THREE.BoxGeometry(1,1,1);
  const dummy=new THREE.Object3D();
  const batches=new Map();
  const counters={windows:0,litWindows:0,balconies:0,entrances:0,chimneys:0,instancedElements:0};
  const addBox=(w,h,d,material,x,y,z)=>{
    if(!batches.has(material))batches.set(material,[]);
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);
    dummy.scale.set(w,h,d);dummy.updateMatrix();
    batches.get(material).push(dummy.matrix.clone());
    counters.instancedElements++;
  };
  function solid(w,h,d,material,x,y,z,name){
    const mesh=new THREE.Mesh(u,material);
    mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    return mesh;
  }
  // Building shell; do not pretend that painted windows are cut-out openings
  // yet. True recessed windows and cladding are separate 3.2/3.3 gates.
  solid(C.length,shellTop-C.plinth,C.width,mats.brick,0,(shellTop+C.plinth)/2,0,"main brick shell");
  solid(C.length,.66,C.width+.08,mats.plinth,0,C.plinth/2,0,"dark brick plinth");
  for(const sign of [-1,1]){
    solid(.12,shellTop-C.plinth,C.width+.06,mats.endBrick,
      sign*C.length/2,(shellTop+C.plinth)/2,0,"end wall");
  }
  const roof=new THREE.Mesh(roofGeometry(THREE,C.width,C.length,shellTop,C.roofRise,C.roofOverhang,C.roofHip),mats.roof);
  roof.name="hipped pitched roof · 4 real sloped faces";
  roof.castShadow=true;roof.receiveShadow=true;root.add(roof);
  // Eaves and straight gutters at each long facade.
  for(const side of [-1,1]){
    addBox(C.length+1.0,.12,.27,mats.roofEdge,0,shellTop-.08,
      side*(C.width/2+C.roofOverhang-.1));
    addBox(C.length+1.0,.09,.14,mats.roofEdge,0,shellTop-.31,
      side*(C.width/2+.12));
  }
  // Wall rhythm; coordinates are stable and inspectable by stage-3.2.
  const windows=planFacade(C);
  for(const w of windows){
    if(w.entrance)continue;
    const y=C.plinth+w.floor*C.floorHeight+1.48;
    const Z=w.side*(C.width/2+.095);
    const outside=w.side*(C.width/2+.15);
    const glass=(w.variation%5===0||w.variation%7===3)?mats.litGlass:mats.glass;
    addBox(1.19,1.47,.12,glass,w.x,y,Z);
    addBox(1.31,.12,.21,mats.frame,w.x,y+.77,outside);
    addBox(1.31,.12,.21,mats.frame,w.x,y-.77,outside);
    addBox(.105,1.57,.18,mats.frame,w.x-.62,y,outside);
    addBox(.105,1.57,.18,mats.frame,w.x+.62,y,outside);
    if(w.variation%3===0)addBox(.075,1.47,.16,mats.sash,w.x+.15,y,outside);
    counters.windows++;
    if(glass===mats.litGlass)counters.litWindows++;
    if(!w.balcony)continue;
    counters.balconies++;
    const balconyWidth=2.18,projection=1.07;
    const zFace=w.side*(C.width/2+projection/2+.04);
    const zRim=w.side*(C.width/2+projection+.04);
    const floorBase=C.plinth+w.floor*C.floorHeight+.49;
    addBox(balconyWidth,.17,projection+0.17,mats.balcony,
      w.x,floorBase,zFace);
    addBox(balconyWidth+.10,.09,projection+.14,mats.roofEdge,w.x,
      floorBase+.99,zFace);
    if(w.variation%4===0){ // open balcony
      addBox(balconyWidth,.11,.10,mats.balconyMetal,w.x,floorBase+.99,zRim);
      for(const k of [-1,-.5,0,.5,1]){
        addBox(.065,1.0,.065,mats.balconyMetal,w.x+k*(balconyWidth/2),floorBase+.51,zRim);
      }
    }else{  // enclosed balcony, varying glazing/filler
      addBox(balconyWidth,.51,.10,mats.balcony,w.x,floorBase+.30,zRim);
      addBox(balconyWidth,1.14,.075,
        (w.variation%3===0?mats.balconyGlass:glass),
        w.x,floorBase+1.12,zRim);
      for(const k of [-1,0,1])addBox(.07,1.2,.08,mats.frame,
        w.x+k*balconyWidth/2,floorBase+1.10,zRim);
    }
  }
  // Recessed-looking four entrances on the courtyard side; blockout only.
  const entries=[3,9,16,23];
  for(const bay of entries){
    const x=windows.find(w=>w.floor===0&&w.side===1&&w.bay===bay).x;
    const z=C.width/2+.21;
    addBox(1.93,2.25,.18,mats.entry,x,1.78,z);
    addBox(2.34,.19,1.25,mats.canopy,x,2.98,z+.53);
    addBox(2.1,.10,1.36,mats.foundation,x,.12,z+.70);
    addBox(.45,.12,.07,mats.frame,x,2.56,z+.13);
    counters.entrances++;
  }
  // End walls: 2 columns of properly-spaced windows per floor.
  for(const side of [-1,1]){
    const x=side*(C.length/2+.12);
    for(let floor=0;floor<C.floors;floor++){
      for(const z of [-2.8,2.8]){
        const y=C.plinth+floor*C.floorHeight+1.49;
        addBox(.1,1.38,1.08,mats.glass,x,y,z);
        addBox(.15,1.5,.085,mats.frame,x+side*.055,y,z-0.57);
        addBox(.15,1.5,.085,mats.frame,x+side*.055,y,z+.57);
        addBox(.15,.09,1.25,mats.frame,x+side*.055,y+.74,z);
        addBox(.15,.09,1.25,mats.frame,x+side*.055,y-.74,z);
        counters.windows++;
      }
    }
  }
  // Roof chimneys: silhouettes only, varied width and placement.
  for(const x of [-31.5,-22,-11.5,-1.5,11.5,22,31]){
    const z=(rand()-.5)*2.8;
    const rise=1.15+rand()*.42;
    addBox(.61,rise,.54,mats.chimney,x,shellTop+C.roofRise*.79+rise/2,z);
    addBox(.78,.17,.69,mats.roofEdge,x,
      shellTop+C.roofRise*.79+rise+.075,z);
    counters.chimneys++;
  }
  // Rainwater downpipes break the facade rhythm.
  for(const x of [-27.5,-11.7,10.4,29.1]){
    for(const side of [1,-1]){
      addBox(.095,shellTop-.5,.11,mats.roofEdge,
        x,(shellTop+.5)/2,side*(C.width/2+.16));
    }
  }
  // Instancing avoids ~1600 individual draw calls for prototype details.
  for(const [material,transforms] of batches){
    const mesh=new THREE.InstancedMesh(u,material,transforms.length);
    mesh.name="batched architectural details";
    transforms.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();
    mesh.castShadow=true;mesh.receiveShadow=true;
    root.add(mesh);
  }
  root.userData={stage:"3.1",config:C,counters,roofTop,
    windowPlan:windows,provisionalMaterials:true,facadeTextureReady:false};
  return {root,config:C,stats:counters,roofTop};
}
