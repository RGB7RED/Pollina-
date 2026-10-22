// MINI CITY 0.3.1 — proportionate lightweight procedural pedestrians.
// Shared geometries/materials: no expensive rigged GLB downloads required.
// Arm and leg pivots support walk, jogging and a proper seated pose.
export function createCharacterFactory(THREE) {
  const box=new THREE.BoxGeometry(1,1,1);
  const sphere=new THREE.SphereGeometry(1,12,9);
  const cylinder=new THREE.CylinderGeometry(1,1,1,9);
  const cache=new Map();
  function mat(c) {
    if(!cache.has(c))cache.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.86,metalness:0}));
    return cache.get(c);
  }
  function block(parent,w,h,d,color,x,y,z) {
    const m=new THREE.Mesh(box,mat(color));
    m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;
    parent.add(m);return m;
  }
  function ellipsoid(parent,x,y,z,rx,ry,rz,color) {
    const m=new THREE.Mesh(sphere,mat(color));
    m.scale.set(rx,ry,rz);m.position.set(x,y,z);m.castShadow=true;
    parent.add(m);return m;
  }
  function tapered(parent,x,y,z,rt,rb,h,color){
    const m=new THREE.Mesh(cylinder,mat(color));
    m.scale.set(rt,h,rb);m.position.set(x,y,z);m.castShadow=true;
    parent.add(m);return m;
  }
  const outfits=[
    {jacket:0x364b5e,shirt:0x93a0a4,jeans:0x28333d,skin:0xcba286,hair:0x302626},
    {jacket:0x756752,shirt:0xa6997b,jeans:0x3b4045,skin:0xd2a78b,hair:0x393131},
    {jacket:0x526355,shirt:0xaaa69b,jeans:0x4a4543,skin:0xc08b72,hair:0x34251c},
    {jacket:0x6f6469,shirt:0xc2b1a7,jeans:0x303f49,skin:0xd7ab8c,hair:0x443632},
    {jacket:0x505963,shirt:0x939da1,jeans:0x35363b,skin:0xe0b59b,hair:0x76675a},
    {jacket:0x82775e,shirt:0xbeb19e,jeans:0x454548,skin:0xaf8069,hair:0x28252a},
    {jacket:0x65525a,shirt:0xa49599,jeans:0x393c42,skin:0xcba38a,hair:0x423630},
    {jacket:0x435260,shirt:0x82939b,jeans:0x2f353c,skin:0xd3b397,hair:0x282628},
  ];
  return function createHuman(palette=0){
    const style=outfits[palette%outfits.length],female=palette>0&&palette%3===1;
    const rig=new THREE.Group();
    const height=palette>0 ? .94+(palette%5)*.027:1;
    rig.scale.set(height,height,height);
    // Shoes and calves reach the ground when rig.position.y=0.
    block(rig,.58,.29,.34,style.jeans,0,1.07,0);
    const torso=new THREE.Group();torso.position.set(0,1.65,0);rig.add(torso);
    tapered(torso,0,0,0,female?.34:.39,.29,.99,style.jacket);
    block(torso,.44,.11,.32,style.shirt,0,.45,-.06);
    // Collar and jacket pockets.
    for(const side of [-1,1]){
      block(torso,.18,.26,.035,style.shirt,side*.17,.27,-.32);
    }
    tapered(rig,0,2.28,0,.15,.15,.21,style.skin);
    const head=new THREE.Group();head.position.set(0,2.69,0);rig.add(head);
    ellipsoid(head,0,0,0,.305,.392,.295,style.skin);
    // Low profile scalp and short hair, instead of a giant cube.
    ellipsoid(head,0,.277,.03,.312,.155,.305,style.hair);
    ellipsoid(head,0,.09,.265,.205,.08,.075,style.skin);
    for(const side of [-1,1]){
      ellipsoid(head,side*.125,.02,-.264,.030,.026,.027,0x2c3135);
      ellipsoid(head,side*.302,-.034,0,.055,.092,.057,style.skin);
    }
    block(head,.12,.025,.026,0x775b51,0,-.21,-.274);
    const arms=[];
    for(const side of [-1,1]){
      const upper=new THREE.Group();upper.position.set(side*.45,2.08,0);rig.add(upper);
      tapered(upper,0,-.37,0,.20,.15,.68,style.jacket);
      const elbow=new THREE.Group();elbow.position.set(0,-.67,0);upper.add(elbow);
      tapered(elbow,0,-.24,0,.12,.1,.4,style.skin);
      ellipsoid(elbow,0,-.44,-.03,.114,.14,.12,style.skin);
      arms.push({upper,elbow});
    }
    const legs=[];
    for(const side of [-1,1]){
      const thigh=new THREE.Group();thigh.position.set(side*.20,1.06,0);rig.add(thigh);
      tapered(thigh,0,-.32,0,.20,.18,.62,style.jeans);
      const shin=new THREE.Group();shin.position.set(0,-.64,0);thigh.add(shin);
      tapered(shin,0,-.30,0,.164,.127,.56,style.jeans);
      ellipsoid(shin,0,-.62,-.115,.20,.115,.31,0x24262a);
      legs.push({thigh,shin});
    }
    if(palette===0){
      // Soft backpack, correctly fitted to shoulders.
      block(rig,.65,.78,.26,0x343f45,0,1.64,.3);
      for(const side of [-1,1])block(rig,.07,.84,.065,0x756c5d,side*.30,1.69,.14);
    }
    return {g:rig,torso,head,leftArm:arms[0].upper,rightArm:arms[1].upper,
      leftLeg:legs[0].thigh,rightLeg:legs[1].thigh,
      arms,legs,sitBlend:0,female,variation:palette,
      setPose(speed,time,seated=false,dt=.016){
        const blend=1-Math.exp(-dt*8);
        this.sitBlend+=(Number(seated)-this.sitBlend)*blend;
        const sit=this.sitBlend;
        const walk=Math.min(1,speed/4.2)*(1-sit);
        const stride=Math.sin(time*(speed>4.5?11.2:8.3)+palette*.4);
        const step=stride*.55*walk;
        this.legs[0].thigh.rotation.x=step*(1-sit)+sit*1.4;
        this.legs[1].thigh.rotation.x=-step*(1-sit)+sit*1.4;
        this.legs[0].shin.rotation.x=Math.max(0,-stride)*.23*walk-sit*1.27;
        this.legs[1].shin.rotation.x=Math.max(0,stride)*.23*walk-sit*1.27;
        this.arms[0].upper.rotation.x=-step*.75+sit*(-.20);
        this.arms[1].upper.rotation.x=step*.75+sit*(-.20);
        this.arms[0].elbow.rotation.x=-.12-sit*.15;
        this.arms[1].elbow.rotation.x=-.12-sit*.15;
        this.torso.rotation.x=sit*.045;
        this.torso.position.y=1.65+Math.abs(stride)*walk*.032;
        this.head.rotation.y=Math.sin(time*.66+palette)*.045*(1-sit);
      }
    };
  };
}
