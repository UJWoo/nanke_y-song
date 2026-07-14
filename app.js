
let allData = [], filtered = [];
const $ = s => document.querySelector(s);
const cards = $("#cards"), modal = $("#detailModal");

fetch("data.json").then(r=>r.json()).then(data=>{
  allData=data; populateAreas(); renderStats(); renderTags(); applyFilters();
});

function moneyNumber(text){
  if(!text) return null;
  const nums = [...text.matchAll(/[\d,]+/g)].map(x=>Number(x[0].replaceAll(",",""))).filter(n=>n>=100);
  return nums.length ? Math.min(...nums) : null;
}
function populateAreas(){
  const areas=[...new Set(allData.map(x=>x.area).filter(x=>x && x!=="待確認"))].sort();
  $("#areaFilter").innerHTML += areas.map(a=>`<option>${a}</option>`).join("");
}
function renderStats(){
  const known=allData.filter(x=>moneyNumber(x.threshold)!==null).length;
  const low=allData.filter(x=>{const n=moneyNumber(x.threshold); return n!==null&&n<=500}).length;
  $("#stats").innerHTML=[
    [allData.length,"收錄店家"],[known,"門檻明確"],[low,"500 元內"],[new Set(allData.map(x=>x.area)).size-1,"涵蓋地區"]
  ].map(x=>`<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
}
function renderTags(){
  const tags=["500 元內","善化","新市","下午茶","正餐","可提供收據"];
  $("#quickTags").innerHTML=tags.map(t=>`<button data-tag="${t}">${t}</button>`).join("");
  $("#quickTags").onclick=e=>{
    const t=e.target.dataset.tag;if(!t)return;
    if(t==="500 元內") $("#thresholdFilter").value="500";
    else if(["善化","新市"].includes(t)) $("#areaFilter").value=t;
    else if(["下午茶","正餐"].includes(t)) $("#categoryFilter").value=t;
    else $("#searchInput").value=t;
    applyFilters();
  };
}
function applyFilters(){
  const q=$("#searchInput").value.trim().toLowerCase();
  const cat=$("#categoryFilter").value, area=$("#areaFilter").value, th=$("#thresholdFilter").value, vf=$("#verifiedFilter").checked;
  filtered=allData.filter(x=>{
    const hay=Object.values(x).join(" ").toLowerCase();
    if(q&&!hay.includes(q))return false;
    if(cat&&x.category!==cat)return false;
    if(area&&!x.area.includes(area))return false;
    if(vf&&!x.verified)return false;
    const n=moneyNumber(x.threshold);
    if(th==="known"&&n===null)return false;
    if(["500","1000","2000"].includes(th)&&(n===null||n>Number(th)))return false;
    return true;
  });
  renderCards();
}
function renderCards(){
  $("#resultCount").textContent=`找到 ${filtered.length} 家`;
  cards.innerHTML=filtered.map((x,i)=>`
   <article class="food-card">
    <div class="card-top"><div><h3>${x.name}</h3><div class="sub">${x.subcategory} · ${x.area}</div></div><span class="badge">${x.category}</span></div>
    <div class="threshold">${x.threshold||"門檻待確認"}<small>南科外送門檻</small></div>
    <div class="meta">
      <div>🚚 <span>${x.delivery}</span></div>
      <div>🕒 <span>${x.preorder}</span></div>
      <div><span class="${x.verified?'verified-dot':'verified-dot unverified-dot'}"></span><span>${x.verified?'留言資訊較完整':'仍有欄位待確認'}</span></div>
    </div>
    <div class="card-actions"><button class="detail-btn" data-i="${i}">查看詳情</button>${x.ig?`<a class="ig-btn" target="_blank" href="https://www.instagram.com/${x.ig.replace('@','')}/">Instagram</a>`:""}</div>
   </article>`).join("");
  $("#emptyState").hidden=filtered.length>0;
}
cards.addEventListener("click",e=>{
  const b=e.target.closest(".detail-btn"); if(!b)return;
  const x=filtered[Number(b.dataset.i)];
  $("#modalContent").innerHTML=`
    <span class="badge">${x.category}</span>
    <h2>${x.name}</h2><p class="sub">${x.subcategory} · ${x.area}</p>
    <p>${x.note||""}</p>
    <div class="modal-grid">
      ${item("外送條件",x.delivery)}${item("最低門檻",x.threshold||"待確認")}
      ${item("電話",x.phone||"待確認")}${item("LINE",x.line||"待確認")}
      ${item("收據／統編",x.receipt)}${item("預訂提醒",x.preorder)}
      ${item("Instagram",x.ig||"—")}${item("資料狀態",x.verified?"留言資訊較完整":"部分資訊待確認")}
    </div>`;
  modal.showModal();
});
function item(k,v){return `<div class="modal-item"><small>${k}</small><strong>${v}</strong></div>`}
$("#modalClose").onclick=()=>modal.close();
modal.addEventListener("click",e=>{if(e.target===modal)modal.close()});
["searchInput","categoryFilter","areaFilter","thresholdFilter","verifiedFilter"].forEach(id=>$("#"+id).addEventListener(id==="searchInput"?"input":"change",applyFilters));
$("#resetBtn").onclick=()=>{["searchInput","categoryFilter","areaFilter","thresholdFilter"].forEach(id=>$("#"+id).value="");$("#verifiedFilter").checked=false;applyFilters()};
$("#randomBtn").onclick=()=>{const pool=filtered.length?filtered:allData;const x=pool[Math.floor(Math.random()*pool.length)];showToast(`今天就吃：${x.name}！`);$("#searchInput").value=x.name;applyFilters();location.hash="database"};
$("#themeBtn").onclick=()=>document.body.classList.toggle("dark");
function showToast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2500)}
$("#exportBtn").onclick=()=>{
  const cols=["name","category","subcategory","area","threshold","delivery","phone","line","receipt","preorder","ig","note"];
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv="\ufeff"+[cols.join(","),...filtered.map(r=>cols.map(c=>esc(r[c])).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="南科外送美食資料庫_篩選結果.csv";a.click();URL.revokeObjectURL(a.href);
};
