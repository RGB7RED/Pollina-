// Reuse the established building laboratory's six-axis controller.
// Camera motion is isolated from the game and animation controller.
import {FreeCamera,normalizedStick,CAMERA_SPEEDS,LOOK_SENSITIVITIES} from "../building-lab/free-camera.js";
const KEYS=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ControlLeft","ShiftLeft","ShiftRight"]);
const makeButton=(label)=>{const b=document.createElement("button");b.type="button";b.textContent=label;return b;};
export function mountInspectionFlight({camera,orbit,canvas,resetPose,speed=2.6,onToggle=()=>{}}){
  const free=new FreeCamera(camera,{speed});
  free.speedMode=2; // first speed press selects precision, not fast travel
  free.limits={x:90,z:90,yMin:.2,yMax:55};
  const bar=document.createElement("div");bar.className="mc-flight-toolbar";
  const toggle=makeButton("✥ Свободная камера"),rate=makeButton("⚡ Скорость"),
    look=makeButton("🎯 Обзор"),focus=makeButton("⌖ К объекту");
  toggle.className="mc-flight-toggle";toggle.setAttribute("aria-pressed","false");
  bar.append(toggle,rate,look,focus);document.body.append(bar);
  const mobile=document.createElement("div");mobile.className="mc-flight-mobile";mobile.hidden=true;
  const stick=document.createElement("div");stick.className="mc-flight-stick";
  stick.setAttribute("aria-label","Стик свободной камеры");
  const knob=document.createElement("div");knob.className="mc-flight-knob";stick.append(knob);
  const alt=document.createElement("div");alt.className="mc-flight-altitude";
  const up=makeButton("↑ Высота"),down=makeButton("↓ Высота");
  alt.append(up,down);mobile.append(stick,alt);document.body.append(mobile);
  let joystick=null,pointer=null,px=0,py=0;
  const held=new Set();
  const active=()=>free.active;
  function labels(){
    rate.textContent="⚡ "+(free.customSpeed?"Точная":CAMERA_SPEEDS[free.speedMode].label);
    look.textContent="🎯 "+LOOK_SENSITIVITIES[free.lookMode].label;
  }
  labels();
  function clear(){
    joystick=pointer=null;held.clear();free.clearInputs();
    knob.style.left="50%";knob.style.top="50%";
    up.classList.remove("held");down.classList.remove("held");
  }
  function setActive(enabled){
    if(enabled===active())return;
    clear();
    if(enabled){free.start(orbit.target);orbit.enabled=false;}
    else{
      const target=free.targetAt(3);free.stop();
      orbit.target.set(target.x,target.y,target.z);orbit.enabled=true;orbit.update();
    }
    mobile.hidden=!enabled;
    document.body.classList.toggle("mc-free-enabled",enabled);
    toggle.classList.toggle("active",enabled);
    toggle.setAttribute("aria-pressed",String(enabled));
    toggle.textContent=enabled?"◉ Свободная: ВКЛ":"✥ Свободная камера";
    onToggle(enabled);
  }
  toggle.addEventListener("click",()=>setActive(!active()));
  rate.addEventListener("click",()=>{free.setSpeedMode(free.speedMode+1);labels();});
  look.addEventListener("click",()=>{free.setLookMode(free.lookMode+1);labels();});
  focus.addEventListener("click",()=>{clear();resetPose();if(active())free.start(orbit.target);});
  function moveStick(e){
    if(!active()||e.pointerId!==joystick)return;
    e.preventDefault();const box=stick.getBoundingClientRect();
    const v=normalizedStick(e.clientX,e.clientY,box);
    free.setStick(v.x,v.z);
    const r=Math.min(box.width,box.height)*.39;
    knob.style.left=box.width/2+v.x*r+"px";
    knob.style.top=box.height/2-v.z*r+"px";
  }
  stick.addEventListener("pointerdown",e=>{
    if(!active()||joystick!==null)return;
    e.preventDefault();joystick=e.pointerId;
    try{stick.setPointerCapture?.(e.pointerId);}catch(_){}
    moveStick(e);
  });
  stick.addEventListener("pointermove",moveStick);
  for(const evt of ["pointerup","pointercancel","lostpointercapture"]){
    stick.addEventListener(evt,e=>{
      if(joystick!==e.pointerId)return;
      joystick=null;free.setStick(0,0);
      knob.style.left="50%";knob.style.top="50%";
    });
  }
  function altitude(){free.setVertical(Number(held.has(1))-Number(held.has(-1)));}
  for(const [b,dir] of [[up,1],[down,-1]]){
    b.addEventListener("pointerdown",e=>{
      if(!active())return;
      e.preventDefault();held.add(dir);altitude();b.classList.add("held");
      try{b.setPointerCapture?.(e.pointerId);}catch(_){}
    });
    for(const evt of ["pointerup","pointercancel","lostpointercapture"]){
      b.addEventListener(evt,()=>{
        held.delete(dir);altitude();b.classList.remove("held");
      });
    }
  }
  canvas.addEventListener("pointerdown",e=>{
    if(!active()||pointer!==null)return;
    e.preventDefault();pointer=e.pointerId;px=e.clientX;py=e.clientY;
    try{canvas.setPointerCapture?.(e.pointerId);}catch(_){}
  });
  canvas.addEventListener("pointermove",e=>{
    if(!active()||e.pointerId!==pointer)return;
    e.preventDefault();free.look(e.clientX-px,e.clientY-py);
    px=e.clientX;py=e.clientY;
  });
  for(const evt of ["pointerup","pointercancel","lostpointercapture"]){
    canvas.addEventListener(evt,e=>{if(e.pointerId===pointer)pointer=null;});
  }
  // Capture before character-lab's W/A/D animation listeners.
  window.addEventListener("keydown",e=>{
    if(!active()||!KEYS.has(e.code))return;
    if(e.target?.closest?.("input,select,textarea,[contenteditable=true]"))return;
    e.preventDefault();e.stopImmediatePropagation();free.keys.add(e.code);
  },true);
  window.addEventListener("keyup",e=>{
    if(!active()||!KEYS.has(e.code))return;
    e.preventDefault();e.stopImmediatePropagation();free.keys.delete(e.code);
  },true);
  window.addEventListener("blur",clear);
  window.addEventListener("pagehide",clear);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)clear();});
  return {
    get active(){return active();},
    update(dt){if(active())free.update(dt);},
    setActive,
    reset(){clear();resetPose();if(active())free.start(orbit.target);},
    controller:free
  };
}
