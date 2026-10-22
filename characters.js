// MINI CITY 0.3.2 — illustrated urban character rig.
// Rounded silhouettes, tapered clothes and organic face/hair instead of block
// primitives. Geometry and mats are SHARED across hero and 17 pedestrians.
export function createCharacterFactory(THREE) {
  const sphere=new THREE.SphereGeometry(1,14,10);
  const soft=new THREE.SphereGeometry(1,10,8);
  const box=new THREE.BoxGeometry(1,1,1);
  const taperedLeg=new THREE.CylinderGeometry(.17,.14,1,9);
  const taperedArm=new THREE.CylinderGeometry(.145,.11,1,9);
  const torsoGeo=new THREE.LatheGeometry([
    new THREE.Vector2(0,0),new THREE.Vector2(.28,.03),
    new THREE.Vector2(.325,.16),new THREE.Vector2(.355,.39),
    new THREE.Vector2(.38,.65),new THREE.Vector2(.29,.86),
    new THREE.Vector2(.20,.92),new THREE.Vector2(0,.92)
  ],11);
  const cache=new Map();
  const mat=color=>{
    if(!cache.has(color))cache.set(color,new THREE.MeshStandardMaterial({
      color,roughness:.96,metalness:0,flatShading:false
    }));
    return cache.get(color);
  };
  const outfits=[
    {coat:0x425569,shirt:0x9da8a7,trousers:0x373e46,skin:0xc9a080,hair:0x302e2d,accent:0xb2ad94,shoe:0x33363a},
    {coat:0x847164,shirt:0xc2b7ac,trousers:0x505252,skin:0xc58f76,hair:0x574537,accent:0x9c9484,shoe:0x332f2e},
    {coat:0x607468,shirt:0xa4afa0,trousers:0x4e525a,skin:0xd5aa8a,hair:0x403633,accent:0xa8b8aa,shoe:0x384140},
    {coat:0x8a737c,shirt:0xd4c6b6,trousers:0x464551,skin:0xcda58e,hair:0x3b3334,accent:0xc6ae9c,shoe:0x3e3740},
    {coat:0x617181,shirt:0xb1bbbd,trousers:0x343a48,skin:0xbb886e,hair:0x65534e,accent:0xb9b3a0,shoe:0x343c45},
    {coat:0x847d68,shirt:0xbbb7a9,trousers:0x55514f,skin:0xc49a7c,hair:0x38312c,accent:0xc2b4a2,shoe:0x3f3934},
    {coat:0x75616a,shirt:0xb7a2a8,trousers:0x3b4748,skin:0xdaaf90,hair:0x4b3d35,accent:0xd0c3b1,shoe:0x3d3a3e},
    {coat:0x4e5e62,shirt:0xa3aba5,trousers:0x353b3f,skin:0xc89b82,hair:0x302b27,accent:0xaabbb9,shoe:0x2d3233}
  ];
  function mesh(parent,geo,color,x,y,z,sx=1,sy=1,sz=1){
    const m=new THREE.Mesh(geo,mat(color));
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;
    parent.add(m);return m;
  }
  function oval(parent,color,x,y,z,sx,sy,sz){return mesh(parent,soft,color,x,y,z,sx,sy,sz);}
  function strip(parent,color,x,y,z,sx,sy,sz){return mesh(parent,box,color,x,y,z,sx,sy,sz);}
  return function createHuman(index=0){
    const colors=outfits[index%outfits.length];
    const body=new THREE.Group();
    const isWoman=index>0&&index%3===1;
    const scale=index===0?1:.94+(index%5)*.02;
    body.scale.setScalar(scale);
    // Waist follows hips; curved jacket with overlapping cloth layers.
    const pelvis=oval(body,colors.trousers,0,1.10,0,.36,.21,.24);
    const torso=new THREE.Group();torso.position.set(0,1.33,0);body.add(torso);
    const upper=mesh(torso,torsoGeo,colors.coat,0,0,0,isWoman?.90:1,1,1);
    oval(torso,colors.shirt,0,.79,-.055,.205,.135,.20);
    // Two open jacket lapels and zipper: readable even in silhouette.
    for(const side of [-1,1]){
      const lapel=oval(torso,colors.accent,side*.126,.70,-.25,.102,.235,.048);
      lapel.rotation.z=side*.35;
      oval(torso,colors.coat,side*.295,.51,-.13,.12,.33,.18);
    }
    strip(torso,colors.accent,0,.31,-.358,.032,.54,.022);
    oval(body,colors.skin,0,2.30,0,.13,.17,.14);
    const head=new THREE.Group();head.position.set(0,2.61,-.01);body.add(head);
    oval(head,colors.skin,0,0,0,.295,.355,.27);
    // Cheekbones, chin, nose and subtle painted brow line.
    oval(head,colors.skin,0,-.20,-.095,.23,.14,.21);
    oval(head,colors.skin,0,-.043,-.285,.073,.104,.095);
    for(const side of [-1,1]){
      oval(head,colors.skin,side*.285,-.035,0,.063,.10,.066);
      oval(head,0x363a3a,side*.112,.045,-.263,.038,.029,.015);
      oval(head,colors.hair,side*.109,.139,-.24,.093,.024,.029);
    }
    strip(head,0x956d68,0,-.207,-.245,.11,.02,.013);
    // Hair is sculpted from overlapping, tapered volumes, not a box/cap.
    oval(head,colors.hair,0,.245,.037,.303,.16,.286);
    oval(head,colors.hair,-.154,.192,-.204,.18,.095,.12);
    if(index%4===2){
      oval(head,colors.hair,-.282,-.016,.035,.09,.29,.20);
      oval(head,colors.hair,.282,-.016,.035,.09,.29,.20);
    }
    const arms=[],legs=[];
    for(const side of [-1,1]){
      const shoulder=new THREE.Group();shoulder.position.set(side*.405,2.06,0);body.add(shoulder);
      oval(shoulder,colors.coat,0,-.10,0,.185,.205,.20);
      mesh(shoulder,taperedArm,colors.coat,0,-.36,0,1,.66,1);
      const elbow=new THREE.Group();elbow.position.set(0,-.67,0);shoulder.add(elbow);
      mesh(elbow,taperedArm,colors.coat,0,-.25,0,.8,.47,.86);
      oval(elbow,colors.skin,0,-.48,-.02,.111,.14,.12);
      oval(elbow,colors.accent,0,-.42,.003,.113,.065,.12);
      arms.push({upper:shoulder,elbow});
      const hip=new THREE.Group();hip.position.set(side*.18,1.00,0);body.add(hip);
      oval(hip,colors.trousers,0,-.09,0,.205,.22,.195);
      mesh(hip,taperedLeg,colors.trousers,0,-.33,0,1.16,.56,1.16);
      const shin=new THREE.Group();shin.position.set(0,-.62,0);hip.add(shin);
      mesh(shin,taperedLeg,colors.trousers,0,-.29,0,.97,.57,.97);
      oval(shin,colors.shoe,0,-.61,-.145,.19,.12,.33);
      legs.push({thigh:hip,shin});
    }
    // Player wears a soft, fitted canvas shoulder bag.
    if(index===0){
      oval(body,0x3c474c,0,1.48,.29,.35,.45,.155);
      strip(body,0x9e9d8b,-.22,1.74,.246,.07,.78,.045);
      strip(body,0x9e9d8b,.22,1.74,.246,.07,.78,.045);
    } else if(index%3===1){
      // Beanie and longer hair on part of the adult population.
      oval(head,colors.accent,0,.295,.038,.30,.085,.285);
    }
    return {
      g:body,head,torso,leftArm:arms[0].upper,rightArm:arms[1].upper,
      leftLeg:legs[0].thigh,rightLeg:legs[1].thigh,
      arms,legs,female:isWoman,variation:index,sitBlend:0,
      setPose(speed,t,seated=false,dt=.016){
        const blend=1-Math.exp(-dt*7);
        this.sitBlend+=(Number(seated)-this.sitBlend)*blend;
        const sit=this.sitBlend;
        const stride=Math.sin(t*(speed>4.5?11:8.1)+index*.37);
        const amt=Math.min(1,speed/4.2)*(1-sit);
        const swing=stride*.54*amt;
        for(let n=0;n<2;n++){
          const polarity=n? -1:1;
          this.legs[n].thigh.rotation.x=swing*polarity*(1-sit)+sit*1.46;
          this.legs[n].shin.rotation.x=Math.max(0,-stride*polarity)*.29*amt-sit*1.24;
          this.arms[n].upper.rotation.x=-swing*polarity*.7-sit*.13;
          this.arms[n].upper.rotation.z=(n?-.09:.09)*(1-sit);
          this.arms[n].elbow.rotation.x=-.15-sit*.18;
        }
        this.torso.position.y=1.33+Math.abs(stride)*.035*amt;
        this.torso.rotation.x=.03*Math.sin(t*1.2)+sit*.09;
        this.head.rotation.y=.055*Math.sin(t*.58+index)*(1-sit);
      }
    };
  };
}
