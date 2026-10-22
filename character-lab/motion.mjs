// MINI CITY character lab · Stage 2.
// This is an actual THREE.AnimationMixer locomotion state machine, not a
// procedural joint imitation. Independently testable with a mocked mixer.
export const MOVE_SPEEDS=Object.freeze({idle:0,walk:1.45,run:3.35});
export const TURN_SPEED=1.55;

export function selectLocomotionClips(clips=[]) {
  const candidates=(regex)=>clips.filter(c=>regex.test(c.name||""));
  const preferred=(items)=>{
    const score=c=>{
      const name=(c.name||"").toLowerCase();
      return (/\b(forward|fwd|straight)\b/.test(name)?8:0)
        + (/^(idle|walk|walking|run|running|jog|sprint)$/.test(name)?7:0)
        - (/\b(backward|backwards|left|right|side|strafe|crouch|armed|gun|weapon|combat)\b/.test(name)?12:0)
        - name.length*.006;
    };
    return [...items].sort((a,b)=>score(b)-score(a))[0]||null;
  };
  return {
    idle:preferred(candidates(/idle|standing|standstill|breath|^rest$/i)),
    walk:preferred(candidates(/walk/i)),
    run:preferred(candidates(/run|jog|sprint/i))
  };
}

export class MotionController {
  constructor({mixer,clips=[],root,onChange=()=>{}}) {
    this.mixer=mixer;
    this.root=root;
    this.clips=clips;
    this.onChange=onChange;
    this.selection=selectLocomotionClips(clips);
    this.actions=new Map();
    this.active=null;
    this.activeClip=null;
    this.mode="idle";
    this.actualMode="idle";
    this.heading=0;
    this.speed=0;
    this.turn=0;
    this.phase="stop";
    this.status="";
    this.manual=null;
    this.enabled=Boolean(mixer);
    if(this.enabled) {
      for(const clip of clips) {
        const action=mixer.clipAction(clip);
        // Store all clips once; reuse actions to crossfade.
        action.enabled=true;
        action.setEffectiveWeight?.(1);
        this.actions.set(clip,action);
      }
    }
    this.transitionTo("idle");
  }
  getCapabilities() {
    return {idle:!!this.selection.idle,walk:!!this.selection.walk,
      run:!!this.selection.run,clips:this.clips.map(c=>c.name)};
  }
  chooseClip(clip,duration=.27) {
    if(!this.enabled||!clip||!this.actions.has(clip))return false;
    const next=this.actions.get(clip);
    if(next===this.active)return true;
    const old=this.active;
    next.reset();
    next.enabled=true;
    next.setEffectiveWeight?.(1);
    next.setEffectiveTimeScale?.(1);
    next.play();
    if(old&&old!==next) {
      if(typeof old.crossFadeTo==="function")old.crossFadeTo(next,duration,false);
      else {old.fadeOut?.(duration);next.fadeIn?.(duration);}
    }
    this.active=next;
    this.activeClip=clip;
    this.onChange({clip:clip.name,mode:this.mode,actualMode:this.actualMode});
    return true;
  }
  transitionTo(mode) {
    if(!(mode in MOVE_SPEEDS))throw Error("Unknown locomotion state: "+mode);
    this.mode=mode;
    this.manual=null;
    let selected=this.selection[mode];
    this.actualMode=mode;
    this.status="";
    if(mode==="run"&&!selected) {
      selected=this.selection.walk;
      this.actualMode=selected?"walk":"idle";
      this.status=selected?"В модели нет бега: ускоренная ходьба":"В модели нет бега и ходьбы";
    } else if(mode==="walk"&&!selected) {
      this.actualMode="idle";
      this.status="В модели нет анимации ходьбы";
    } else if(mode==="idle"&&!selected) {
      this.status="В модели нет клипа ожидания";
    }
    if(selected) this.chooseClip(selected,mode==="idle"?.30:.25);
    else {
      this.active?.fadeOut?.(.22);
      this.active=null;
      this.activeClip=null;
    }
    this.phase=mode==="idle"?"stop":"starting";
    return {requested:mode,played:this.actualMode,clip:selected?.name||null,status:this.status};
  }
  playNamedClip(name) {
    const clip=this.clips.find(c=>c.name===name);
    if(!clip||!this.enabled)return false;
    this.manual=name;
    this.mode="idle";
    this.actualMode="preview";
    this.speed=0;
    this.phase="preview";
    this.chooseClip(clip,.22);
    return true;
  }
  setTurning(value) {
    this.turn=Math.max(-1,Math.min(1,value));
  }
  resetLocation() {
    this.root.position.x=0;
    this.root.position.z=0;
    this.root.rotation.y=0;
    this.heading=0;
    this.turn=0;
    this.speed=0;
    this.transitionTo("idle");
  }
  update(dt) {
    dt=Math.max(0,Math.min(dt,.05));
    const target=this.manual?0:MOVE_SPEEDS[this.mode];
    const response=target>this.speed?4.4:6.5;
    this.speed+=(target-this.speed)*(1-Math.exp(-response*dt));
    if(Math.abs(this.speed-target)<.007)this.speed=target;
    // Turn smoothly while staying on the walkway (mobile controls).
    if(this.turn) {
      this.heading+=this.turn*TURN_SPEED*dt;
      this.root.rotation.y=this.heading;
    }
    if(this.speed>.016&&!this.manual) {
      const dx=-Math.sin(this.heading)*this.speed*dt;
      const dz=-Math.cos(this.heading)*this.speed*dt;
      const nextX=this.root.position.x+dx,nextZ=this.root.position.z+dz;
      const limit=5.1;
      if(Math.abs(nextX)>limit||Math.abs(nextZ)>limit) {
        this.transitionTo("idle");
        this.status="Край тренировочной площадки — остановка";
      } else {
        this.root.position.x=nextX;
        this.root.position.z=nextZ;
      }
    }
    if(this.active) {
      let scale=1;
      if(this.mode==="run"&&this.actualMode==="walk")scale=1.55;
      else if(this.mode==="walk")scale=Math.max(.65,Math.min(1.1,this.speed/MOVE_SPEEDS.walk));
      else if(this.mode==="run")scale=Math.max(.75,Math.min(1.14,this.speed/MOVE_SPEEDS.run));
      this.active.setEffectiveTimeScale?.(scale);
    }
    this.mixer?.update(dt);
    if(this.manual)this.phase="preview";
    else if(this.mode==="idle"&&this.speed<.025)this.phase="stop";
    else if(this.speed+.14<target)this.phase="accelerating";
    else if(this.speed>target+.14)this.phase="slowing";
    else this.phase="moving";
    return {state:this.mode,actual:this.actualMode,phase:this.phase,speed:this.speed,
      heading:this.heading,clip:this.activeClip?.name||"",status:this.status};
  }
  dispose() {
    this.active?.stop?.();
    this.mixer?.stopAllAction?.();
    this.actions.clear();
    this.active=null;
  }
}
