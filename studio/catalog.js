import {CATEGORIES,STATUS,KIND,CATEGORY_ICON,validateCatalog,
  catalogCounts,catalogFolders,folderObjects,modelLabel} from "../models/catalog-utils.js";

// Category -> numbered individual models. This is a read-only view of
// models/catalog.json, not an editor or 22 copies of one tree mesh.
const $=id=>document.getElementById(id);
let catalog=null,activeCategory=null;
const create=(tag,value=null,className="")=>{
  const node=document.createElement(tag);
  if(value!==null)node.textContent=String(value);
  if(className)node.className=className;
  return node;
};
function detail(list,key,value){
  list.append(create("dt",key),create("dd",value));
}
export function makeCatalogFolder(folder,onOpen){
  const button=create("button",null,"folder-card");
  button.type="button";button.dataset.category=folder.id;
  button.setAttribute("aria-label",
    folder.label+" — "+folder.count+" моделей. Открыть папку");
  const icon=create("span",folder.icon,"folder-icon");
  icon.setAttribute("aria-hidden","true");
  const wrap=create("span");
  wrap.append(create("strong",folder.label,"folder-name"),
    create("span",folder.count+" "+pluralModel(folder.count),"folder-count"));
  const arrow=create("span","›","folder-arrow");
  arrow.setAttribute("aria-hidden","true");
  button.append(icon,wrap,arrow);
  button.addEventListener("click",()=>onOpen(folder.id));
  return button;
}
function pluralModel(count){
  const n=Math.abs(count)%100,last=n%10;
  return n>=11&&n<=14?"моделей":
    last===1?"модель":last>=2&&last<=4?"модели":"моделей";
}
export function makeCatalogCard(item){
  const card=create("article",null,"card");
  card.dataset.assetId=item.id;
  card.dataset.modelNumber=String(item.modelNumber);
  card.id="model-"+String(item.modelNumber).padStart(3,"0");
  const head=create("div",null,"card-head");
  const number=create("span",modelLabel(item.modelNumber),"model-label");
  const heading=create("div");
  heading.append(create("div",item.name,"title"),
    create("div",CATEGORIES[item.category],"category"));
  head.append(number,heading);
  const badges=create("div",null,"badges");
  const status=create("span",STATUS[item.status],"badge");
  status.dataset.status=item.status;
  badges.append(status,create("span",KIND[item.kind],"badge"));
  const list=create("dl",null,"details");
  detail(list,"Номер модели:",modelLabel(item.modelNumber));
  detail(list,"ID:",item.id);
  detail(list,"На сцене:",item.inPlayLab===true?
    item.quantity+" "+(item.quantity===1?"экземпляр":"экземпляров"):
    item.inPlayLab==="fallback"?"Только резервный вариант":"Не установлен в игровой сцене");
  if(item.inPlayLab===false)
    detail(list,"Прототипы:",item.quantity+" (не размещён в городе)");
  detail(list,"Исходник:",item.sourcePaths.join(" · "));
  detail(list,"Файл GLB:",item.assetFile??"Нет отдельного локального GLB");
  detail(list,"Релиз:",item.releaseReady?"Готовность отмечена":"Не допущен");
  const actions=create("div",null,"actions");
  const inspect=create("a",item.viewerLabel);
  inspect.href="../"+item.viewer;actions.append(inspect);
  if(item.scene&&item.scene!==item.viewer){
    const ingame=create("a",["apartment_house","residential_street"].includes(item.id)?
      "🛠️ Весь город: дом + улица":"🛠️ Посмотреть в игровой лаборатории");
    ingame.href="../"+item.scene;actions.append(ingame);
  }
  card.append(head,badges,create("p",item.scopeNote,"notes"),
    list,actions);
  return card;
}
function routeCategory(){
  const name=new URL(window.location.href).searchParams.get("category");
  return name&&Object.hasOwn(CATEGORIES,name)?name:null;
}
function updateUrl(category){
  const url=new URL(window.location.href);
  if(category)url.searchParams.set("category",category);
  else url.searchParams.delete("category");
  window.history.pushState({category},"",url.toString());
}
function showRoot(){
  activeCategory=null;
  $("folder-section").hidden=false;
  $("object-section").hidden=true;
  $("catalog-list").replaceChildren();
  if(catalog)renderFolders();
  document.title="MINI CITY — Каталоги объектов";
}
function showFolder(category){
  if(!Object.hasOwn(CATEGORIES,category))return showRoot();
  activeCategory=category;
  $("folder-section").hidden=true;
  $("object-section").hidden=false;
  $("folder-title").textContent=CATEGORY_ICON[category]+" "+CATEGORIES[category];
  $("folder-path").textContent="Каталоги / "+CATEGORIES[category];
  const entries=folderObjects(catalog,category);
  $("folder-summary").textContent=entries.length+" "+pluralModel(entries.length)+
    " · разные номера обозначают разные модели или типы объектов";
  document.title="MINI CITY — "+CATEGORIES[category]+" · модели";
  renderCatalog();
}
export function openFolder(category,{updateHistory=true}={}){
  if(!catalog||!Object.hasOwn(CATEGORIES,category))return false;
  if(updateHistory&&category!==activeCategory)updateUrl(category);
  $("catalog-search").value="";
  $("catalog-status").value="all";
  showFolder(category);
  return true;
}
export function closeFolder({updateHistory=true}={}){
  if(updateHistory&&activeCategory!==null)updateUrl(null);
  showRoot();
}
function renderFolders(){
  const folders=catalogFolders(catalog);
  const fragment=document.createDocumentFragment();
  for(const folder of folders)
    fragment.append(makeCatalogFolder(folder,openFolder));
  $("folder-list").replaceChildren(fragment);
  $("folder-count").textContent=folders.length+" каталогов · "+
    catalog.entries.length+" разных моделей";
}
export function renderCatalog(){
  if(!catalog||activeCategory===null)return;
  const available=folderObjects(catalog,activeCategory);
  const models=folderObjects(catalog,activeCategory,{
    search:$("catalog-search").value,
    status:$("catalog-status").value
  });
  const fragment=document.createDocumentFragment();
  for(const item of models)fragment.append(makeCatalogCard(item));
  $("catalog-list").replaceChildren(fragment);
  $("catalog-empty").hidden=models.length>0;
  $("results-count").textContent="Показано "+models.length+
    " из "+available.length+" моделей";
}
export function updateCatalogView(data){
  catalog=validateCatalog(data);
  const counts=catalogCounts(catalog);
  $("metric-total").textContent=counts.total;
  $("metric-approved").textContent=counts.statuses.approved;
  $("metric-testing").textContent=counts.statuses.testing;
  $("metric-development").textContent=counts.statuses.development;
  const category=routeCategory();
  if(category)openFolder(category,{updateHistory:false});
  else showRoot();
}
async function loadCatalog(){
  $("catalog-error").hidden=true;
  $("folder-count").textContent="Загрузка папок…";
  try{
    const response=await fetch("../models/catalog.json",{cache:"no-cache"});
    if(!response.ok)throw Error("HTTP "+response.status);
    updateCatalogView(await response.json());
  }catch(error){
    console.error("MINI CITY catalog load error",error);
    $("catalog-error-text").textContent="Не удалось загрузить models/catalog.json ("+
      String(error?.message||error)+"). Проверь соединение и повтори.";
    $("catalog-error").hidden=false;
    $("folder-count").textContent="Ошибка загрузки";
  }
}
$("folder-back").addEventListener("click",()=>closeFolder());
$("catalog-search").addEventListener("input",renderCatalog);
$("catalog-status").addEventListener("change",renderCatalog);
$("catalog-retry").addEventListener("click",loadCatalog);
window.addEventListener("popstate",()=>{
  if(!catalog)return;
  const category=routeCategory();
  if(category)openFolder(category,{updateHistory:false});
  else closeFolder({updateHistory:false});
});
loadCatalog();
