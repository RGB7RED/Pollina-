// MINI CITY · Stage 4.2.1 — one mobile-budget residential street segment.
// World units are metres. Kept separate from the approved house geometry
// and character controller; deterministic placement makes review repeatable.
import {addGrassToGroup} from "./grass.js";
export const STREET_LAYOUT=Object.freeze({
  length:108,roadNear:16.05,roadFar:25.15,
  sidewalkNear:[9.55,15.98],sidewalkFar:[25.25,30.2],
  rearPath:[-12.05,-8.05],worldWidth:130,worldDepth:85
});
const rect=(kind,x,z,width,depth,y=0)=>({kind,x,z,width,depth,y});
const obstruction=(name,x,z,rx,rz)=>({
  name,minX:x-rx,maxX:x+rx,minZ:z-rz,maxZ:z+rz
});
// Grass is authored once in the street plan and reused by the game and the
// standalone street viewer. No textures, browser APIs or random frame state.
export function sampleGrassTufts(surfaces,building,pads=[],{buildingPresent=true}={}){
  const lawn=surfaces.find(p=>p.kind==="grass");
  if(!lawn)return [];
  const paved=surfaces.filter(p=>p.kind!=="grass");
  const hash=(x,z,k=0)=>{
    const n=Math.sin(x*127.1+z*311.7+k*74.7)*43758.5453;
    return n-Math.floor(n);
  };
  const occupied=(x,z)=>{
    if(paved.some(r=>Math.abs(x-r.x)<r.width/2+.45&&
      Math.abs(z-r.z)<r.depth/2+.45))return true;
    if(!buildingPresent)return false;
    if(Math.abs(x)<building.length/2+1.2&&
       Math.abs(z)<building.width/2+1.2)return true;
    return pads.some(p=>Math.abs(x-p.x)<p.width/2+.6&&
      Math.abs(z-p.centreZ)<p.depth/2+.6);
  };
  const result=[];
  const step=.94;
  for(let x=-lawn.width/2+2;x<lawn.width/2-2;x+=step){
    for(let z=lawn.z-lawn.depth/2+2;z<lawn.z+lawn.depth/2-2;z+=step){
      if(hash(x,z,0)>.89)continue; // dense turf but still natural gaps
      const px=x+(hash(x,z,1)-.5)*1.0;
      const pz=z+(hash(x,z,2)-.5)*1.0;
      if(occupied(px,pz))continue;
      result.push({
        x:+px.toFixed(4),z:+pz.toFixed(4),
        height:+(.19+hash(x,z,3)*.27).toFixed(4),
        width:+(.35+hash(x,z,4)*.20).toFixed(4),
        angle:hash(x,z,5)*Math.PI
      });
    }
  }
  return result;
}
export function planStreet(building,pads=[],options={}){
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
  const trees=options.furniture===false?[]:[
    ...[-41,-29,-16,16,29,41].map(x=>({x,z:14.40,row:"front"})),
    ...[-44,-32,-20,-8,8,20,32,44].map(x=>({x,z:28.55,row:"opposite"})),
    ...[-42,-30,-18,-6,6,18,30,42].map(x=>({x,z:-20.1,row:"courtyard"}))
  ];
  const lamps=options.furniture===false?[]:[
    ...[-35,-10,10,35].map(x=>({x,z:15.27,row:"front"})),
    ...[-35,35].map(x=>({x,z:26.15,row:"opposite"}))
  ];
  const benches=options.furniture===false?[]:[-30,-12,12,30].map(x=>({x,z:-12.75}));
  const obstacles=[
    ...trees.map((t,i)=>obstruction("tree-"+i,t.x,t.z,.35,.35)),
    ...lamps.map((t,i)=>obstruction("lamp-"+i,t.x,t.z,.25,.25)),
    ...benches.map((t,i)=>obstruction("bench-"+i,t.x,t.z,1.13,.60))
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
  const grassTufts=sampleGrassTufts(surfaces,building,pads,{
    buildingPresent:options.buildingPresent!==false
  });
  return {surfaces,markings,trees,lamps,benches,obstacles,grassTufts,
    curbs:[rect("curb",0,c.roadNear,c.length,.18,.025),
      rect("curb",0,c.roadFar,c.length,.18,.025)],
    info:{trees:trees.length,lamps:lamps.length,benches:benches.length,
      grassTufts:grassTufts.length,
      roadLength:c.length,roadWidth:c.roadFar-c.roadNear}};
}

// Render batched low-poly street furniture, NOT 22 independent tree materials
// and thousands of extra draw calls on an iPhone 12.
export function buildStreet(THREE,plan){
  const root=new THREE.Group();
  root.name="MINI CITY | 4.2.1 | first street";
  const materials={
    grass:new THREE.MeshStandardMaterial({color:0x668459,roughness:1}),

    sidewalk:new THREE.MeshStandardMaterial({color:0xaca8a0,roughness:.97}),
    road:new THREE.MeshStandardMaterial({color:0x484e52,roughness:.98}),
    paving:new THREE.MeshStandardMaterial({color:0x99978d,roughness:.97}),
    roadMark:new THREE.MeshBasicMaterial({color:0xd6d2bc}),
    curb:new THREE.MeshStandardMaterial({color:0x8f8f89,roughness:.96}),
    bark:new THREE.MeshStandardMaterial({color:0x635044,roughness:1}),
    leaves:new THREE.MeshStandardMaterial({color:0x587454,roughness:1,flatShading:true}),
    leaves2:new THREE.MeshStandardMaterial({color:0x728762,roughness:1,flatShading:true}),
    lamp:new THREE.MeshStandardMaterial({color:0x171b1e,roughness:.42,metalness:.58}),
    concrete:new THREE.MeshStandardMaterial({color:0xd7d6cf,roughness:.88,metalness:0}),
    fastener:new THREE.MeshStandardMaterial({color:0xa6a7a1,roughness:.5,metalness:.55}),
    trimWood:new THREE.MeshStandardMaterial({color:0x4b3529,roughness:.82,metalness:.07}),
    glow:new THREE.MeshStandardMaterial({color:0xffdfac,emissive:0xffbb70,emissiveIntensity:1.35,roughness:.7}),
    wood:new THREE.MeshStandardMaterial({color:0x80563c,roughness:.76,metalness:0})
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
      const [x,y,z,sx,sy,sz,rx=0,ry=0,rz=0]=positionScale(item);
      temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);
      temp.scale.set(sx,sy,sz);temp.updateMatrix();
      mesh.setMatrixAt(i,temp.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();
    root.add(mesh);
    return mesh;
  }
  // Independently reusable grass asset: seven sculpted leaves per clump,
  // three palette batches (not hundreds of individual draw calls).
  addGrassToGroup(THREE,root,plan.grassTufts||[]);
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
  // Decorative black Petersburg park lantern, matching the approved
  // photo reference. Every detailed element is a SHARED instanced batch,
  // not six separately constructed lanterns.
  const lampItems=plan.lamps||[];
  const benchItems=plan.benches||[];
  const at=(items)=>items.map(p=>({x:p.x,z:p.z}));
  const local=(p)=>[p.x,0,p.z,1,1,1];
  const lampPart=(name,geometry,material=materials.lamp)=>batch(
    name,geometry,material,at(lampItems),local);
  if(lampItems.length){
    const lampPole=new THREE.CylinderGeometry(.057,.089,3.89,10);
    batch("street-lamp-poles",lampPole,materials.lamp,lampItems,
      p=>[p.x,2.29,p.z,1,1,1]); // foot begins at 0; top at 4.235
    const baseLayers=[
      ["street-lamp-base-foot",new THREE.CylinderGeometry(.215,.24,.12,10),.09],
      ["street-lamp-base-plinth",new THREE.CylinderGeometry(.145,.19,.49,10),.38],
      ["street-lamp-base-collar",new THREE.CylinderGeometry(.165,.14,.13,10),.65],
      ["street-lamp-post-ring",new THREE.CylinderGeometry(.105,.105,.075,10),2.01],
      ["street-lamp-upper-collar",new THREE.CylinderGeometry(.098,.071,.12,10),4.19]
    ];
    for(const [name,geometry,y] of baseLayers)
      batch(name,geometry,materials.lamp,lampItems,p=>[p.x,y,p.z,1,1,1]);
    const makeTube=(points,radius=.026,segments=24)=>new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(([x,y,z=0])=>
        new THREE.Vector3(x,y,z))),segments,radius,5,false);
    // High sweeping gooseneck: not a straight box. Lantern is suspended
    // from the end rather than attached horizontally like a streetlight.
    lampPart("street-lamp-arch",makeTube([
      [.06,4.27],[.12,4.46],[.33,4.60],[.58,4.64],
      [.87,4.57],[1.05,4.37],[1.08,4.02]
    ],.036,28));
    lampPart("street-lamp-vertical-brace",
      makeTube([[.19,3.54],[.19,3.94],[.15,4.25]],.027,12));
    lampPart("street-lamp-cross-brace",
      makeTube([[.08,3.88],[.21,3.88],[.29,3.97]],.023,9));
    // Two worked-iron volutes and small forged tips, readable in silhouette.
    const swirl=(cx,cy,r,startAngle,turns,reverse=false)=>{
      const pts=[];
      for(let i=0;i<=28;i++){
        const t=i/28,angle=startAngle+(reverse?-1:1)*Math.PI*2*turns*t;
        const rad=r*(1-.80*t);
        pts.push([cx+rad*Math.cos(angle),cy+rad*Math.sin(angle)]);
      }
      return makeTube(pts,.017,42);
    };
    lampPart("street-lamp-scroll-large",swirl(.44,4.25,.17,.2,1.55));
    lampPart("street-lamp-scroll-small",swirl(.23,4.12,.12,1.4,1.45,true));
    lampPart("street-lamp-hanger",
      new THREE.CylinderGeometry(.034,.034,.20,8).translate(1.08,3.94,0));
    lampPart("street-lamp-lantern-roof",
      new THREE.ConeGeometry(.303,.23,6,1).translate(1.08,3.91,0));
    lampPart("street-lamp-lantern-eave",
      new THREE.CylinderGeometry(.293,.263,.045,6).translate(1.08,3.79,0));
    const lanternGlass=new THREE.MeshStandardMaterial({
      color:0xfff2d5,emissive:0xffcb74,emissiveIntensity:.35,
      roughness:.2,transparent:true,opacity:.52,
      side:THREE.DoubleSide,depthWrite:false
    });
    lampPart("street-lamp-heads",
      new THREE.CylinderGeometry(.200,.118,.49,6,1,true)
        .translate(1.08,3.52,0),lanternGlass);
    lampPart("street-lamp-lantern-base",
      new THREE.CylinderGeometry(.129,.15,.084,6).translate(1.08,3.24,0));
    lampPart("street-lamp-lantern-tip",
      new THREE.ConeGeometry(.065,.15,6).rotateZ(Math.PI)
        .translate(1.08,3.13,0));
    // Six strong black glazing ribs form the unmistakable hanging lantern.
    // Each rib leans toward the narrow base; all bars share one draw call.
    const ribs=lampItems.flatMap(p=>Array.from({length:6},(_,i)=>{
      const a=Math.PI*2*i/6;
      const dx=Math.cos(a),dz=Math.sin(a);
      return {x:p.x+1.08+dx*.158,y:3.52,z:p.z+dz*.158,
        dx,dz};
    }));
    const ribCylinder=new THREE.CylinderGeometry(.013,.014,.50,5);
    batch("street-lamp-lantern-ribs",ribCylinder,materials.lamp,ribs,r=>[
      r.x,r.y,r.z,1,1,1,
      r.dz*.17,0,-r.dx*.17
    ]);
    lampPart("street-lamp-pole-finial",
      new THREE.ConeGeometry(.078,.18,8).translate(0,4.37,0));
  }
  // Park bench as photographed: individual brown wooden lamellae, slightly
  // tilted backrest, two cast-concrete A-profile side supports. No armrests.
  if(benchItems.length){
    const slat=new THREE.BoxGeometry(1,1,1);
    const seats=benchItems.flatMap(b=>Array.from({length:6},(_,i)=>({
      x:b.x,z:b.z-.15+i*.105
    })));
    batch("benches-seats",slat,materials.wood,seats,
      s=>[s.x,.485,s.z,1.91,.046,.091]);
    const backs=benchItems.flatMap(b=>Array.from({length:6},(_,i)=>({
      x:b.x,y:.62+i*.095,z:b.z-.35-i*.024
    })));
    batch("benches-backs",slat,materials.wood,backs,
      s=>[s.x,s.y,s.z,1.91,.079,.055,-.24,0,0]);
    // Slender rear braces actually support the slanted wooden backrest.
    // The wood boards do not float unsupported above the concrete sides.
    const backRails=benchItems.flatMap(b=>[-.80,.80].map(x=>({
      x:b.x+x,z:b.z-.42
    })));
    batch("benches-back-rails",slat,materials.trimWood,backRails,
      p=>[p.x,.81,p.z,.05,.67,.063,-.24,0,0]);
    // Extruded side profiles read like two genuine sloped white concrete
    // legs, with a structural notch beneath the seat.
    const shape=new THREE.Shape();
    shape.moveTo(-.45,.045);
    shape.lineTo(-.24,.045);
    shape.lineTo(-.09,.355);
    shape.lineTo(.17,.355);
    shape.lineTo(.35,.045);
    shape.lineTo(.56,.045);
    shape.lineTo(.30,.54);
    shape.lineTo(-.13,.54);
    shape.lineTo(-.34,.17);
    shape.closePath();
    const supportGeo=new THREE.ExtrudeGeometry(shape,{
      depth:.145,steps:1,bevelEnabled:true,bevelSegments:1,
      bevelSize:.012,bevelThickness:.012,curveSegments:1
    });
    supportGeo.rotateY(Math.PI/2);supportGeo.translate(-.073,0,0);
    const supports=benchItems.flatMap(b=>[
      {x:b.x-.80,z:b.z},{x:b.x+.80,z:b.z}
    ]);
    batch("benches-concrete-supports",supportGeo,materials.concrete,supports,local);
    // Tiny fastening caps along the backrest, repeated in one batch.
    const bolts=benchItems.flatMap(b=>Array.from({length:6},(_,i)=>
      [-.79,.79].map(x=>({x:b.x+x,y:.62+i*.095,z:b.z-.35-i*.024+.037}))
    ).flat());
    const boltGeo=new THREE.SphereGeometry(.013,5,4);
    batch("benches-fasteners",boltGeo,materials.fastener,bolts,
      p=>[p.x,p.y,p.z,1,1,1]);
  }
  root.userData.streetStats={...plan.info,
    obstacleCount:plan.obstacles.length,
    drawGroups:root.children.length};
  return root;
}
