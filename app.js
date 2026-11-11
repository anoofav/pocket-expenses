const $ = id => document.getElementById(id);
const STORAGE_KEY = "pocket-expenses-v1";
const categories = {
  expense: ["Food","Transport","Shopping","Bills","Health","Entertainment","Education","Travel","Home","Other"],
  income: ["Salary","Freelance","Business","Investment","Gift","Other"]
};
const emoji = {Food:"🍔",Transport:"🚕",Shopping:"🛍️",Bills:"🧾",Health:"💊",Entertainment:"🎬",Education:"📚",Travel:"✈️",Home:"🏠",Other:"📌",Salary:"💼",Freelance:"💻",Business:"🏪",Investment:"📈",Gift:"🎁"};
let entries = load();
let currentType = "expense";
let filterMonth = new Date().toISOString().slice(0,7);

function load(){ try { const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); return Array.isArray(x)?x:[]; } catch { return []; } }
function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(entries)); }
function money(n){ return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n); }
function monthName(s){ const [y,m]=s.split("-").map(Number); return new Date(y,m-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"}); }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function showToast(msg){ $("toast").textContent=msg; $("toast").style.display="block"; setTimeout(()=>$("toast").style.display="none",2200); }
function populateCategories(){
  $("category").innerHTML=categories[currentType].map(c=>`<option value="${c}">${c}</option>`).join("");
  $("expenseTab").classList.toggle("chosen",currentType==="expense");
  $("incomeTab").classList.toggle("chosen",currentType==="income");
}
function render(){
  const months=[...new Set([new Date().toISOString().slice(0,7),...entries.map(e=>e.date.slice(0,7))])].sort().reverse();
  if(!months.includes(filterMonth)) months.push(filterMonth);
  $("monthFilter").innerHTML=months.map(m=>`<option value="${m}">${monthName(m)}</option>`).join("");
  $("monthFilter").value=filterMonth;
  $("monthLabel").textContent=monthName(new Date().toISOString().slice(0,7));
  const monthly=entries.filter(e=>e.date.slice(0,7)===new Date().toISOString().slice(0,7));
  const inc=monthly.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0);
  const exp=monthly.filter(e=>e.type==="expense").reduce((s,e)=>s+e.amount,0);
  $("income").textContent=money(inc); $("expenses").textContent=money(exp); $("balance").textContent=money(inc-exp);
  const shown=entries.filter(e=>e.date.slice(0,7)===filterMonth && ($("typeFilter").value==="all"||e.type===$("typeFilter").value)).sort((a,b)=>b.date.localeCompare(a.date)||b.created-b.created);
  $("count").textContent=`${shown.length} ${shown.length===1?"item":"items"}`;
  $("transactionList").innerHTML=shown.length?shown.map(e=>`<article class="item"><div class="emoji">${emoji[e.category]||"📌"}</div><div class="details"><b>${esc(e.description||e.category)}</b><small>${esc(e.category)} · ${new Date(e.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</small></div><div class="amount ${e.type}">${e.type==="income"?"+":"−"}${money(e.amount)}</div><button class="del" data-delete="${e.id}" aria-label="Delete transaction">×</button></article>`).join(""):`<div class="empty">No transactions for ${monthName(filterMonth)}.<br>Add an expense or income to get started.</div>`;
}
function openForm(type){
  currentType=type; populateCategories(); $("dialogTitle").textContent=type==="expense"?"Add expense":"Add income";
  $("date").value=new Date().toISOString().slice(0,10); $("amount").value=""; $("description").value="";
  $("entryDialog").showModal(); $("amount").focus();
}
$("addExpense").onclick=()=>openForm("expense"); $("addIncome").onclick=()=>openForm("income");
$("expenseTab").onclick=()=>{currentType="expense";populateCategories();$("dialogTitle").textContent="Add expense";};
$("incomeTab").onclick=()=>{currentType="income";populateCategories();$("dialogTitle").textContent="Add income";};
$("cancelBtn").onclick=()=>$("entryDialog").close();
$("entryForm").onsubmit=e=>{
  e.preventDefault(); const amount=Number($("amount").value);
  if(!Number.isFinite(amount)||amount<=0){showToast("Enter a valid amount");return;}
  entries.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),type:currentType,amount,category:$("category").value,description:$("description").value.trim(),date:$("date").value,created:Date.now()});
  save(); filterMonth=$("date").value.slice(0,7); $("entryDialog").close(); render(); showToast("Transaction saved");
};
$("transactionList").onclick=e=>{
  const btn=e.target.closest("[data-delete]"); if(!btn)return;
  if(confirm("Delete this transaction?")){entries=entries.filter(x=>x.id!==btn.dataset.delete);save();render();showToast("Transaction deleted");}
};
$("monthFilter").onchange=e=>{filterMonth=e.target.value;render();};
$("typeFilter").onchange=render;
function download(name,content,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
$("exportBtn").onclick=()=>{
  const rows=[["Date","Type","Category","Description","Amount"],...entries.map(e=>[e.date,e.type,e.category,e.description,e.amount])];
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  download("pocket-expenses.csv",csv,"text/csv");showToast("CSV exported");
};
$("backupBtn").onclick=()=>{download("pocket-expenses-backup.json",JSON.stringify(entries,null,2),"application/json");showToast("Backup downloaded");};
$("restoreBtn").onclick=()=>$("restoreFile").click();
$("restoreFile").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const data=JSON.parse(await f.text());if(!Array.isArray(data)||!data.every(x=>x&&["income","expense"].includes(x.type)&&Number.isFinite(x.amount)&&typeof x.date==="string"))throw Error();if(confirm(`Import ${data.length} transactions? This replaces current data.`)){entries=data;save();filterMonth=new Date().toISOString().slice(0,7);render();showToast("Backup restored");}}catch{alert("This backup file is invalid.");}e.target.value="";
};
$("clearBtn").onclick=()=>{if(confirm("Permanently delete all transactions from this device? Export a backup first if needed.")){entries=[];save();render();showToast("All data cleared");}};
render();
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
