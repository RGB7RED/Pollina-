// MINI CITY 4.3.1A — portable procedural shelter. Local +Z is the
// open street-facing side; ground plane is y=0. No city integration here.
import {createBusStopMaterials} from "./materials.js";

export const BUS_STOP_SIZE=Object.freeze({
  width:4.2,depth:1.8,roofTop:2.72,seatHeight:.45,signTop:3.5
});
const PROFILE_STEPS=12;
function boxList(THREE,group,material,items){
  if(!items.length)return;
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,items.length);
  const dummy=new THREE.Object3D();
  items.forEach((item,i)=>{
    const [x,y,z,w,h,d,rx=0,ry=0,rz=0]=item;
    dummy.position.set(x,y,z);
    dummy.scale.set(w,h,d);
    dummy.rotation.set(rx,ry,rz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false;
  group.add(mesh);
  return mesh;
}
function curvedY(z){
  // A genuinely curved canopy, raised in the middle rather than a slab.
  return 2.55+.17*Math.sin(Math.PI*(z+1.06)/2.12);
}
function roofSection(THREE,x0,x1){
  const vertices=[],normals=[],uvs=[],indices=[];
  for(let s=0;s<=PROFILE_STEPS;s++){
    const z=-1.06+2.12*s/PROFILE_STEPS,y=curvedY(z);
    for(const x of [x0,x1]){
      vertices.push(x,y,z);normals.push(0,1,0);
      uvs.push((x-x0)/(x1-x0),s/PROFILE_STEPS);
    }
    if(s<PROFILE_STEPS){
      const i=s*2;
      indices.push(i,i+2,i+1,i+1,i+2,i+3);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute("normal",new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  return geometry;
}
function archRails(x,parts){
  for(let n=0;n<PROFILE_STEPS;n++){
    const z0=-1.06+2.12*n/PROFILE_STEPS;
    const z1=-1.06+2.12*(n+1)/PROFILE_STEPS;
    const dy=curvedY(z1)-curvedY(z0),dz=z1-z0;
    const tilt=-Math.atan2(dy,dz);
    parts.push([x,(curvedY(z0)+curvedY(z1))/2,(z0+z1)/2,
      .055,.075,Math.hypot(dz,dy)+.014,tilt]);
  }
}
function textureFromCanvas(THREE,canvasFactory,paint){
  const makeCanvas=canvasFactory||(()=>{
    if(typeof document==="undefined")throw Error("Canvas unavailable: provide canvasFactory");
    return document.createElement("canvas");
  });
  const canvas=makeCanvas();
  canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Cannot create canvas 2D context");
  paint(ctx);
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=1;
  return map;
}
function signTexture(THREE,canvasFactory){
  return textureFromCanvas(THREE,canvasFactory,c=>{
    c.fillStyle="#1663a4";c.fillRect(0,0,512,256);
    c.fillStyle="#fff";c.fillRect(130,12,252,230);
    c.fillStyle="#134c81";c.fillRect(190,75,130,105);
    c.fillStyle="#fff";c.fillRect(202,86,106,58);
    c.fillStyle="#134c81";c.fillRect(210,90,43,48);c.fillRect(263,90,43,48);
    c.fillStyle="#134c81";c.fillRect(205,151,20,24);c.fillRect(285,151,20,24);
    c.fillStyle="#fff";c.fillRect(205,164,18,9);c.fillRect(288,164,18,9);
    c.fillStyle="#134c81";c.fillRect(208,184,20,10);c.fillRect(284,184,20,10);
  });
}
function timetableTexture(THREE,canvasFactory){
  return textureFromCanvas(THREE,canvasFactory,c=>{
    c.fillStyle="#edf1ee";c.fillRect(0,0,512,256);
    c.fillStyle="#1c6497";c.fillRect(0,0,512,60);
    c.fillStyle="#ffffff";c.font="bold 32px sans-serif";
    c.fillText("УЛИЦА САДОВАЯ",25,42);
    c.fillStyle="#213b4a";c.font="bold 33px sans-serif";
    c.fillText("7   24   181",26,119);
    c.font="24px sans-serif";c.fillText("Автобусы",27,157);
    c.fillStyle="#52707d";c.font="19px sans-serif";
    c.fillText("Информация о маршрутах",27,200);
    c.fillText("MINI CITY · тестовое табло",27,232);
  });
}
export function createBusStop(THREE,{canvasFactory}={}){
  const root=new THREE.Group();
  root.name="BusStop";
  const materials=createBusStopMaterials(THREE);
  const named={};
  for(const name of ["Structure","Roof","GlassPanels","Bench","BusSign","InformationBoard"]){
    const g=new THREE.Group();g.name=name;root.add(g);named[name]=g;
  }
  // 4 primary posts and fine horizontal framing; front opening remains free.
  const frame=[];
  for(const x of [-2.02,2.02]){
    for(const z of [-.82,.82])frame.push([x,1.26,z,.085,2.52,.085]);
    frame.push([x,1.19,-.82,.055,2.30,.055]);
  }
  for(const z of [-.82,.82]){
    frame.push([0,2.47,z,4.14,.075,.075]);
  }
  frame.push([0,.23,-.82,4.12,.05,.07]);
  for(const x of [-.7,.7])frame.push([x,1.32,-.82,.043,2.28,.049]);
  frame.push([-2.02,1.28,0,.050,2.25,.055],[2.02,1.28,0,.050,2.25,.055]);
  boxList(THREE,named.Structure,materials.metal,frame);
  // Roof panel bays use curved indexed mesh; arches and crossbars are metal.
  for(let i=0;i<4;i++){
    const x0=-2.18+i*1.09+.025,x1=x0+1.04;
    named.Roof.add(new THREE.Mesh(roofSection(THREE,x0,x1),materials.roof));
  }
  const ribs=[];
  for(const x of [-2.18,-1.09,0,1.09,2.18])archRails(x,ribs);
  for(const z of [-1.06,1.06]){
    ribs.push([0,curvedY(z),z,4.42,.075,.07]);
  }
  // Crosswise fixings follow the canopy curvature at three positions.
  ribs.push([0,curvedY(0),0,4.30,.04,.05]);
  boxList(THREE,named.Roof,materials.trim,ribs);
  const fasteners=[];
  for(const x of [-2.18,-1.09,0,1.09,2.18])
    for(const z of [-.93,.93])fasteners.push([x,curvedY(z)+.045,z,.048,.03,.048]);
  boxList(THREE,named.Roof,materials.bolts,fasteners);

  // Real alpha-blended glazing. Five independent panes (3 rear, 2 ends).
  const glazing=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),materials.glass,5);
  const pane=new THREE.Object3D(),positions=[
    [-1.34,1.30,-.815,1.25,2.22,0],
    [0,1.30,-.815,1.25,2.22,0],
    [1.34,1.30,-.815,1.25,2.22,0],
    [-2.025,1.30,-.02,1.56,2.22,Math.PI/2],
    [2.025,1.30,-.02,1.56,2.22,Math.PI/2]
  ];
  positions.forEach(([x,y,z,w,h,ry],i)=>{
    pane.position.set(x,y,z);pane.scale.set(w,h,1);
    pane.rotation.set(0,ry,0);pane.updateMatrix();glazing.setMatrixAt(i,pane.matrix);
  });
  glazing.instanceMatrix.needsUpdate=true;
  glazing.frustumCulled=false;glazing.renderOrder=1;
  named.GlassPanels.add(glazing);

  // Bench: multiple real wooden slats, under-seat legs and slatted backrest.
  const seat=[],support=[];
  for(const z of [-.50,-.33,-.16,.01]){
    seat.push([0,.45,z,3.03,.053,.13]);
  }
  for(const y of [.69,.82,.95]){
    seat.push([0,y,-.68,3.03,.087,.06,-.13]);
  }
  for(const x of [-1.23,1.23]){
    for(const z of [-.49,-.05])
      support.push([x,.23,z,.075,.45,.075]);
    support.push([x,.47,-.28,.075,.075,.67]);
    support.push([x,.72,-.69,.075,.59,.075,-.13]);
  }
  boxList(THREE,named.Bench,materials.wood,seat);
  boxList(THREE,named.Bench,materials.metal,support);

  // A separate pole at the curb, higher than the roof; the bus icon is
  // generated on a local canvas (no downloaded artwork).
  const pole=[
    [2.91,1.72,.32,.075,3.44,.075],
    [2.91,3.48,.32,.18,.04,.18]
  ];
  boxList(THREE,named.BusSign,materials.metal,pole);
  const bluePlate=new THREE.Mesh(new THREE.BoxGeometry(.65,.61,.057),materials.blue);
  bluePlate.position.set(2.91,3.04,.35);named.BusSign.add(bluePlate);
  const signMat=new THREE.MeshBasicMaterial({
    map:signTexture(THREE,canvasFactory),side:THREE.DoubleSide
  });
  const busIcon=new THREE.Mesh(new THREE.PlaneGeometry(.62,.58),signMat);
  busIcon.position.set(2.91,3.04,.387);named.BusSign.add(busIcon);

  // Double-sided internally generated route board, mounted to the rear.
  const backing=new THREE.Mesh(new THREE.BoxGeometry(1.43,.73,.047),materials.board);
  backing.position.set(-1.19,1.79,-.73);named.InformationBoard.add(backing);
  const routesMat=new THREE.MeshBasicMaterial({
    map:timetableTexture(THREE,canvasFactory),side:THREE.DoubleSide
  });
  const routes=new THREE.Mesh(new THREE.PlaneGeometry(1.38,.68),routesMat);
  routes.position.set(-1.19,1.79,-.700);
  named.InformationBoard.add(routes);
  const holders=[
    [-1.80,1.79,-.67,.05,.81,.065],
    [-.58,1.79,-.67,.05,.81,.065]
  ];
  boxList(THREE,named.InformationBoard,materials.trim,holders);
  root.userData={prototypeId:"bus_stop_city_001",modelNumber:3,
    stage:"4.3.1A",inPlayLab:false,frontAxis:"+Z",dimensions:BUS_STOP_SIZE};
  return {root,groups:named,materials,dimensions:BUS_STOP_SIZE};
}
export function auditBusStop(THREE,root){
  let triangles=0,meshes=0,instances=0;
  const materials=new Set(),groups=new Set();
  root.traverse(object=>{
    if(object.isGroup&&object!==root)groups.add(object.name);
    if(!object.isMesh)return;
    meshes++;
    instances+=object.isInstancedMesh?object.count:1;
    const geo=object.geometry;
    const count=geo.index?geo.index.count:geo.attributes.position.count;
    triangles+=Math.round(count/3)*(object.isInstancedMesh?object.count:1);
    const ms=Array.isArray(object.material)?object.material:[object.material];
    ms.forEach(m=>materials.add(m));
  });
  const bounds=new THREE.Box3().setFromObject(root);
  const size=bounds.getSize(new THREE.Vector3());
  return {triangles,meshDraws:meshes,instances,materials:materials.size,
    groups:[...groups],size:{x:size.x,y:size.y,z:size.z}};
}
