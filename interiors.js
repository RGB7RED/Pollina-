// MINI CITY 0.3.1 — walkable multi-storey stairwells.
// Stair rise is continuous (not teleportation). Dimensions in world metres.
// Two five-floor buildings and a three-floor Khrushchyovka-style entrance.
export const FLOOR_HEIGHT=3.05;
export const ENTRANCES=Object.freeze([
  {id:"entrance-1",number:1,name:"Подъезд №1",x:-32,z:-46.9,frontZ:-44.5,floors:5,kind:"panel"},
  {id:"entrance-2",number:2,name:"Подъезд №2",x:32,z:-46.2,frontZ:-43.5,floors:5,kind:"panel"},
  {id:"entrance-3",number:3,name:"Подъезд №3",x:-58,z:22.8,frontZ:25.5,floors:3,kind:"old"}
]);
const HALF_R=.38;
const FRONT=3.2,BACK=-4.15;
const RISE=FLOOR_HEIGHT/2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function indoorBlocked(x,z,y=0) {
  // Walls do not depend on the floor. Steps are walkable, not solid barriers.
  return x-HALF_R< -5.65||x+HALF_R>5.65||z-HALF_R< -6.45||z+HALF_R>6.45;
}
export function indoorFloorHeight(x,z,currentY,floors=5){
  const maxY=(floors-1)*FLOOR_HEIGHT;
  // Each full storey: first flight travels to the rear, second returns to front.
  // Choose the copy nearest to the player's current elevation.
  let ramp=null;
  if(x>=-4.95&&x<=-2.7&&z>=BACK-.25&&z<=FRONT+.2){
    const along=clamp((FRONT-z)/(FRONT-BACK),0,1);
    ramp=RISE*along;
  }else if(x>=-1.99&&x<=.05&&z>=BACK-.25&&z<=FRONT+.2){
    const along=clamp((z-BACK)/(FRONT-BACK),0,1);
    ramp=RISE*(1+along);
  }else if(x>-5.2&&x<.2&&z<BACK+.15&&z>BACK-.85){
    ramp=RISE;
  }
  if(ramp!==null){
    const index=clamp(Math.round((currentY-ramp)/FLOOR_HEIGHT),0,floors-2);
    const candidate=index*FLOOR_HEIGHT+ramp;
    // Do not allow a new storey to be entered vertically through the ceiling.
    if(Math.abs(candidate-currentY)<.75)return Math.min(maxY,candidate);
  }
  return clamp(Math.round(currentY/FLOOR_HEIGHT),0,floors-1)*FLOOR_HEIGHT;
}
export function nearIndoorObject(localX,localZ,playerY=0,floors=5){
  const floor=Math.max(0,Math.min(floors-1,Math.round(playerY/FLOOR_HEIGHT)));
  if(floor===0&&Math.hypot(localX,localZ-5.35)<2.15)
    return {type:"lobby-exit",title:"Выйти во двор",distance:Math.hypot(localX,localZ-5.35)};
  if(floor===0&&Math.hypot(localX-4.45,localZ+1.35)<2.25)
    return {type:"mailboxes",title:"Осмотреть почтовые ящики",distance:Math.hypot(localX-4.45,localZ+1.35)};
  if(floor>=1&&localX>1.7&&localZ< -3.3)
    return {type:"apartment",title:"Двери квартир закрыты",floor:floor+1,distance:1};
  return null;
}
export function buildInteriors({THREE,scene,world,box,mat,label}){
  const concrete=mat(0x919695),wall=mat(0xb0b1a9),oldWall=mat(0xb6a99c),
    edge=mat(0x666e6b),steps=mat(0x92999a),metal=mat(0x414b50),
    darkDoor=mat(0x68534d),mail=mat(0x817d71),white=mat(0xd8d2bd),
    warm=mat(0xd5b88d,{emissive:0xbba47e,emissiveIntensity:.15});
  const regions=[];
  const unit=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  ENTRANCES.forEach((entry,index)=>{
    const root=new THREE.Group();
    root.position.set(440+index*36,0,0);root.visible=false;scene.add(root);
    const batches=new Map();
    const put=(w,h,d,material,x,y,z)=>{
      dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);
      dummy.updateMatrix();
      if(!batches.has(material))batches.set(material,[]);
      batches.get(material).push(dummy.matrix.clone());
    };
    const height=entry.floors*FLOOR_HEIGHT+.45;
    const plaster=entry.kind==="old"?oldWall:wall;
    // Continuous shell, narrow lobby, and windows by the staircase at each landing.
    put(12,.22,14,concrete,0,-.12,0);
    put(.19,height,14,plaster,-6,height/2,0);
    put(.19,height,14,plaster,6,height/2,0);
    put(12,height,.19,plaster,0,height/2,-7);
    put(12,height,.19,plaster,0,height/2,7);
    put(12,.25,14,edge,0,height-.08,0);
    // Walkable corridor shelves on higher floors (stairs stay open).
    for(let floor=0;floor<entry.floors;floor++){
      const y=floor*FLOOR_HEIGHT;
      if(floor>0){
        put(5.5,.18,12.2,steps,3.12,y-.11,0);
        put(5.15,.17,1.75,steps,-2.45,y-.11,3.45);
        put(5.0,.16,1.35,steps,-2.45,y-.1,-4.68);
      }
      put(2.35,2.64,.14,darkDoor,2.35,y+1.32,-6.78);
      put(2.35,2.64,.14,darkDoor,4.73,y+1.32,-6.78);
      put(4.5,.14,.24,white,3.52,y+2.76,-6.76);
      put(4.5,.16,.16,edge,3.52,y+.14,-6.76);
      // Window glass on landing-side wall and frames.
      const shade=mat(0x6f8c94,{metalness:.05,roughness:.3});
      put(.16,1.5,1.4,shade,-5.84,y+1.78,-3.25);
      put(.20,.08,1.47,edge,-5.73,y+1.78,-3.25);
      put(1.4,.13,.55,warm,3.2,y+2.8,-2.0);
      // Two switch-back flights, real geometry and smooth stair-height sampling.
      if(floor<entry.floors-1){
        const stepsPerFlight=12;
        for(let i=0;i<stepsPerFlight;i++){
          const t=(i+.5)/stepsPerFlight;
          const z1=FRONT-(FRONT-BACK)*t;
          const z2=BACK+(FRONT-BACK)*t;
          const h=RISE*t;
          put(1.8,.16,.56,steps,-3.85,y+h-.08,z1);
          put(1.8,.16,.56,steps,-1.04,y+RISE+h-.08,z2);
        }
        put(4.86,.18,1.05,steps,-2.38,y+RISE-.09,-4.65);
        // Railings: functional visual guidance along both flights.
        put(.09,.10,7.6,metal,-2.80,y+1.21,-.45);
        put(.09,.10,7.6,metal,-.06,y+RISE+1.21,-.45);
        for(let i=0;i<6;i++){
          const z=2.65-i*1.2;
          put(.065,1.05,.065,metal,-2.80,y+.78,z);
          put(.065,1.05,.065,metal,-.06,y+RISE+.78,z);
        }
      }
    }
    // Interior ground-floor elevator-sized mailbox bank.
    put(.22,1.85,2.5,metal,5.55,1.5,-1.35);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++){
      put(.06,.34,.5,mail,5.41,.93+row*.42,-2.15+col*.52);
      put(.07,.033,.19,edge,5.37,1.05+row*.42,-2.15+col*.52);
    }
    put(2.3,2.82,.17,darkDoor,0,1.42,6.82);
    const plaque=label(entry.kind==="old"?"СТАРЫЙ ФОНД":"ПАНЕЛЬНЫЙ ДОМ","#fff4dc","#45575e",3.6,.52);
    plaque.position.set(2.55,2.82,6.68);root.add(plaque);
    const exitSign=label("ВЫХОД","#e3f4ec","#49625a",1.7,.5);
    exitSign.position.set(0,3.23,6.7);root.add(exitSign);
    for(const [material,mats] of batches){
      const mesh=new THREE.InstancedMesh(unit,material,mats.length);
      mats.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();mesh.receiveShadow=true;
      root.add(mesh);
    }
    // Entry canopy/door in external world; entrance marker always outside wall collision.
    const frame=mat(0x53636b),glass=mat(0x849da2,{roughness:.36});
    box(2.5,2.95,.18,frame,entry.x,1.47,entry.frontZ-.22,world);
    box(1.47,1.78,.1,glass,entry.x,1.74,entry.frontZ-.34,world);
    box(.12,.28,.13,warm,entry.x+.91,1.4,entry.frontZ-.39,world);
    const sign=label("ПОДЪЕЗД "+entry.number,"#fff1d6","#4c6264",3,.58);
    sign.position.set(entry.x,3.22,entry.frontZ-.3);world.add(sign);
    const glow=mat(0x83b4aa,{emissive:0x439888,emissiveIntensity:.35});
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.75,.07,5,24),glow);
    halo.rotation.x=-Math.PI/2;halo.position.set(entry.x,.15,entry.z);
    world.add(halo);
    regions.push({...entry,root,centerX:root.position.x,visited:false,halo});
  });
  return regions;
}
