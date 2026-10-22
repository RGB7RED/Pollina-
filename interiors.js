// MINI CITY 0.3 — self-contained, inexpensive playable stairwell interiors.
// The interiors are reusable templates and intentionally have only a ground floor.
// More floors, apartments and stash mechanics belong to later releases.

export const ENTRANCES = Object.freeze([
  {id:"entrance-1", number:1, name:"Подъезд №1", x:-32, z:-46.9, frontZ:-44.5},
  {id:"entrance-2", number:2, name:"Подъезд №2", x:32, z:-46.2, frontZ:-43.5},
  {id:"entrance-3", number:3, name:"Подъезд №3", x:-58, z:22.8, frontZ:25.5},
]);

const MAILBOX={x:4.45,z:-1.35};
const EXIT={x:0,z:5.45};

export function indoorBlocked(x,z) {
  const r=.43;
  if(x-r<-5.65 || x+r>5.65 || z-r<-6.45 || z+r>6.45)return true;
  // Stairs rise behind the landing and are scenery for now.
  if(x-r<-1.75 && x+r>-5.25 && z-r<-1.8 && z+r>-5.95)return true;
  return false;
}
export function nearIndoorObject(localX,localZ) {
  const exitDist=Math.hypot(localX-EXIT.x,localZ-EXIT.z);
  const boxDist=Math.hypot(localX-MAILBOX.x,localZ-MAILBOX.z);
  if(exitDist<2.25)return {type:"lobby-exit",title:"Выйти во двор",distance:exitDist};
  if(boxDist<2.25)return {type:"mailboxes",title:"Осмотреть почтовые ящики",distance:boxDist};
  return null;
}

export function buildInteriors({THREE,scene,world,box,mat,label,orb}) {
  const floor=mat(0x888f91);
  const wall=mat(0xc1c4b4);
  const trim=mat(0x7b8c8b);
  const wood=mat(0x766255);
  const iron=mat(0x44545d);
  const accent=mat(0x455a62);
  const letter=mat(0xc3b18d);
  const light=mat(0xf9e2b0,{emissive:0xffe0a0,emissiveIntensity:.65});

  const rooms=[];
  for(let i=0;i<ENTRANCES.length;i++){
    const item=ENTRANCES[i];
    // Separate static props per scene: hidden rooms do not render.
    const root=new THREE.Group();
    root.position.set(440+i*36,0,0);
    root.visible=false;
    scene.add(root);

    // Lobby floor and four walls, with a distinct opening marker by the exit.
    box(12,.18,14,floor,0,-.08,0,root);
    box(12,4.25,.22,wall,0,2.05,-7,root);
    box(12,4.25,.22,wall,0,2.05,7,root);
    box(.22,4.25,14,wall,-6,2.05,0,root);
    box(.22,4.25,14,wall,6,2.05,0,root);
    box(12,.17,14,trim,0,4.28,0,root);

    // Front exit; clicking near it teleports back to the exact street entrance.
    box(2.6,2.85,.15,accent,0,1.43,6.81,root);
    box(1.8,2.2,.08,mat(0x677d86),0,1.6,6.69,root);
    orb(.1,light,.79,1.18,6.62,root);
    const exitSign=label("ВЫХОД","#ffffff","#31565b",3.15,.65);
    exitSign.position.set(0,3.33,6.74);
    root.add(exitSign);

    // Staircase, with platforms and handrail; only ground level playable in 0.3.
    for(let step=0;step<5;step++){
      const h=.23*(step+1);
      box(3.4,h,.75,floor,-3.55,h/2,-2.2-step*.76,root);
    }
    box(3.7,.16,.95,trim,-3.55,1.33,-5.8,root);
    box(.09,1.25,4.45,iron,-1.69,.89,-4.09,root);
    for(let z=-2.2;z>-5.8;z-=.9)box(.08,1.0,.08,iron,-1.69,.56,z,root);
    const stairsSign=label("ЛЕСТНИЦА","#ffffff","#475b60",3.25,.58);
    stairsSign.position.set(-3.5,2.68,-6.78);root.add(stairsSign);

    // Mailboxes can be examined by pressing ACTION near the wall.
    box(.17,1.7,2.3,iron,5.67,1.6,-1.36,root);
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      box(.07,.42,.49,letter,5.54,1.06+row*.52,-2.13+col*.52,root);
      box(.072,.045,.22,iron,5.49,1.17+row*.52,-2.13+col*.52,root);
    }
    // Walls of neighboring flats with an apartment number.
    for(let a=0;a<2;a++){
      const x=-.8+a*3.45;
      box(2.1,2.86,.16,wood,x,1.43,-6.82,root);
      const plate=label(String(a+i*2+1),"#fbe7c1","#394955",.56,.45);
      plate.position.set(x,1.94,-6.69);root.add(plate);
    }
    for(let j=0;j<3;j++){
      box(.14,.55,.14,iron,4.8-j*.37,.59,3.6,root);
    }
    // Ceiling lights emit without adding dynamic shadow-casting point lights.
    box(2.1,.12,.8,light,0,4.14,-2.0,root);
    box(1.5,.12,.55,light,0,4.14,3.5,root);

    // Street-facing sign above a recognizable blue doorway.
    box(2.26,2.72,.17,accent,item.x,1.36,item.frontZ-.23,world);
    box(1.14,1.62,.18,mat(0x708894),item.x,1.54,item.frontZ-.34,world);
    box(.17,.21,.2,light,item.x+.79,1.3,item.frontZ-.39,world);
    const plaque=label("ПОДЪЕЗД "+item.number,"#fff4e2","#3b5a63",2.9,.57);
    plaque.position.set(item.x,3.04,item.frontZ-.33);
    world.add(plaque);
    box(2.65,.12,1.1,floor,item.x,.08,item.frontZ-.94,world);

    // Glowing marker one stride away from facade, outside building collision.
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.72,.055,5,24),
      mat(0xb2e4d9,{emissive:0x4db9a2,emissiveIntensity:.45}));
    halo.rotation.x=-Math.PI/2;
    halo.position.set(item.x,.13,item.z);
    world.add(halo);
    rooms.push({...item,root,centerX:root.position.x,visited:false,halo});
  }
  return rooms;
}
