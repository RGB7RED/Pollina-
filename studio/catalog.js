import {CATEGORIES,STATUS,KIND,CATEGORY_ICON,validateCatalog,
  filterCatalog,catalogCounts} from "../models/catalog-utils.js";

// Read-only registry: Git source-of-truth is models/catalog.json.
const $=id=>document.getElementById(id);
let catalog=null;
function el(tag,value=null,className=""){
  const node=document.createElement(tag);
  if(value!==null)node.textContent=String(value);
  if(className)node.className=className;
  return node;
}
function detail(list,label,value){
  list.append(el("dt",label),el("dd",value));
}
export function makeCatalogCard(item){
  const card=el("article",null,"card");
  card.dataset.assetId=item.id;
  const head=el("div",null,"card-head");
  const icon=el("span",CATEGORY_ICON[item.category],"icon");
  icon.setAttribute("aria-hidden","true");
  const names=el("div");
  names.append(el("div",item.name,"title"),
    el("div",CATEGORIES[item.category],"category"));
  head.append(icon,names);
  const badges=el("div",null,"badges");
  const status=el("span",STATUS[item.status],"badge");
  status.dataset.status=item.status;
  badges.append(status,el("span",KIND[item.kind],"badge"));
  const dl=el("dl",null,"details");
  detail(dl,"ID:",item.id);
  detail(dl,"Количество:",item.quantity+
    (item.inPlayLab===true?" в тестовой сцене":
      item.inPlayLab==="fallback"?" · резерв":" · не добавлен"));
  detail(dl,"Исходник:",item.sourcePaths.join(" · "));
  detail(dl,"Файл GLB:",item.assetFile??"Отдельного локального GLB нет");
  detail(dl,"Релиз:",item.releaseReady?"Отмечен готовым":"Не допущен в основную игру");
  const actions=el("div",null,"actions");
  const inspect=el("a",item.viewerLabel);
  inspect.href="../"+item.viewer;
  actions.append(inspect);
  if(item.scene&&item.scene!==item.viewer){
    const inGame=el("a","🛠️ Открыть игровую лабораторию");
    inGame.href="../"+item.scene;
    actions.append(inGame);
  }
  card.append(head,badges,el("p",item.scopeNote,"notes"),dl,actions);
  return card;
}
export function updateCatalogView(data){
  catalog=data;
  const counts=catalogCounts(data);
  $("metric-total").textContent=counts.total;
  $("metric-approved").textContent=counts.statuses.approved;
  $("metric-testing").textContent=counts.statuses.testing;
  $("metric-development").textContent=counts.statuses.development;
  const selection=$("catalog-category");
  const all=el("option","Все категории");
  all.value="all";
  selection.replaceChildren(all);
  for(const category of Object.keys(counts.categories)){
    const option=el("option",CATEGORIES[category]);
    option.value=category;selection.append(option);
  }
  renderCatalog();
}
export function renderCatalog(){
  if(!catalog)return;
  const matches=filterCatalog(catalog,{
    search:$("catalog-search").value,
    category:$("catalog-category").value,
    status:$("catalog-status").value
  });
  const list=$("catalog-list"),fragment=document.createDocumentFragment();
  for(const item of matches)fragment.append(makeCatalogCard(item));
  list.replaceChildren(fragment);
  $("catalog-empty").hidden=matches.length!==0;
  $("results-count").textContent=`Показано ${matches.length} из ${catalog.entries.length}`;
}
async function loadCatalog(){
  $("catalog-error").hidden=true;
  $("results-count").textContent="Загрузка каталога…";
  try{
    const response=await fetch("../models/catalog.json",{cache:"no-cache"});
    if(!response.ok)throw Error("HTTP "+response.status);
    updateCatalogView(validateCatalog(await response.json()));
  }catch(error){
    console.error("MINI CITY catalog load error",error);
    $("results-count").textContent="Ошибка загрузки";
    $("catalog-error-text").textContent="Не удалось открыть models/catalog.json ("+
      String(error?.message||error)+"). Проверь подключение или повтори.";
    $("catalog-error").hidden=false;
  }
}
$("catalog-search").addEventListener("input",renderCatalog);
$("catalog-category").addEventListener("change",renderCatalog);
$("catalog-status").addEventListener("change",renderCatalog);
$("catalog-retry").addEventListener("click",loadCatalog);
loadCatalog();
