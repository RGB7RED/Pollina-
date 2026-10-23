// MINI CITY 4.3.5 — reusable authored grass mesh for city, road-only
// inspector and dedicated grass laboratory. No textures, RNG, Web APIs.
export const GRASS_PALETTE=Object.freeze([
  {name:"deep",color:0x4c8e41},
  {name:"fresh",color:0x6ca651},
  {name:"sun",color:0x94b96d}
]);
export const BLADES_PER_TUFT=8;
export const TRIANGLES_PER_TUFT=BLADES_PER_TUFT*4;

// Eight thinner tapered leaves with a middle bend and a narrow pointed tip.
// This is actual 3D leaf geometry, NOT crossed opaque rectangles.
export function createGrassTuftGeometry(THREE){
  const positions=[],indices=[];
  const add=(x,y,z)=>{positions.push(x,y,z);};
  for(let n=0;n<BLADES_PER_TUFT;n++){
    const a=n*Math.PI*(3-Math.sqrt(5)); // phyllotactic spread
    const c=Math.cos(a),s=Math.sin(a);
    const sideX=-s,sideZ=c;
    const rr=.09+(n%3)*.095;
    const height=.73+(n%4)*.086;
    const bend=.18+(n%2)*.070;
    const width=.126-(n%3)*.009;
    const cx=c*rr,cz=s*rr;
    const start=positions.length/3;
    for(const [t,r] of [[0,1],[.55,.53],[1,.012]]){
      const midX=cx+c*bend*t*t,midZ=cz+s*bend*t*t;
      const w=width*r;
      add(midX-sideX*w/2,height*t,midZ-sideZ*w/2);
      add(midX+sideX*w/2,height*t,midZ+sideZ*w/2);
    }
    indices.push(
      start,start+2,start+1,
      start+1,start+2,start+3,
      start+2,start+4,start+3,
      start+3,start+4,start+5
    );
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
export function addGrassToGroup(THREE,root,tufts){
  if(!Array.isArray(tufts)||tufts.length===0)return [];
  const geo=createGrassTuftGeometry(THREE),buckets=[[],[],[]];
  for(let i=0;i<tufts.length;i++)buckets[i%3].push(tufts[i]);
  const meshes=[];
  for(let k=0;k<GRASS_PALETTE.length;k++){
    const items=buckets[k];
    if(!items.length)continue;
    const mat=new THREE.MeshStandardMaterial({
      color:GRASS_PALETTE[k].color,roughness:1,metalness:0,
      side:THREE.DoubleSide
    });
    const mesh=new THREE.InstancedMesh(geo,mat,items.length);
    mesh.name="grass-patch-"+GRASS_PALETTE[k].name;
    const tmp=new THREE.Object3D();
    items.forEach((p,i)=>{
      tmp.position.set(p.x,-.096,p.z);
      tmp.scale.set(p.width,p.height,p.width);
      tmp.rotation.set(0,p.angle,0);tmp.updateMatrix();
      mesh.setMatrixAt(i,tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
    mesh.frustumCulled=false;
    mesh.computeBoundingSphere();
    root.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}
