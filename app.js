const STORAGE_KEY = "budget_buddy_state";
let state = {
transactions: [],
budgets: {}
};
function load() {
try {
const data = localStorage.getItem(STORAGE_KEY);
if (data) {
state = JSON.parse(data);
}
} catch (e) {
state = {transactions: [], budgets: {}};
}
}
function save() {
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
} catch (e) {}
}
function addTransaction(e) {
e.preventDefault();
const type = document.getElementById("txType").value;
const amount = parseFloat(document.getElementById("txAmount").value);
const category = document.getElementById("txCategory").value;
const date = document.getElementById("txDate").value || new Date().toISOString().split("T")[0];
const note = document.getElementById("txNote").value;
if (isNaN(amount) || amount <= 0) {
return;
}
const tx = {
id: Date.now().toString(),
type: type,
amount: amount,
category: category,
date: date,
note: note
};
state.transactions.push(tx);
save();
renderAll();
document.getElementById("txForm").reset();
document.getElementById("txDate").value = new Date().toISOString().split("T")[0];
}
function deleteTransaction(id) {
state.transactions = state.transactions.filter(function(tx) {
return tx.id !== id;
});
save();
renderAll();
}
function getFiltered() {
const month = document.getElementById("monthPicker").value;
const search = document.getElementById("searchBox").value.toLowerCase();
const category = document.getElementById("filterCategory").value;
return state.transactions.filter(function(tx) {
const matchMonth = month ? tx.date.startsWith(month) : true;
const matchSearch = (tx.note && tx.note.toLowerCase().includes(search)) || (tx.category && tx.category.toLowerCase().includes(search));
const matchCategory = category ? tx.category === category : true;
return matchMonth && matchSearch && matchCategory;
});
}
function renderList() {
const list = document.getElementById("txList");
list.innerHTML = "";
const filtered = getFiltered();
if (filtered.length === 0) {
const li = document.createElement("li");
li.textContent = "No transactions found.";
list.appendChild(li);
return;
}
filtered.forEach(function(tx) {
const li = document.createElement("li");
li.className = "tx-item " + tx.type;
const details = document.createElement("div");
details.className = "tx-details";
details.textContent = tx.date + " - " + tx.category + (tx.note ? " (" + tx.note + ")" : "");
const amount = document.createElement("div");
amount.className = "tx-amount";
amount.textContent = (tx.type === "income" ? "+" : "-") + "$" + tx.amount.toFixed(2);
const delBtn = document.createElement("button");
delBtn.textContent = "Delete";
delBtn.onclick = function() {
deleteTransaction(tx.id);
};
li.appendChild(details);
li.appendChild(amount);
li.appendChild(delBtn);
list.appendChild(li);
});
}
function renderSummary() {
const month = document.getElementById("monthPicker").value;
const monthTxs = state.transactions.filter(function(tx) {
return month ? tx.date.startsWith(month) : true;
});
let income = 0;
let expenses = 0;
monthTxs.forEach(function(tx) {
if (tx.type === "income") {
income += tx.amount;
} else if (tx.type === "expense") {
expenses += tx.amount;
}
});
const balance = income - expenses;
document.getElementById("totalIncome").textContent = income.toFixed(2);
document.getElementById("totalExpenses").textContent = expenses.toFixed(2);
document.getElementById("balance").textContent = balance.toFixed(2);
}
function drawChart() {
const canvas = document.getElementById("chart");
if (!canvas || !canvas.getContext) {
return;
}
const ctx = canvas.getContext("2d");
ctx.clearRect(0, 0, canvas.width, canvas.height);
const month = document.getElementById("monthPicker").value;
const monthTxs = state.transactions.filter(function(tx) {
const matchMonth = month ? tx.date.startsWith(month) : true;
return matchMonth && tx.type === "expense";
});
const categories = {};
monthTxs.forEach(function(tx) {
if (!categories[tx.category]) {
categories[tx.category] = 0;
}
categories[tx.category] += tx.amount;
});
const keys = Object.keys(categories);
if (keys.length === 0) {
ctx.fillStyle = "#666";
ctx.font = "14px sans-serif";
ctx.fillText("No expense data for chart", 20, 30);
return;
}
const padding = 40;
const width = canvas.width - padding * 2;
const height = canvas.height - padding * 2;
let maxVal = 0;
keys.forEach(function(k) {
if (categories[k] > maxVal) {
maxVal = categories[k];
}
});
if (maxVal === 0) {
maxVal = 1;
}
ctx.strokeStyle = "#ccc";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(padding, padding);
ctx.lineTo(padding, canvas.height - padding);
ctx.lineTo(canvas.width - padding, canvas.height - padding);
ctx.stroke();
const barWidth = width / keys.length - 10;
keys.forEach(function(key, index) {
const val = categories[key];
const barHeight = (val / maxVal) * height;
const x = padding + index * (width / keys.length) + 5;
const y = canvas.height - padding - barHeight;
ctx.fillStyle = "#3498db";
ctx.fillRect(x, y, barWidth, barHeight);
ctx.fillStyle = "#333";
ctx.font = "10px sans-serif";
ctx.fillText(key, x, canvas.height - padding + 15);
ctx.fillText(val.toFixed(0), x, y - 5);
});
}
function renderBudgets() {
const list = document.getElementById("budgetList");
list.innerHTML = "";
const month = document.getElementById("monthPicker").value;
const monthTxs = state.transactions.filter(function(tx) {
const matchMonth = month ? tx.date.startsWith(month) : true;
return matchMonth && tx.type === "expense";
});
const spentMap = {};
monthTxs.forEach(function(tx) {
if (!spentMap[tx.category]) {
spentMap[tx.category] = 0;
}
spentMap[tx.category] += tx.amount;
});
Object.keys(state.budgets).forEach(function(cat) {
const limit = state.budgets[cat];
const spent = spentMap[cat] || 0;
const percent = limit > 0 ? (spent / limit) * 100 : 0;
const li = document.createElement("li");
li.textContent = cat + ": $" + spent.toFixed(2) + " / $" + limit.toFixed(2);
const progress = document.createElement("div");
progress.className = "progress";
if (percent > 100) {
progress.classList.add("over");
} else if (percent > 80) {
progress.classList.add("warn");
}
const fill = document.createElement("div");
let fillWidth = percent;
if (fillWidth > 100) {
fillWidth = 100;
}
fill.style.width = fillWidth + "%";
progress.appendChild(fill);
li.appendChild(progress);
list.appendChild(li);
});
}
function exportCsv() {
const filtered = getFiltered();
const rows = [["ID", "Type", "Amount", "Category", "Date", "Note"]];
filtered.forEach(function(tx) {
rows.push([tx.id, tx.type, tx.amount, tx.category, tx.date, tx.note]);
});
const csv = rows.map(function(r) {
return r.map(function(v) {
return JSON.stringify(v === undefined ? "" : v);
}).join(",");
}).join("\n");
const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "transactions.csv";
a.style.display = "none";
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
}
function renderAll() {
renderSummary();
renderList();
drawChart();
renderBudgets();
}
window.addEventListener("DOMContentLoaded", function() {
load();
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
const monthPicker = document.getElementById("monthPicker");
if (monthPicker && !monthPicker.value) {
monthPicker.value = year + "-" + month;
}
const txDate = document.getElementById("txDate");
if (txDate && !txDate.value) {
txDate.value = now.toISOString().split("T")[0];
}
const txForm = document.getElementById("txForm");
if (txForm) {
txForm.addEventListener("submit", addTransaction);
}
const budgetForm = document.getElementById("budgetForm");
if (budgetForm) {
budgetForm.addEventListener("submit", function(e) {
e.preventDefault();
const cat = document.getElementById("budgetCategory").value;
const limit = parseFloat(document.getElementById("budgetLimit").value);
if (cat && !isNaN(limit) && limit >= 0) {
state.budgets[cat] = limit;
save();
renderBudgets();
budgetForm.reset();
}
});
}
const exportBtn = document.getElementById("exportBtn");
if (exportBtn) {
exportBtn.addEventListener("click", exportCsv);
}
const inputs = document.querySelectorAll("input, select, textarea");
inputs.forEach(function(el) {
if (el.id !== "txForm" && el.id !== "budgetForm") {
el.addEventListener("input", renderAll);
el.addEventListener("change", renderAll);
}
});
renderAll();
});
