import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CATEGORIES,STATUS,KIND,CATEGORY_ICON,validateCatalog,
  filterCatalog,catalogCounts,catalogFolders,folderObjects,modelLabel}
  from "../models/catalog-utils.js";
const catalog=validateCatalog(JSON.parse(readFileSync(
  new URL("../models/catalog.json",import.meta.url),"utf8"
)));
const source=readFileSync(new URL("./catalog.js",import.meta.url),"utf8");
// DOM + browser URL mock: these tests cover the actual folder click,
// stable number labels, Safari-style back, deep links and mobile filter path.
class Node{
 constructor(tag="div"){
  this.tag=tag;this.children=[];this.value="";this.dataset={};
  this.textContent="";this.attributes={};this.hidden=false;
  this.listeners={};this.firstChild=null;this.type="";
 }
 append(...elements){this.children.push(...elements);this.firstChild=this.children[0]||null;}
 replaceChildren(...elements){
  this.children=elements.flatMap(e=>e.tag==="#fragment"?e.children:[e]);
  this.firstChild=this.children[0]||null;
 }
 setAttribute(name,value){this.attributes[name]=String(value);}
 addEventListener(event,fn){this.listeners[event]=fn;}
 fire(event){if(!this.listeners[event])throw Error("Missing "+event+" on "+this.tag);
  return this.listeners[event]();}
}
const ids=[
 "folder-section","folder-list","folder-count","object-section",
 "folder-title","folder-summary","folder-back","folder-path",
 "metric-total","metric-approved","metric-testing","metric-development",
 "catalog-search","catalog-status","catalog-list","catalog-empty",
 "results-count","catalog-error","catalog-error-text","catalog-retry"
];
const nodes=Object.fromEntries(ids.map(id=>[id,new Node(id)]));
nodes["catalog-status"].value="all";
nodes["catalog-search"].value="";
const document={
 title:"",
 getElementById:id=>nodes[id]||null,
 createElement:tag=>new Node(tag),
 createDocumentFragment:()=>new Node("#fragment")
};
const initialUrl="https://rawcdn.githack.com/RGB7RED/Pollina-/TEST_SHA/studio/catalog.html";
const handlers={};
const window={
 location:{href:initialUrl,search:""},
 history:{pushState(data,title,url){
   window.location.href=String(url);
   window.location.search=new URL(url).search;
 }},
 addEventListener(name,handler){handlers[name]=handler}
};
const goBackBrowser=search=>{
 window.location.href=initialUrl+search;
 window.location.search=search;
 handlers.popstate();
};
let httpError=false,requestCount=0;
const fetch=async path=>{
 assert.equal(path,"../models/catalog.json");requestCount++;
 if(httpError)return {ok:false,status:503};
 return {ok:true,json:async()=>catalog};
};
const js=source.replace(/import[\s\S]*?from "[^"]+";\n/,"")
  .replace(/^export /gm,"");
const api=new Function("document","window","fetch","console",
 "CATEGORIES","STATUS","KIND","CATEGORY_ICON","validateCatalog",
 "filterCatalog","catalogCounts","catalogFolders","folderObjects",
 "modelLabel",js+"\nreturn {makeCatalogCard,makeCatalogFolder,openFolder,closeFolder,renderCatalog,updateCatalogView,loadCatalog};"
)(document,window,fetch,{error(){}},CATEGORIES,STATUS,KIND,CATEGORY_ICON,
 validateCatalog,filterCatalog,catalogCounts,catalogFolders,folderObjects,modelLabel);
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(requestCount,1);
assert.equal(nodes["metric-total"].textContent,7);
assert.equal(nodes["folder-list"].children.length,5);
assert.equal(nodes["folder-section"].hidden,false);
assert.equal(nodes["object-section"].hidden,true,
 "catalog first displays folders, not flat model cards");
assert.equal(nodes["catalog-list"].children.length,0);
const categories=nodes["folder-list"].children.map(c=>c.dataset.category);
assert.deepEqual(categories,["building","character","environment","nature","street_furniture"]);
const characters=nodes["folder-list"].children.find(c=>c.dataset.category==="character");
assert.match(characters.children[1].children[1].textContent,/2 модели/);
characters.fire("click");
assert.match(window.location.search,/category=character/);
assert.equal(nodes["folder-section"].hidden,true);
assert.equal(nodes["object-section"].hidden,false);
assert.equal(nodes["catalog-list"].children.length,2);
const entries=nodes["catalog-list"].children;
assert.equal(entries[0].dataset.modelNumber,"1");
assert.equal(entries[1].dataset.modelNumber,"2");
assert.equal(entries[0].children[0].children[0].textContent,"№ 001");
assert.equal(entries[1].children[0].children[0].textContent,"№ 002");
assert.notEqual(entries[0].dataset.assetId,entries[1].dataset.assetId,
  "unique character models must not be the same instance");
nodes["catalog-search"].value="№ 002";
nodes["catalog-search"].fire("input");
assert.equal(nodes["catalog-list"].children.length,1);
assert.equal(nodes["catalog-list"].children[0].dataset.assetId,"hero_reference");
nodes["catalog-search"].value="";
nodes["catalog-status"].value="testing";
nodes["catalog-status"].fire("change");
assert.equal(nodes["catalog-list"].children.length,1);
assert.equal(nodes["catalog-list"].children[0].dataset.assetId,"hero_city_candidate");
nodes["folder-back"].fire("click");
assert.equal(nodes["folder-section"].hidden,false);
assert.equal(nodes["catalog-list"].children.length,0);
assert.equal(window.location.search,"");
const furniture=nodes["folder-list"].children.find(c=>c.dataset.category==="street_furniture");
furniture.fire("click");
assert.deepEqual(nodes["catalog-list"].children.map(c=>c.dataset.modelNumber),["1","2"]);
assert.deepEqual(nodes["catalog-list"].children.map(c=>c.dataset.assetId),
  ["street_lamp","street_bench"]);
goBackBrowser("?category=nature");
assert.equal(nodes["catalog-list"].children.length,1);
assert.equal(nodes["catalog-list"].children[0].dataset.assetId,"street_tree");
assert.equal(nodes["catalog-list"].children[0].dataset.modelNumber,"1",
  "22 copies of a tree is still one model № 001");
assert.match(nodes["catalog-list"].children[0].children[3].children[2].textContent,/22 экземпляр/);
// Reopening with a deep link must restore same folder.
api.updateCatalogView(catalog);
assert.equal(nodes["catalog-list"].children.length,1);
goBackBrowser("?category=unknown");
assert.equal(nodes["folder-section"].hidden,false,
  "invalid deep links safely fall back to folder root");
const house=api.makeCatalogCard(catalog.entries[0]);
assert.equal(house.children.at(-1).children[0].href,"../building-lab/index.html");
assert.equal(house.children.at(-1).children[1].href,"../play-lab/index.html?mode=lab");
httpError=true;
await nodes["catalog-retry"].fire("click");
assert.equal(nodes["catalog-error"].hidden,false);
assert.match(nodes["catalog-error-text"].textContent,/503/);
httpError=false;
await nodes["catalog-retry"].fire("click");
assert.equal(nodes["catalog-error"].hidden,true);
assert.equal(nodes["folder-list"].children.length,5);
assert.equal(nodes["object-section"].hidden,true);
console.log("MINI CITY 4.2.4 folder DOM PASS: 5 folders, numbered models, search, back, deep links, distinct designs and retry");
