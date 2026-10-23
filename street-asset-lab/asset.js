// No duplicate preview geometry: use the same buildStreet() that places
// the actual tree, lamp and bench in the city, but with a ONE-object plan.
import {buildStreet} from "../play-lab/street.js";
import {TREE_MODELS} from "../play-lab/tree-models.js";
export const ISOLATED_ASSETS=Object.freeze({
  street_lamp:Object.freeze({name:"Уличный фонарь",number:1,category:"street_furniture",
    y:2.55,distance:9.4,height:4.7,quantity:6,parts:["street-lamp-poles","street-lamp-base-foot","street-lamp-base-plinth","street-lamp-base-collar","street-lamp-post-ring","street-lamp-upper-collar","street-lamp-arch","street-lamp-vertical-brace","street-lamp-cross-brace","street-lamp-scroll-large","street-lamp-scroll-small","street-lamp-hanger","street-lamp-lantern-roof","street-lamp-lantern-eave","street-lamp-heads","street-lamp-lantern-base","street-lamp-lantern-tip","street-lamp-lantern-ribs","street-lamp-pole-finial"]}),
  street_bench:Object.freeze({name:"Дворовая скамейка",number:2,category:"street_furniture",
    y:.66,distance:4.2,height:1.10,quantity:4,parts:["benches-seats","benches-backs","benches-back-rails","benches-concrete-supports","benches-fasteners"]}),
  ...TREE_MODELS
});
export function buildIsolatedStreetAsset(THREE,id){
  const spec=ISOLATED_ASSETS[id];
  if(!spec)throw Error("Unknown isolated asset: "+String(id));
  const plan={surfaces:[],markings:[],curbs:[],trees:[],lamps:[],benches:[],
    obstacles:[],info:{trees:0,lamps:0,benches:0,roadLength:0,roadWidth:0}};
  if(id==="street_lamp"){plan.lamps.push({x:0,z:0});plan.info.lamps=1;}
  if(id==="street_bench"){plan.benches.push({x:0,z:0});plan.info.benches=1;}
  if(Object.hasOwn(TREE_MODELS,id)){
    plan.trees.push({x:0,z:0,type:id});plan.info.trees=1;
  }
  const root=buildStreet(THREE,plan);
  root.name="MINI CITY | "+spec.name+" | isolated viewer";
  root.userData.isolatedModelId=id;
  root.userData.worldQuantity=spec.quantity;
  root.userData.inGameByThisViewer=false;
  return {root,spec};
}
