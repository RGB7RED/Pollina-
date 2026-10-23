// The demo uses the *real* imported glTF clips. No procedural limb wiggle.
// Reuse the clip classification built for Character Lab 2; unlike the lab's
// MotionController, world translation is delegated to collision-checked 4.1.
import {selectLocomotionClips} from "../character-lab/motion.mjs";

export class ActorAnimator{
  constructor(THREE,gltf){
    this.clips=gltf.animations||[];
    this.selection=selectLocomotionClips(this.clips);
    this.mixer=this.clips.length?new THREE.AnimationMixer(gltf.scene):null;
    this.actions=new Map();
    this.active=null;this.current="";this.warning="";
    for(const clip of this.clips){
      const action=this.mixer.clipAction(clip);
      action.enabled=true;
      action.setEffectiveWeight(1);
      this.actions.set(clip,action);
    }
    this.play("idle");
  }
  get canWalk(){return Boolean(this.mixer&&this.selection.walk);}
  get canRun(){return Boolean(this.mixer&&(this.selection.run||this.selection.walk));}
  play(mode){
    if(mode===this.current)return;
    const clip=mode==="run"?(this.selection.run||this.selection.walk):
      mode==="walk"?this.selection.walk:this.selection.idle;
    this.warning=mode==="run"&&!this.selection.run?
      "Нет отдельного бега: ускорена анимация ходьбы":"";
    if(clip){
      const action=this.actions.get(clip);
      if(action!==this.active){
        action.reset();action.enabled=true;
        action.setEffectiveWeight(1);
        action.setEffectiveTimeScale(mode==="run"&&!this.selection.run?1.55:1);
        action.play();
        if(this.active)this.active.crossFadeTo(action,.22,false);
        this.active=action;
      }else action.setEffectiveTimeScale(mode==="run"&&!this.selection.run?1.55:1);
    }else if(this.active){
      this.active.fadeOut(.20);this.active=null;
    }
    this.current=mode;
  }
  update(dt){this.mixer?.update(dt);}
  dispose(){this.mixer?.stopAllAction();this.actions.clear();}
}
