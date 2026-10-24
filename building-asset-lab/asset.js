// MINI CITY · Standalone 3D asset viewer models.
// Every ID names a DISTINCT reusable component TYPE, not another house card.
// Dimensions/materials follow the actual procedural objects in building.js.
// Same coordinate convention: X across facade, Y up, Z depth.
export const PARTS=Object.freeze({
 entrance_door:{family:"door",variant:0,width:1.53,height:2.13,instances:1},
 flat_door_grey:{family:"door",variant:1,width:1.04,height:2.15,instances:5},
 flat_door_brown:{family:"door",variant:2,width:1.04,height:2.15,instances:5},
 flat_door_blue:{family:"door",variant:3,width:1.04,height:2.15,instances:5},
 flat_door_dark:{family:"door",variant:4,width:1.04,height:2.15,instances:5},
 facade_window_a:{family:"window",variant:0,width:1.40,height:1.59},
 facade_window_b:{family:"window",variant:1,width:1.40,height:1.59},
 facade_window_c:{family:"window",variant:2,width:1.40,height:1.59},
 facade_window_d:{family:"window",variant:3,width:1.40,height:1.59},
 stairwell_window:{family:"window",variant:4,width:1.40,height:1.42,instances:4},
 radiator_iron:{family:"heating",variant:0,width:1.32,height:.59,instances:4},
 heating_riser:{family:"heating",variant:1,width:.064,height:13.58,instances:1},
 ceiling_lamp:{family:"lighting",variant:0,width:.37,height:.104,instances:6},
 mailboxes_wall:{family:"utility",variant:0,width:1.21,height:.84,instances:1},
 electricity_cabinet:{family:"utility",variant:1,width:1.43,height:1.03,instances:5},
});
export function buildBuildingPart(THREE,id){
  const spec=PARTS[id];
  if(!spec)throw Error("Unknown standalone building asset "+id);
  const root=new THREE.Group();root.name="MINI CITY PART "+id;
  const cube=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const batch=new Map();
  const colors={
    iron:0x7f8989,light:0xd7d4c9,
    paint:0xd0c9b1,glass:0x96bdc2,glow:0xc3a37b,
    wood:0x64554e,blue:0x4b6975,grey:0x7f8989,dark:0x444f53,
    mailbox:0x7b8584,ink:0x4b5656,green:0x76978d
  };
  const mat=Object.fromEntries(Object.entries(colors).map(([k,color])=>[
    k,new THREE.MeshStandardMaterial({color,roughness:.82,
      transparent:k==="glass",opacity:k==="glass"?.28:1,
      emissive:k==="glow"?0xb57a43:0x000000,emissiveIntensity:k==="glow"?.38:0})
  ]));
  function box(w,h,d,m,x,y,z){
    if(!(w>0&&h>0&&d>0))throw Error("Invalid part");
    let list=batch.get(m);if(!list){list=[];batch.set(m,list)}
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);
    dummy.scale.set(w,h,d);dummy.updateMatrix();list.push(dummy.matrix.clone());
  }
  const {width:w,height:h}=spec,add=(a,b,c,m,x=0,y=0,z=0)=>box(a,b,c,mat[m],x,y,z);
  if(spec.family==="door"){
    const palette=["blue","grey","wood","blue","dark"],shade=palette[spec.variant];
    add(w+.12,.075,.14,"light",0,h+.04);
    for(const side of [-1,1])
      add(.072,h,.15,"iron",side*(w/2+.04),h/2);
    add(w-.10,h-.10,.088,shade,0,h/2);
    add(.035,.13,.075,"iron",w/2-.19,1.03,.067);
    if(spec.variant===0){
      add(w-.20,.34,.075,"glass",0,h-.39,.07);
      add(w-.16,.06,.12,"iron",0,h-.62,.09);
    }
  }else if(spec.family==="window"){
    // The viewer has true transparent glass, rather than an opaque blue decal.
    add(w-.15,h-.15,.045,"glass",0,h/2);
    for(const side of [-1,1]){
      add(.075,h,.11,"light",side*(w/2-.045),h/2);
      add(w,.075,.11,"light",0,side>0?h-.04:.04);
    }
    const v=spec.variant;
    if(v===0||v===4)add(.075,h-.12,.11,"iron",0,h/2);
    else if(v===1)for(const fraction of [-1/6,1/6])
      add(.066,h-.12,.11,"iron",w*fraction,h/2);
    else if(v===2){add(.078,h-.12,.11,"iron",-.20,h/2);
      add(w-.15,.065,.11,"iron",0,h-.39);}
    else {add(.07,h-.12,.11,"iron",0,h/2);
      add(w-.15,.06,.11,"light",0,h-.43);}
    add(w+.21,.07,.34,"light",0,-.055,0);
  }else if(id==="radiator_iron"){
    add(1.24,.56,.055,"light",0,.29,.04);
    for(const dy of [-.23,.23])add(1.32,.065,.10,"iron",0,.3+dy,-.06);
    for(let j=0;j<10;j++){
      const x=(j-4.5)*.115;
      add(.083,.53,.12,"light",x,.29,-.08);
      add(.035,.41,.126,"mailbox",x,.29,-.11);
    }
  }else if(id==="heating_riser"){
    add(.064,h,.064,"iron",0,h/2);
    for(const dy of [.35,h-.55])add(.65,.055,.055,"iron",.36,dy);
  }else if(id==="ceiling_lamp"){
    // Y=0 is mounting plane, emitted glass faces the floor.
    add(w,.055,.35,"light",0,-.04);
    add(w-.09,.037,.24,"glow",0,-.084);
  }else if(id==="mailboxes_wall"){
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){
      const x=(col-2)*.22,y=row*.21;
      add(.19,.210,.10,"mailbox",x,y,.0);
      add(.12,.032,.012,"ink",x,y+.04,.057);
      add(.032,.02,.014,"ink",x+.05,y-.055,.057);
    }
  }else if(id==="electricity_cabinet"){
    add(1.43,1.03,.105,"mailbox",0,.515);
    add(1.35,.93,.018,"grey",0,.515,.062);
    for(let i=0;i<4;i++){
      const x=(i-1.5)*.31;
      add(.255,.37,.022,"light",x,.645,.076);
      add(.17,.09,.025,"ink",x,.735,.09);
    }
    add(1.21,.035,.029,"ink",0,.15,.087);
  }
  let elements=0;
  for(const [material,instances] of batch){
    const mesh=new THREE.InstancedMesh(cube,material,instances.length);
    instances.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
    mesh.instanceMatrix.needsUpdate=true;
    mesh.computeBoundingSphere();
    mesh.castShadow=true;mesh.receiveShadow=true;
    root.add(mesh);elements+=instances.length;
  }
  root.userData={catalogId:id,category:spec.family,instances:spec.instances??null,
    dimensions:{width:w,height:h},elements,distinctAsset:true};
  return {root,spec,stats:root.userData};
}
