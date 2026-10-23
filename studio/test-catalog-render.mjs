import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CATEGORIES,STATUS,KIND,CATEGORY_ICON,validateCatalog,
  filterCatalog,catalogCounts} from "../models/catalog-utils.js";
const catalog=validateCatalog(JSON.parse(readFileSync(
  new URL("../models/catalog.json",import.meta.url),"utf8"
)));
const source=readFileSync(new URL("./catalog.js",import.meta.url),"utf8");
// Render-test with a tiny DOM stub. This exercises browser event/UI logic,
// not Safari WebGL, and requires no network/CDN in CI.
class Node{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.value="";this.dataset={};
  this.textContent="";this.attributes={};this.hidden=false;
  this.listeners={};this.firstChild=null;
 }
 append(...elements){this.children.push(...elements);this.firstChild=this.children[0]||null;}
 replaceChildren(...elements){
  this.children=elements.flatMap(e=>e.tag==="#fragment"?e.children:[e]);
  this.firstChild=this.children[0]||null;
  if(this.tag==="select")this.value=this.firstChild?.value||"";
 }
 setAttribute(name,value){this.attributes[name]=String(value);}
 addEventListener(event,fn){this.listeners[event]=fn;}
 fire(name){if(!this.listeners[name])throw Error("No listener on "+name);
  return this.listeners[name]();}
}
const ids=["metric-total","metric-approved","metric-testing","metric-development",
 "catalog-search","catalog-category","catalog-status","catalog-list",
 "catalog-empty","results-count","catalog-error","catalog-error-text","catalog-retry"];
const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id==="catalog-category"||
  id==="catalog-status"?"select":"div")]));
nodes["catalog-search"].value="";
nodes["catalog-category"].value="all";
nodes["catalog-status"].value="all";
const document={
 getElementById:id=>nodes[id],
 createElement:tag=>new Node(tag),
 createDocumentFragment:()=>new Node("#fragment")
};
let failFetch=false,requestCount=0;
const fetch=async path=>{
 assert.equal(path,"../models/catalog.json");requestCount++;
 if(failFetch)return {ok:false,status:503};
 return {ok:true,json:async()=>catalog};
};
const js=source.replace(/import[\s\S]*?from "[^"]+";\n/,"")
  .replace(/^export /gm,"");
const api=new Function("document","fetch","console","CATEGORIES","STATUS",
 "KIND","CATEGORY_ICON","validateCatalog","filterCatalog","catalogCounts",
 js+"\nreturn {makeCatalogCard,updateCatalogView,renderCatalog,loadCatalog};"
)(document,fetch,{error(){}},CATEGORIES,STATUS,KIND,CATEGORY_ICON,
 validateCatalog,filterCatalog,catalogCounts);
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(requestCount,1);
assert.equal(nodes["metric-total"].textContent,7);
assert.equal(nodes["metric-approved"].textContent,1);
assert.equal(nodes["metric-testing"].textContent,5);
assert.equal(nodes["metric-development"].textContent,1);
assert.equal(nodes["catalog-list"].children.length,7);
assert.equal(nodes["catalog-category"].children.length,6);
nodes["catalog-search"].value="ДеРеВо";
nodes["catalog-search"].fire("input");
assert.equal(nodes["catalog-list"].children.length,1);
assert.equal(nodes["catalog-list"].children[0].dataset.assetId,"street_tree");
nodes["catalog-search"].value="";
nodes["catalog-category"].value="character";
nodes["catalog-category"].fire("change");
assert.equal(nodes["catalog-list"].children.length,2);
nodes["catalog-category"].value="all";
nodes["catalog-status"].value="approved";
nodes["catalog-status"].fire("change");
assert.equal(nodes["catalog-list"].children.length,1);
assert.equal(nodes["catalog-list"].children[0].dataset.assetId,"apartment_house");
nodes["catalog-status"].value="testing";
nodes["catalog-search"].value="неизвестный объект";
nodes["catalog-search"].fire("input");
assert.equal(nodes["catalog-list"].children.length,0);
assert.equal(nodes["catalog-empty"].hidden,false);
nodes["catalog-search"].value="";
nodes["catalog-status"].value="all";
nodes["catalog-status"].fire("change");
const house=api.makeCatalogCard(catalog.entries[0]);
const actions=house.children.at(-1);
assert.equal(actions.children[0].href,"../building-lab/index.html");
assert.equal(actions.children[1].href,"../play-lab/index.html?mode=lab");
const reference=api.makeCatalogCard(catalog.entries.find(e=>e.id==="hero_reference"));
assert.equal(reference.children.at(-1).children.length,1,
 "unanimated fallback must not claim to be active main actor");
failFetch=true;
await nodes["catalog-retry"].fire("click");
assert.equal(nodes["catalog-error"].hidden,false);
assert.match(nodes["catalog-error-text"].textContent,/503/);
failFetch=false;
await nodes["catalog-retry"].fire("click");
assert.equal(nodes["catalog-error"].hidden,true);
assert.equal(nodes["catalog-list"].children.length,7);
console.log("MINI CITY 4.2.3 catalog render PASS: filter UI, 7 real cards, deep links, empty state and retry");
