import {GLTFExporter} from "three/addons/exporters/GLTFExporter.js";
import {makePanelTexture} from "./materials.js";

// Create a portable glTF export scene, independent from the rendered lab.
// The Building Lab concrete-panel atlas is projected with world-space
// coordinates. Portable glTF needs baked UVs on those two wall batches.
// All window meshes stay physically transparent and remain instanced.
export function makePortableHouse(THREE,labRoot,{panelTexture=makePanelTexture(THREE)}={}){
  const portable=new THREE.Group();
  portable.name="MINI_CITY_apartment_house";
  let bakedWalls=0,instances=0,roofCount=0;
  for(const original of labRoot.children){
    const isInstanced=original.isInstancedMesh===true;
    const isMasonry=isInstanced&&typeof original.material?.customProgramCacheKey==="function"
      &&original.material.customProgramCacheKey()==="mini-city-world-panel-v1";
    if(isMasonry){
      // Expand ONLY structural panel geometry, not window or balcony
      // details. Different world-space wall transforms need unique UVs.
      const g=original.geometry.index?
        original.geometry.toNonIndexed():original.geometry;
      const pos=g.getAttribute("position"),normal=g.getAttribute("normal");
      const verticesPerBox=pos.count;
      const positions=new Float32Array(original.count*verticesPerBox*3);
      const normals=new Float32Array(positions.length);
      const uvs=new Float32Array(original.count*verticesPerBox*2);
      const matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
      const worldPos=new THREE.Vector3(),worldNormal=new THREE.Vector3();
      const uvScale=original.material.userData.miniCityPanelScale;
      if(!uvScale||uvScale.length!==2)
        throw Error("World-aligned panel texture scale is missing");
      for(let i=0;i<original.count;i++){
        original.getMatrixAt(i,matrix);
        normalMatrix.getNormalMatrix(matrix);
        for(let k=0;k<verticesPerBox;k++){
          worldPos.fromBufferAttribute(pos,k).applyMatrix4(matrix);
          worldNormal.fromBufferAttribute(normal,k).applyMatrix3(normalMatrix).normalize();
          const n=i*verticesPerBox+k;
          positions[n*3]=worldPos.x;
          positions[n*3+1]=worldPos.y;
          positions[n*3+2]=worldPos.z;
          normals[n*3]=worldNormal.x;
          normals[n*3+1]=worldNormal.y;
          normals[n*3+2]=worldNormal.z;
          const ax=Math.abs(worldNormal.x),ay=Math.abs(worldNormal.y),az=Math.abs(worldNormal.z);
          let u,v;
          if(ax>az&&ax>ay){u=worldPos.z;v=worldPos.y;}
          else if(ay>az){u=worldPos.x;v=worldPos.z;}
          else{u=worldPos.x;v=worldPos.y;}
          uvs[n*2]=u/uvScale[0];
          uvs[n*2+1]=v/uvScale[1];
        }
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
      geo.setAttribute("normal",new THREE.BufferAttribute(normals,3));
      geo.setAttribute("uv",new THREE.BufferAttribute(uvs,2));
      geo.computeBoundingSphere();
      const mat=new THREE.MeshStandardMaterial({
        name:"world_baked_panel",
        color:original.material.color.clone(),
        map:panelTexture,
        roughness:.94,
        metalness:0
      });
      const mesh=new THREE.Mesh(geo,mat);
      mesh.name="masonry_world_baked";
      portable.add(mesh);bakedWalls+=original.count;
      continue;
    }
    const copy=original.clone();
    // Don't export cached BSphere or unrelated lab runtime metadata.
    copy.userData={};
    copy.castShadow=false;copy.receiveShadow=false;
    portable.add(copy);
    if(isInstanced)instances+=original.count;
    else if(original.name?.includes("flat five-storey roof"))roofCount++;
  }
  portable.userData={
    asset:"mini-city/apartment_house",stage:"3.4",
    dimensionsMetres:[labRoot.userData.config.length,labRoot.userData.config.width,
      labRoot.userData.roofTop],
    note:"Five-storey precast panel Khrushchevka with flat bitumen roof; original door/pad layout",
  };
  return {root:portable,stats:{bakedWallParts:bakedWalls,instancedParts:instances,
    roofs:roofCount,totalNodes:portable.children.length}};
}
export async function encodeHouseGLB(THREE,labRoot){
  const {root,stats}=makePortableHouse(THREE,labRoot);
  try{
    const exporter=new GLTFExporter();
    const result=await exporter.parseAsync(root,{
      binary:true,trs:true,onlyVisible:true,
      includeCustomExtensions:false,
      maxTextureSize:1024
    });
    if(!(result instanceof ArrayBuffer)||result.byteLength<2048)
      throw Error("GLB exporter returned empty/nonbinary data");
    const view=new DataView(result);
    if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2
      ||view.getUint32(8,true)!==result.byteLength)
      throw Error("Invalid glTF binary header");
    return {buffer:result,stats};
  }finally{
    // Only export-specific assets are disposed; the visible lab is untouched.
    root.traverse(obj=>{
      if(obj.name==="masonry_world_baked"){
        obj.geometry?.dispose();
        obj.material?.dispose();
      }
    });
  }
}
export function downloadGLB(buffer,filename="apartment_house.glb"){
  const url=URL.createObjectURL(new Blob([buffer],{type:"model/gltf-binary"}));
  const link=document.createElement("a");
  link.href=url;
  link.download=filename;
  link.style.display="none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
