// MINI CITY 4.4 — five independent, deterministic low-poly tree models.
// Scene and isolated previews share the exact same geometry/material builder.
// Position in metres, shapes and palette are authored; no external textures.
const P=(name,shape,material,at,scale,rotation=[0,0,0])=>
  ({name,shape,material,at,scale,rotation});
// Previously the side branches were long cylinders centred OUTSIDE the
// trunk, with their lower tips visibly hanging beneath the foliage.
// Author a short tapered fork from its true trunk connection to an actual
// leaf-covered endpoint. Both ends are explicit and always point upwards.
const B=(name,material,from,to,thickness=1)=>{
 const delta=to.map((v,i)=>v-from[i]);
 const length=Math.hypot(...delta);
 if(!(length>.10)||delta[1]<=0)
  throw Error("Tree branches must grow upwards from the trunk: "+name);
 const centre=from.map((v,i)=>(v+to[i])/2);
 // Rotate an upright unit cylinder so its local +Y follows the direction.
 // Three.js default Euler XYZ: Rz controls horizontal X, Rx controls Z.
 const rotation=[Math.atan2(delta[2],delta[1]),0,
   -Math.asin(Math.max(-1,Math.min(1,delta[0]/length)))];
 return {...P(name,"branch",material,centre,
     [thickness,length,thickness],rotation),
   branchEnds:Object.freeze({from:Object.freeze(from),to:Object.freeze(to)})};
};
const base=[
 P("trees-trunks","trunk","bark",[0,1.22,0],[1,1.04,1]),
 B("trees-branch-left","bark",[-.06,2.34,0],[-.78,3.45,.04],.94),
 B("trees-branch-right","bark",[.07,2.34,-.02],[.86,3.47,-.10],.94),
 // A leafy collar hides the fork root at the trunk/canopy joint.
 P("trees-canopy-neck","crown","greenDark",[0,3.15,0],[.84,.85,.84]),
 P("trees-canopy-low","crown","greenDark",[-1.05,3.55,.06],[1.54,1.29,1.44]),
 P("trees-canopy-high","crown","greenLight",[.10,4.80,-.18],[1.50,1.47,1.49]),
 P("trees-canopy-left","crown","greenMid",[-1.55,4.58,-.26],[1.20,1.23,1.19]),
 P("trees-canopy-right","crown","greenMid",[1.52,4.15,.34],[1.27,1.22,1.28]),
 P("trees-canopy-back","crown","greenDark",[-.20,3.93,-1.15],[1.24,1.15,1.26]),
 P("trees-canopy-front","crown","greenLight",[.25,4.36,1.17],[1.30,1.20,1.17]),
 P("trees-canopy-top","crown","greenMid",[-.37,5.35,.14],[1.22,.94,1.24])
];
const poplar=[
 P("poplar-trunk","tallTrunk","bark",[0,1.85,0],[.72,1.05,.72]),
 P("poplar-crown-low","crown","greenDark",[0,3.20,0],[.80,1.00,.77]),
 P("poplar-crown-left","crown","greenMid",[-.35,4.15,.04],[.79,1.12,.77]),
 P("poplar-crown-right","crown","greenMid",[.32,4.70,-.07],[.76,1.04,.74]),
 P("poplar-crown-center","crown","greenLight",[0,5.53,0],[.87,1.10,.83]),
 P("poplar-crown-upper","crown","greenDark",[-.09,6.49,.03],[.76,1.04,.76]),
 P("poplar-crown-tip","crown","greenLight",[.04,7.29,0],[.58,.86,.58])
];
const oak=[
 P("oak-trunk","thickTrunk","oakBark",[0,1.45,0],[1,1,1]),
 B("oak-branch-left","oakBark",[-.12,2.78,0],[-1.49,3.95,.05],1.18),
 B("oak-branch-right","oakBark",[.13,2.78,.03],[1.48,3.98,.10],1.18),
 B("oak-branch-back","oakBark",[0,2.82,-.09],[.08,3.87,-1.12],1.05),
 P("oak-crown-center","crown","oakGreen",[0,4.36,0],[2.11,1.65,1.79]),
 P("oak-crown-left","crown","oakLight",[-2.05,4.04,.17],[1.80,1.38,1.50]),
 P("oak-crown-right","crown","oakGreen",[2.05,4.04,-.13],[1.89,1.44,1.63]),
 P("oak-crown-back","crown","oakLight",[-.30,4.45,-1.75],[1.56,1.33,1.42]),
 P("oak-crown-front","crown","oakGreen",[.18,4.36,1.63],[1.68,1.29,1.41]),
 P("oak-crown-upper","crown","oakLight",[-.19,5.42,.05],[1.74,1.25,1.58])
];
const ornamental=[
 P("ornamental-trunk","slimTrunk","bark",[0,1.22,0],[.85,1.00,.85]),
 B("ornamental-branch-left","bark",[-.03,2.34,0],[-.74,3.12,.05],.62),
 B("ornamental-branch-right","bark",[.04,2.34,0],[.71,3.13,-.02],.62),
 P("ornamental-crown-center","crown","ornamentalGreen",[0,3.04,0],[1.02,.94,1.07]),
 P("ornamental-crown-left","crown","ornamentalGreen",[-.96,2.87,.12],[.82,.77,.80]),
 P("ornamental-crown-right","crown","ornamentalGreen",[.94,2.95,-.06],[.78,.76,.82]),
 P("ornamental-flowers-top","crown","blossomPink",[-.31,3.70,.22],[.55,.43,.59]),
 P("ornamental-flowers-left","crown","blossomPale",[-1.21,3.19,.34],[.42,.40,.47]),
 P("ornamental-flowers-right","crown","blossomPink",[1.18,3.17,-.26],[.45,.39,.45]),
 P("ornamental-flowers-front","crown","blossomPale",[.16,3.05,1.02],[.40,.40,.45])
];
const birch=[
 P("birch-trunk","birchTrunk","birchWhite",[0,1.85,0],[1,1,1]),
 P("birch-bark-mark-low","barkStripe","birchDark",[0,.82,0],[1,1,1]),
 P("birch-bark-mark-mid","barkStripe","birchDark",[0,1.58,0],[1,1,1]),
 P("birch-bark-mark-high","barkStripe","birchDark",[0,2.33,0],[1,1,1]),
 B("birch-branch-left","birchWhite",[-.03,3.49,0],[-.97,4.47,-.06],.64),
 B("birch-branch-right","birchWhite",[.04,3.50,0],[1.00,4.58,-.20],.64),
 P("birch-foliage-left","crown","birchGreen",[-1.03,3.99,0],[.98,1.30,.99]),
 P("birch-foliage-right","crown","birchLight",[1.08,4.44,-.25],[.89,1.17,.91]),
 P("birch-foliage-center","crown","birchGreen",[.06,5.03,.07],[.95,1.19,1.02]),
 P("birch-foliage-back","crown","birchLight",[-.21,4.05,-.89],[.83,1.04,.86]),
 P("birch-foliage-tip","crown","birchLight",[.19,5.92,0],[.65,.87,.64])
];
const TYPES={
 street_tree:{name:"Городское дерево",number:1,quantity:22,
  height:6.3,y:3.65,distance:10.2,parts:base},
 street_tree_poplar:{name:"Тополь пирамидальный",number:3,quantity:0,
  height:8.2,y:4.0,distance:12.0,parts:poplar},
 street_tree_oak:{name:"Дуб раскидистый",number:4,quantity:0,
  height:6.9,y:3.5,distance:13.0,parts:oak},
 street_tree_ornamental:{name:"Дерево декоративное цветущее",number:5,quantity:0,
  height:4.2,y:2.2,distance:8.2,parts:ornamental},
 street_tree_birch:{name:"Берёза белоствольная",number:6,quantity:0,
  height:7.1,y:3.3,distance:10.5,parts:birch}
};
export const TREE_MODELS=Object.freeze(Object.fromEntries(
 Object.entries(TYPES).map(([id,item])=>[id,Object.freeze({
  ...item,id,category:"nature",
  parts:Object.freeze(item.parts.map(x=>x.name))
 })])
));
// Expose authored junctions to regression tests; no duplicated drawing code.
export const TREE_BRANCH_SEGMENTS=Object.freeze(Object.fromEntries(
 Object.entries(TYPES).map(([id,item])=>[id,Object.freeze(
  item.parts.filter(p=>p.branchEnds).map(p=>Object.freeze({
   name:p.name,from:p.branchEnds.from,to:p.branchEnds.to,
   centre:p.at,length:p.scale[1],rotation:p.rotation
  }))
 )])
));
const palette={
 bark:0x695044,oakBark:0x514336,
 greenDark:0x466b3c,greenMid:0x578348,greenLight:0x719856,
 oakGreen:0x466f3a,oakLight:0x63874a,
 ornamentalGreen:0x66874c,blossomPink:0xc9899d,blossomPale:0xdba9b4,
 birchWhite:0xd9dad1,birchDark:0x333937,
 birchGreen:0x548348,birchLight:0x83a368
};
export function buildTreeMeshes(THREE,root,instances){
 if(!instances?.length)return [];
 const groups=new Map();
 for(const item of instances){
  const id=item.type||"street_tree";
  if(!TYPES[id])throw Error("Unknown tree model: "+id);
  if(!groups.has(id))groups.set(id,[]);
  groups.get(id).push(item);
 }
 const mats=Object.fromEntries(Object.entries(palette).map(([key,color])=>
  [key,new THREE.MeshStandardMaterial({color,roughness:.98,metalness:0,flatShading:true})]));
 const geometry={
  trunk:new THREE.CylinderGeometry(.215,.30,2.38,8),
  thickTrunk:new THREE.CylinderGeometry(.36,.48,2.88,8),
  tallTrunk:new THREE.CylinderGeometry(.18,.29,3.40,8),
  slimTrunk:new THREE.CylinderGeometry(.12,.19,2.44,8),
  birchTrunk:new THREE.CylinderGeometry(.13,.20,3.65,8),
  barkStripe:new THREE.CylinderGeometry(.135,.145,.075,8),
  // Unit-height taper: every variant scales Y to the actual fork length.
  branch:new THREE.CylinderGeometry(.070,.135,1,7),
  crown:new THREE.DodecahedronGeometry(1,0)
 };
 const meshes=[];
 const temp=new THREE.Object3D();
 for(const [id,trees] of groups){
  for(const part of TYPES[id].parts){
   const mesh=new THREE.InstancedMesh(geometry[part.shape],mats[part.material],trees.length);
   mesh.name=part.name;mesh.frustumCulled=false;
   trees.forEach((tree,i)=>{
    temp.position.set(tree.x+part.at[0],part.at[1],tree.z+part.at[2]);
    temp.scale.set(...part.scale);temp.rotation.set(...part.rotation);
    temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);
   });
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
   root.add(mesh);meshes.push(mesh);
  }
 }
 return meshes;
}
