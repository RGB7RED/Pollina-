// MINI CITY 4.2.2 — Developer Studio and Game share exactly one live scene.
// This module is an optional presentation/debug layer, not a second game.
export const MODES=Object.freeze({LAB:"lab",GAME:"game"});
export function parseStudioMode(search=""){
  const query=new URLSearchParams(search.startsWith("?")?search.slice(1):search);
  return query.get("mode")===MODES.GAME?MODES.GAME:MODES.LAB;
}
export function renderDebugInfo({fps=0,drawCalls=0,triangles=0,geometries=0,
  textures=0,position={x:0,y:0,z:0},view="third",collided=false}={}){
  const n=value=>Number.isFinite(value)?value:0;
  return {
    performance:`FPS: ${Math.round(n(fps))} · Вызовы: ${Math.round(n(drawCalls))} · Треугольники: ${Math.round(n(triangles))}`,
    resources:`Геометрии: ${Math.round(n(geometries))} · Текстуры: ${Math.round(n(textures))}`,
    actor:view==="free"?
      `Свободная камера · X: ${n(position.x).toFixed(2)} · Y: ${n(position.y).toFixed(2)} · Z: ${n(position.z).toFixed(2)} м`:
      `X: ${n(position.x).toFixed(2)} м · Z: ${n(position.z).toFixed(2)} м · ${view==="first"?"1-е":"3-е"} лицо`,
    collision:collided?"Столкновение: ДА":"Столкновение: нет"
  };
}
export function buildColliderGizmos(THREE,obstacles){
  // One GPU batch for every blocking rectangle. Created lazily and only
  // displayed in LAB; completely invisible in GAME.
  const geometry=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshBasicMaterial({
    color:0x6af0bd,wireframe:true,transparent:true,opacity:.48,
    depthTest:false,depthWrite:false
  });
  const batch=new THREE.InstancedMesh(geometry,material,obstacles.length);
  batch.name="DEV_ONLY_COLLISION_BOUNDS";
  batch.visible=false;
  batch.frustumCulled=false;
  batch.renderOrder=90;
  const transform=new THREE.Object3D();
  for(let i=0;i<obstacles.length;i++){
    const o=obstacles[i];
    const width=o.maxX-o.minX,depth=o.maxZ-o.minZ;
    if(!(width>0&&depth>0))throw Error("Invalid collision rectangle "+o.name);
    transform.position.set((o.minX+o.maxX)/2,.17,(o.minZ+o.maxZ)/2);
    transform.scale.set(width,.34,depth);
    transform.updateMatrix();
    batch.setMatrixAt(i,transform.matrix);
  }
  batch.instanceMatrix.needsUpdate=true;
  batch.computeBoundingSphere();
  return batch;
}

