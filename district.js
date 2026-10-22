// MINI CITY 0.2 — modular expansion of the city beyond its first central block.
// All coordinates are authored in world units. Streets are at x/z = -91, 0, 91.
export function buildDistrictBuildings({ building, box, flat, mat, world, walls }) {
  // Petersburg-inspired perimeter blocks: subdued sandstone, pale green and pink.
  // The central quarter is preserved so the first prototype's points of interest stay valid.
  const parcels = [
    [-119,-126,19,19,5,1],[-140,-125,16,16,4,4],
    [-118,-42,19,20,5,2],[-140,-43,16,20,4,3],
    [-119,40,18,22,5,5],[-140,41,16,19,4,0],
    [-120,124,19,19,5,4],[-141,128,16,19,4,1],
    [119,-126,19,19,5,4],[141,-126,16,16,4,1],
    [118,-42,20,20,5,5],[141,-42,16,17,4,2],
    [118,40,18,20,5,3],[140,41,16,19,4,4],
    [119,123,19,20,5,1],[140,128,16,18,4,5],
    [-43,-120,21,18,4,0],[-64,-136,17,17,3,3],
    [41,-120,22,18,4,2],[65,-137,17,17,3,5],
    [-42,120,20,18,5,3],[-64,137,17,16,3,1],
    [42,121,20,19,4,5],[65,137,17,17,3,2]
  ];
  const trim = mat(0xddd1bb), stone = mat(0x7d8986), ochre = mat(0x9e8770);
  for (let i=0;i<parcels.length;i++){
    const [x,z,w,d,floor,style]=parcels[i];
    building(x,z,w,d,floor,style);
    // Warm stone base and simple projecting cornice, visible in a distant silhouette.
    box(w+.26,.42,d+.26,stone,x,.24,z);
    box(w+.5,.19,d+.5,trim,x,floor*3.05-.18,z);
    // Vertical pilasters on street-facing corners.
    box(.29,floor*3.05,d+.13,trim,x-w/2+.3,floor*3.05/2,z);
    box(.29,floor*3.05,d+.13,trim,x+w/2-.3,floor*3.05/2,z);
    if(i%2===0) {
      const balconyZ=z-d/2-.55;
      for(let f=1;f<Math.min(floor,4);f+=2) {
        // Two small balconies and iron railings.
        for(const dx of [-w*.23,w*.23]){
          box(2.3,.17,1.35,stone,x+dx,f*3.05+.62,balconyZ);
          box(2.3,.55,.09,ochre,x+dx,f*3.05+.92,balconyZ-.65);
          for (const ex of [-1.01,0,1.01])box(.065,.53,.08,stone,x+dx+ex,f*3.05+.93,balconyZ-.72);
        }
      }
    }
  }
  // Courtyard paving and secluded recesses make the block readable to future missions.
  const yard=mat(0x999c8b);
  for(const [x,z,w,d] of [[-48,78,26,14],[49,-78,26,14],[118,77,23,11],[-116,-75,23,11]]){
    flat(w,d,yard,x,z,.027);
  }
  // Decorative walk-through archways (no hidden collider).
  const arch=mat(0xb9aa98);
  for(const [x,z,rotation] of [[-69,78,0],[70,-75,0],[108,70,1],[-108,-72,1]]){
    const g=new world.constructor(); world.add(g);
    // g is parent group, position and local geometry keep arch open for later entry.
    g.position.set(x,0,z);g.rotation.y=rotation?Math.PI/2:0;
    box(.95,3.6,1.05,arch,-2.25,1.8,0,g);
    box(.95,3.6,1.05,arch,2.25,1.8,0,g);
    box(5.4,.65,1.25,trim,0,3.87,0,g);
  }
  return parcels.length;
}

export function buildDistrictProps({ tree, bench, lamp, car, roadSign, box, flat, mat }) {
  const treelines=[-143,-118,-64,-42,40,63,117,144];
  for(let i=0;i<treelines.length;i++){
    const c=treelines[i];
    if(Math.abs(c)<90)continue;
    tree(c,-14,i);tree(c,14,i+1);
    tree(-14,c,i+2);tree(14,c,i+3);
  }
  for (const [x,z] of [[-130,-72],[-111,-64],[-128,75],[-113,70],[124,-73],[132,74],
                        [-71,-122],[74,-116],[-75,121],[73,116],[-132,146],[132,-147]]){
    tree(x,z,Math.abs(Math.round(x))%3);
  }
  for (const [x,z,rot] of [[-112,-72,0],[117,67,0],[-60,101,Math.PI/2],[61,-101,0],[-126,112,Math.PI/2]]){
    bench(x,z,rot);
  }
  for (const [x,z] of [[-102,-130],[-103,-40],[-103,44],[-103,130],
                       [103,-130],[103,-42],[103,45],[103,128],
                       [-134,-103],[-44,-103],[43,-103],[132,-103],
                       [-134,104],[-43,104],[43,104],[131,104]])lamp(x,z);
  for (const [x,z,t] of [[-99,-82,"НАБЕРЕЖНАЯ"],[99,85,"УЛ. САДОВАЯ"],[-76,102,"ДВОР"],[75,-102,"ПРОЕЗД"]])roadSign(x,z,t);
  const colors=[0xbfa776,0x5e8192,0x8c927e,0xae7061];
  for(const [x,z,rot,c] of [[-96,-60,0,0],[96,51,0,1],[-37,96,Math.PI/2,2],
                           [47,-96,Math.PI/2,3],[96,-124,0,0],[-96,119,0,2]]){
    car(x,z,colors[c],rot);
  }
  // Low walls, bins and planters. Kept away from crossing paths.
  const metal=mat(0x4d5b5d),brick=mat(0x8e756b);
  for(const [x,z] of [[-110,-74],[112,72],[-62,106],[62,-106]]){
    box(4,.5,.5,brick,x,.25,z);
    box(.52,.63,.52,metal,x+2.8,.33,z);
    box(.52,.63,.52,metal,x+3.5,.33,z);
  }
  for(const [x,z] of [[-53,74],[53,-74],[128,-73],[-127,73]]){
    flat(8,5,mat(0x93a37e),x,z,.038);
    for(let i=-1;i<=1;i++)box(.63,.52,.63,mat(i===0?0x688857:0x6b845a),x+i*2,.26,z);
  }
}