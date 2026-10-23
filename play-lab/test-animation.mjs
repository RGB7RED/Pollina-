import assert from "node:assert/strict";
import {selectLocomotionClips} from "../character-lab/motion.mjs";
import {ActorAnimator} from "./animation.js";
const calls=[];
class Action{
 constructor(clip){this.clip=clip;this.played=0;this.scales=[];}
 setEffectiveWeight(v){this.weight=v;return this;}
 setEffectiveTimeScale(v){this.scales.push(v);return this;}
 reset(){calls.push("reset:"+this.clip.name);return this;}
 play(){this.played++;return this;}
 crossFadeTo(next,duration){calls.push("crossfade:"+next.clip.name+":"+duration);}
 fadeOut(duration){calls.push("fade:"+duration);}
}
class Mixer{
 constructor(model){this.model=model;this.actions=new Map();this.updateCount=0;}
 clipAction(clip){const x=new Action(clip);this.actions.set(clip,x);return x;}
 update(dt){this.updateCount+=dt;}
 stopAllAction(){calls.push("stop");}
}
const THREE={AnimationMixer:Mixer};
const clips=[{name:"Idle"},{name:"Walking"},{name:"Running"}];
assert.equal(selectLocomotionClips(clips).walk.name,"Walking");
const a=new ActorAnimator(THREE,{scene:{},animations:clips});
assert.equal(a.canWalk,true);assert.equal(a.canRun,true);
assert.equal(a.current,"idle");
assert.equal(a.active.clip.name,"Idle");
a.play("walk");
assert.equal(a.active.clip.name,"Walking");
a.play("run");
assert.equal(a.active.clip.name,"Running");
assert.equal(a.warning,"");
a.play("run");
assert.equal(a.active.played,1,"no duplicate start of same clip");
a.update(.016);
assert.ok(a.mixer.updateCount>.015);
assert.ok(calls.some(s=>s.startsWith("crossfade:Running:")));
a.dispose();assert.ok(calls.includes("stop"));
const noRun=new ActorAnimator(THREE,{scene:{},animations:[{name:"Idle"},{name:"Walk"}]});
assert.equal(noRun.canRun,true);
noRun.play("run");
assert.equal(noRun.active.clip.name,"Walk");
assert.match(noRun.warning,/ускорена/);
assert.ok(noRun.active.scales.some(v=>v>1.5));
const noClips=new ActorAnimator(THREE,{scene:{},animations:[]});
assert.equal(noClips.canWalk,false);
assert.equal(noClips.canRun,false);
noClips.play("walk");
assert.equal(noClips.active,null);
console.log("MINI CITY 4.1 animations PASS: true clips, crossfade, run fallback, no sliding unanimated model");