export class DeveloperStudio{
  constructor({THREE,scene,renderer,controller,house,street,streetPlan}){
    this.THREE=THREE;this.scene=scene;this.renderer=renderer;
    this.controller=controller;
    this.mode=parseStudioMode(window.location.search);
    this.gizmos=null;this.collisionsShown=false;
    const get=id=>{
      const el=document.getElementById(id);
      if(!el)throw Error("Developer Studio control missing: "+id);
      return el;
    };
    this.nodes={
      toggle:get("mode-toggle"),title:get("play-title"),panel:get("devtools"),
      panelToggle:get("devtools-toggle"),body:get("devtools-body"),
      collisions:get("dev-collisions"),
      perf:get("dev-perf"),resources:get("dev-resources"),
      player:get("dev-player"),collision:get("dev-hit"),
      objects:get("dev-objects"),route:get("dev-route")
    };
    const n=this.nodes;
    n.objects.textContent=`Объекты лаборатории: 1 дом · ${streetPlan.info.trees} деревьев · ${streetPlan.info.lamps} фонарей · ${streetPlan.info.benches} скамейки · свободная камера без персонажа`;
    n.route.textContent=`Сцена: дом (${house.children.length} групп) + улица (${street.children.length} групп). Всего препятствий: ${controller.obstacles.length}.`;
    n.toggle.addEventListener("click",()=>this.setMode(
      this.mode===MODES.LAB?MODES.GAME:MODES.LAB,true));
    n.panelToggle.addEventListener("click",()=>{
      const opened=n.body.hidden;
      n.body.hidden=!opened;
      n.panelToggle.setAttribute("aria-expanded",String(opened));
      n.panelToggle.textContent=opened?"▴ Свернуть":"▾ Развернуть";
    });
    n.collisions.addEventListener("click",()=>{
      this.setCollisions(!this.collisionsShown);
    });
    window.addEventListener("popstate",()=>{
      this.setMode(parseStudioMode(window.location.search),false);
    });
    this.applyMode();
  }
  setMode(mode,writeHistory=false){
    if(mode!==MODES.LAB&&mode!==MODES.GAME)
      throw Error("Unsupported studio mode "+mode);
    if(writeHistory&&mode!==this.mode){
      const url=new URL(window.location.href);
      url.searchParams.set("mode",mode);
      window.history.pushState({miniCityMode:mode},"",url);
    }
    this.mode=mode;
    this.applyMode();
  }
  applyMode(){
    const lab=this.mode===MODES.LAB,n=this.nodes;
    document.body.classList.toggle("game-mode",!lab);
    document.body.classList.toggle("lab-mode",lab);
    n.panel.hidden=!lab;
    n.title.textContent=lab?"MINI CITY · Лаборатория игры":"MINI CITY";
    n.toggle.textContent=lab?"🎮 Перейти в игру":"🧪 Режим разработчика";
    n.toggle.setAttribute("aria-label",lab?
      "Перейти в игру без панели разработчика":
      "Вернуться в лабораторию игры");
    if(!lab)this.setCollisions(false);
    document.title=lab?"MINI CITY · Лаборатория сцены · свободная камера":
      "MINI CITY · Играть 4.5.4.1";
  }
  refreshCollisions(){
    // The first door adds/removes one REAL blocking rectangle on swing.
    // Invalidate the optional debug batch, never leave ghost collisions.
    if(this.gizmos){
      this.scene.remove(this.gizmos);
      this.gizmos.geometry.dispose();
      this.gizmos.material.dispose();
      this.gizmos=null;
    }
    if(this.collisionsShown)this.setCollisions(true);
    this.nodes.route.textContent="Препятствия: "+
      this.controller.obstacles.length+" · подъезд №1 "+
      (this.controller.entryDoorOpen?"открыт":"закрыт")+
      " · внутренняя "+(this.controller.innerDoorOpen?"открыта":"закрыта");
  }
  setCollisions(show){
    const next=Boolean(show)&&this.mode===MODES.LAB;
    if(next&&!this.gizmos){
      this.gizmos=buildColliderGizmos(this.THREE,this.controller.obstacles);
      this.scene.add(this.gizmos);
    }
    this.collisionsShown=next;
    if(this.gizmos)this.gizmos.visible=next;
    this.nodes.collisions.setAttribute("aria-pressed",String(next));
    this.nodes.collisions.textContent=next?
      "🟢 Коллизии: ВКЛ":"⬜ Коллизии: ВЫКЛ";
  }
  update({fps,state}){
    if(this.mode!==MODES.LAB)return;
    const r=this.renderer.info;
    const out=renderDebugInfo({
      fps,drawCalls:r.render.calls,triangles:r.render.triangles,
      geometries:r.memory.geometries,textures:r.memory.textures,
      position:{x:state.x,y:state.y||0,z:state.z},view:state.view||this.controller.view,
      collided:state.collided
    });
    const n=this.nodes;
    n.perf.textContent=out.performance;
    n.resources.textContent=out.resources;
    n.player.textContent=out.actor;
    n.collision.textContent=out.collision;
  }
}
