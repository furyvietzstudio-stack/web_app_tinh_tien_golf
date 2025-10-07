/* ==========================
   Helpers
========================== */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const formatUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const formatVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n || 0);
const formatKRW = (n) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n || 0);

const getRates = () => {
  const vnd = parseFloat($("#rateVND")?.value) || 0;
  const krw = parseFloat($("#rateKRW")?.value) || 0;
  return { vnd, krw };
};

/* ==========================
   DOM targets
========================== */
const svcBody = $("#svcBody");
const sumUSD  = $("#sumUSD");
const sumVND  = $("#sumVND");
const sumKRW  = $("#sumKRW");

/* ==========================
   Type & Icon maps
========================== */
const TYPE_ICON = {
  "골프": "🏌️",
  "아파트": "🏢",
  "차량": "🚐",
  "빌라": "🏘️",
  "크루즈": "🛳️",
  "유람선": "🛳️",
  "호텔": "🏨",
  "식사": "🍽️",
  "관광": "🗺️",
  "노래방": "🎤",
  "공항 서비스": "✈️",
  "기타": "🧾"
};

// alias đa ngôn ngữ + viết tắt → nhãn Hàn chuẩn
const TYPE_ALIAS = {
  // vi -> ko
  "golf":"골프","chung cư":"아파트","xe":"차량","khách sạn":"호텔",
  "ăn uống":"식사","tham quan":"관광","khác":"기타","dịch vụ khác":"기타",
  "villa":"빌라","biệt thự":"빌라","du thuyền":"유람선",
  // en -> ko
  "apartment":"아파트","car":"차량","hotel":"호텔","food":"식사","tour":"관광",
  "other":"기타","other service":"기타","services":"기타",
  "cruise":"크루즈","yacht":"유람선","boat":"유람선","villa":"빌라",
  // viết tắt (ko -> ko)
  "아파":"아파트","골":"골프","차":"차량","기타서비스":"기타"
};

function normalizeType(t){
  const raw = String(t || "").trim();
  const key = raw.toLowerCase();
  return TYPE_ALIAS[key] || raw;
}
function getIconForType(typeText){
  const t = normalizeType(typeText);
  return TYPE_ICON[t] || TYPE_ICON["기타"];
}

/* icon -> type (để suy luận) */
const ICON_TO_TYPE = {
  "🏌️":"골프","⛳":"골프",
  "🚐":"차량","🚌":"차량",
  "🏢":"아파트","🏘️":"빌라",
  "🛳️":"유람선","🏨":"호텔","🍽️":"식사","🗺️":"관광","🎤":"노래방","✈️":"공항 서비스"
};

/* ==========================
   Suy luận loại từ 1 .svc-item
========================== */
function inferTypeFromItem(item){
  // 1) ưu tiên data-type (đã normalize)
  let t = normalizeType(item.getAttribute("data-type") || "");
  if (TYPE_ICON[t]) return t;

  // 2) theo icon
  const di = (item.getAttribute("data-icon") || "").trim();
  if (ICON_TO_TYPE[di]) return ICON_TO_TYPE[di];

  // 3) theo tiêu đề panel
  const panelTitle = item.closest(".svc-panel")?.querySelector(".svc-panel__title")?.textContent?.toLowerCase() || "";
  if (panelTitle.includes("golf") || panelTitle.includes("cc") || panelTitle.includes("골프")) return "골프";
  if (panelTitle.includes("car")  || panelTitle.includes("차량")) return "차량";
  if (panelTitle.includes("apartment") || panelTitle.includes("vinhomes") || panelTitle.includes("아파트")) return "아파트";

  // 4) theo tên dịch vụ
  const nameText = (item.getAttribute("data-name") || item.querySelector(".svc-name")?.textContent || "").toLowerCase();
  if (/(golf|cc|tee|weekday|weekend|holiday)/.test(nameText)) return "골프";
  if (/(innova|sedona|carnival|10h|100km|minibus|bus|van|car)/.test(nameText)) return "차량";
  if (/(studio|bedroom|apartment|vinhomes|metropole|sunrise|lumiere)/.test(nameText)) return "아파트";

  return "기타";
}

/* ==========================
   Lấy danh sách loại cho dropdown
========================== */
function getServiceTypes(){
  const fromPanel = $$(".svc-item").map(el => normalizeType(el.dataset.type || "")).filter(Boolean);
  const fromFixed = Object.keys(TYPE_ICON);
  const merged = [...fromPanel, ...fromFixed];
  const uniq = []; const seen = new Set();
  merged.forEach(t => { if (t && !seen.has(t)) { seen.add(t); uniq.push(t); } });
  return uniq;
}

/* ==========================
   Ô "Loại": icon + select
========================== */
function mountTypeSelect(tdType, initialType, tr){
  const wrap = document.createElement("div");
  wrap.className = "svc-type-cell";

  const ico = document.createElement("span");
  ico.className = "svc-icon";
  ico.textContent = getIconForType(initialType);
  wrap.appendChild(ico);

  const sel = document.createElement("select");
  sel.className = "svc-type-select";
  const options = getServiceTypes();
  const canonInit = normalizeType(initialType);
  options.forEach(t => sel.add(new Option(t, t, false, t === canonInit)));
  wrap.appendChild(sel);

  tdType.textContent = "";
  tdType.appendChild(wrap);
  tr.dataset.type = canonInit;

  ["click","mousedown","touchstart"].forEach(evt => sel.addEventListener(evt, e => e.stopPropagation()));

  sel.addEventListener("change", () => {
    const newType = normalizeType(sel.value);
    tr.dataset.type = newType;
    ico.textContent = getIconForType(newType);

    // cập nhật chữ hiển thị nếu tồn tại
    const text = tr.querySelector(".svc-type-text");
    if (text) text.textContent = newType;

    // reset dữ liệu dòng
    const nameInput  = tr.querySelector('td[data-label="항목"] input');
    const priceInput = tr.querySelector('td[data-label="단가"] input');
    const totalEl    = tr.querySelector('td[data-label="총계"]');
    const qtyInputs  = tr.querySelectorAll('td[data-label="수량"] input');
    if (nameInput)  nameInput.value = "";
    if (priceInput) priceInput.value = 0;
    if (totalEl)    totalEl.textContent = formatUSD(0);
    qtyInputs.forEach(inp => inp.value = 1);
    recalcTotals();
  });
}

/* ==========================
   Tạo 1 dòng dịch vụ
========================== */
function createRow({ type = "기타", icon = "🧾", name = "", usd = 0 } = {}) {
  // Chuẩn hoá loại (nếu có hàm normalizeType)
  type = normalizeType ? normalizeType(type) : type;
  // Nếu icon chưa có, lấy lại theo loại
  icon = icon && icon !== "🧾" ? icon : (typeof getIconForType === "function" ? getIconForType(type) : "🧾");

  const tr = document.createElement("tr");
  tr.dataset.type = type;   // ✅ Lưu loại thực tế (dùng cho export)
  tr.dataset.icon = icon;   // ✅ Lưu icon (dùng cho export)

  // === Khối nhập số lượng tùy theo loại ===
  let qtyInputs = "";
  if (type.includes("아파트")) {
    qtyInputs = `
      <div class="svc-qty-wrap">
        <input class="svc-input qty-person" type="number" min="1" value="1" placeholder="인원" />
        <input class="svc-input qty-day"    type="number" min="1" value="1" placeholder="일수" />
      </div>`;
  } else if (type.includes("골프")) {
    qtyInputs = `
      <div class="svc-qty-wrap">
        <input class="svc-input qty-person" type="number" min="1" value="1" placeholder="인원" />
        <input class="svc-input qty-round"  type="number" min="1" value="1" placeholder="라운드" />
      </div>`;
  } else if (type.includes("차량")) {
    qtyInputs = `
      <div class="svc-qty-wrap">
        <input class="svc-input qty-person" type="number" min="1" value="1" placeholder="인원" />
      </div>`;
  } else {
    qtyInputs = `<input class="svc-input qty-person" type="number" min="1" value="1" />`;
  }

  // === Tạo dòng trong bảng ===
  tr.innerHTML = `
    <td data-label="유형">
      <span class="type-chip">
        <span class="svc-icon">${icon}</span>
        <strong class="svc-type-text">${type}</strong>
      </span>
    </td>
    <td data-label="항목">
      <input class="svc-input svc-name" type="text" value="${name}" placeholder="항목명" />
    </td>
    <td data-label="단가">
      <input class="svc-input price" type="number" min="0" step="0.01" value="${Number(usd) || 0}" />
    </td>
    <td data-label="통화">
      <select class="svc-select curr">
        <option value="USD" selected>USD</option>
        <option value="VND">VND</option>
        <option value="KRW">KRW</option>
      </select>
    </td>
    <td data-label="수량">${qtyInputs}</td>
    <td data-label="총계" class="col-total total" style="white-space:nowrap">${formatUSD(usd)}</td>
    <td data-label="삭제" class="col-del">
      <button class="btn-del" type="button" title="삭제">🗑️</button>
    </td>
  `;

  // Mount lại select loại nếu có
  if (typeof mountTypeSelect === "function") {
    mountTypeSelect(tr.querySelector('td[data-label="유형"]'), type, tr);
  }

  // === Lấy các phần tử cần thiết ===
  const priceEl = tr.querySelector(".price");
  const currSel = tr.querySelector(".curr");
  const totalEl = tr.querySelector(".total");
  const delBtn  = tr.querySelector(".btn-del");
  const qtyEls  = [...tr.querySelectorAll(".qty-person,.qty-day,.qty-round")];

  // === Hàm tính tổng dòng ===
  const recalcRow = () => {
    const price = parseFloat(priceEl.value) || 0;
    const { vnd, krw } = getRates();
    const qty = qtyEls.reduce((s, el) => s * (parseFloat(el.value) || 1), 1);

    let rowUSD = 0;
    if (currSel.value === "USD") {
      rowUSD = price * qty;
      totalEl.textContent = formatUSD(rowUSD);
    } else if (currSel.value === "VND") {
      rowUSD = (price / vnd) * qty;
      totalEl.textContent = formatVND(price * qty);
    } else if (currSel.value === "KRW") {
      rowUSD = (price / krw) * qty;
      totalEl.textContent = formatKRW(price * qty);
    }
    totalEl.dataset.usd = rowUSD;
    recalcTotals();
  };

  // === Gắn event ===
  [priceEl, currSel, ...qtyEls].forEach(el => el.addEventListener("input", recalcRow));
  delBtn.addEventListener("click", () => { tr.remove(); recalcTotals(); });

  svcBody.appendChild(tr);
  recalcRow();
}


/* ==========================
   Totals
========================== */
function getAllRowUSD(){
  return $$(".total", svcBody).reduce((sum, td) => {
    const num = parseFloat(td.textContent.replace(/[^\d.-]/g, "")) || 0;
    return sum + num;
  }, 0);
}
function recalcTotals(){
  const totalUSD = getAllRowUSD();
  const { vnd, krw } = getRates();
  sumUSD.textContent = formatUSD(totalUSD);
  sumVND.textContent = formatVND(totalUSD * vnd);
  sumKRW.textContent = formatKRW(totalUSD * krw);
}

/* ==========================
   Bind service items (suy luận loại)
========================== */
function bindServiceItems(){
  $$(".svc-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      const type = inferTypeFromItem(item);
      const iconFromData = item.getAttribute("data-icon") || "";
      const icon = ICON_TO_TYPE[iconFromData] ? iconFromData : getIconForType(type);

      const name = item.getAttribute("data-name") || $(".svc-name", item)?.textContent || "Item";
      const usd  = parseFloat(item.getAttribute("data-usd")) || 0;

      createRow({ type, icon, name, usd });
    });
  });
}

/* ==========================
   Add blank line
========================== */
function bindAddLine(){
  $("#addLine")?.addEventListener("click", () => {
    createRow({ type: "기타", icon: getIconForType("기타"), name: "", usd: 0 });
  });
}

/* ==========================
   Rate change
========================== */
function bindRates(){
  ["rateVND","rateKRW"].forEach(id => {
    $("#" + id)?.addEventListener("input", recalcTotals);
  });
}

/* ==========================
   Panel accordion
========================== */
function bindPanels(){
  $$(".svc-panel").forEach(panel => {
    const head = $(".svc-panel__head", panel);
    if (!head) return;
    head.addEventListener("click", () => {
      $$(".svc-panel").forEach(p => { if(p!==panel){ p.classList.add("collapsed"); p.classList.remove("open"); }});
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
    });
  });
}

/* ==========================
   Chuẩn hoá các dòng đang có
   (đồng bộ select + icon + chữ)
========================== */
function normalizeExistingRows(){
  $$(".svc-type-select").forEach(sel=>{
    let canon = normalizeType(sel.value);

    const tr  = sel.closest("tr");
    const ico = tr?.querySelector(".svc-icon");
    const iconChar = ico?.textContent?.trim() || "";

    // Nếu icon gợi ý loại khác → ưu tiên icon (người dùng có thể đã đổi bằng tay)
    if (ICON_TO_TYPE[iconChar] && ICON_TO_TYPE[iconChar] !== canon) {
      canon = ICON_TO_TYPE[iconChar];
    }

    sel.value = canon;
    if (tr) {
      tr.dataset.type = canon;
      if (ico)  ico.textContent  = getIconForType(canon);
      const text = tr.querySelector(".svc-type-text");
      if (text) text.textContent = canon; // cập nhật chữ trong bảng
    }
  });
}

/* ==========================
   Init
========================== */
document.addEventListener("DOMContentLoaded", () => {
  bindServiceItems();
  bindAddLine();
  bindRates();
  bindPanels();
  normalizeExistingRows(); // chuẩn hóa ngay khi tải
  recalcTotals();
});

/* ==========================
   EXPORT / PRINT
========================== */
function cloneForPrint(sectionEl){
  const clone = sectionEl.cloneNode(true);
  clone.querySelectorAll('button,.btn,.btn-del,.calc-btn,#addLine').forEach(n => n.remove());
  clone.querySelectorAll('input, select, textarea').forEach(el => {
    const span = document.createElement('span');
    let val = '';
    if (el.tagName === 'SELECT') {
      val = el.options[el.selectedIndex]?.text || el.value || '';
    } else {
      val = el.value || el.placeholder || '';
    }
    span.className = 'print-field';
    span.textContent = val;
    el.replaceWith(span);
  });
  return clone;
}
function buildPrintContent(){
  const booking    = document.querySelector('.booking-section');
  const svcSection = document.querySelector('.svc-table')?.closest('section.card');
  const summary    = document.querySelector('.summary-bank');
  const parts = [];
  if (booking)    parts.push(cloneForPrint(booking).outerHTML);
  if (svcSection) parts.push(cloneForPrint(svcSection).outerHTML);
  if (summary)    parts.push(cloneForPrint(summary).outerHTML);
  return parts.join('\n');
}
function openPrintView(){
  normalizeExistingRows(); // đảm bảo loại đúng trước khi in
  const html = buildPrintContent();
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style,{position:'fixed',right:'0',bottom:'0',width:'0',height:'0',border:'0'});
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>Quotation</title>
<style>
*{box-sizing:border-box}
body{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:20px;background:#fff}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:16px}
.section-title{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:800}
label{color:#64748b;font-size:12px;margin-bottom:4px;display:block}
.grid{display:grid;gap:10px}
.g3{grid-template-columns:1fr 1fr 1fr}
.g2{grid-template-columns:1fr 1fr}
@media print, (max-width:800px){.g3,.g2{grid-template-columns:1fr}}
.pill-input,.print-field{display:block;width:100%;min-height:36px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
.svc-table{width:100%;border-collapse:collapse;margin-top:6px}
.svc-table th,.svc-table td{border:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}
.svc-table th{background:#f8fafc;font-weight:700}
.col-total{text-align:right}
.btn,.btn.pill,#addLine{display:none!important}
@page{size:A4;margin:14mm}
</style></head><body>
<h2 style="margin:0 0 12px 0;">고객 예약 내역</h2>
${html}
<script>
setTimeout(function(){window.focus();window.print();setTimeout(()=>window.close(),300);},200);
<\/script>
</body></html>`);
  doc.close();
}
document.getElementById('btnExport')?.addEventListener('click', openPrintView);

function cloneForExport(sectionEl) {
  const clone = sectionEl.cloneNode(true);

  // 1️⃣ Xóa các nút không cần in
  clone.querySelectorAll('button,.btn,#addLine,.btn-del,.calc-btn').forEach(n => n.remove());

  // 2️⃣ Giữ lại icon + tên loại trong từng dòng
  clone.querySelectorAll('td[data-label="유형"]').forEach(td => {
    const tr = td.closest('tr');
    const icon = tr?.dataset.icon || td.querySelector('.svc-icon')?.textContent?.trim() || '';
    const typeText = tr?.dataset.type || td.querySelector('.svc-type-text')?.textContent?.trim() || '';
    td.textContent = `${icon} ${typeText}`.trim();
  });

  // 3️⃣ Chuyển input/select/textarea → span text
  clone.querySelectorAll('input, select, textarea').forEach(el => {
    const span = document.createElement('span');
    let val = '';
    if (el.tagName === 'SELECT') {
      val = el.options[el.selectedIndex]?.text || el.value || '';
    } else {
      val = el.value || '';
    }
    span.className = 'export-field';
    span.textContent = val;
    el.replaceWith(span);
  });

  // 4️⃣ Xóa cột xóa (🗑)
  const tbl = clone.querySelector('.svc-table');
  if (tbl) {
    const delTh = tbl.querySelector('thead th.col-del');
    if (delTh && delTh.parentElement) delTh.parentElement.removeChild(delTh);
    clone.querySelectorAll('tbody td.col-del').forEach(td => td.remove());
  }

  return clone;
}


function buildExportHTML(){
  const booking    = document.querySelector('.booking-section');
  const svcSection = document.querySelector('.svc-table')?.closest('section.card');
  const summary    = document.querySelector('.summary-bank');
  const parts = [];
  if (booking)    parts.push(cloneForExport(booking).outerHTML);
  if (svcSection) parts.push(cloneForExport(svcSection).outerHTML);
  if (summary)    parts.push(cloneForExport(summary).outerHTML);
  return parts.join('\n');
}
function openExportPage(){
  normalizeExistingRows(); // đồng bộ loại/icon/label trước khi xuất
  const brand = document.getElementById('brand')?.value?.trim() || '';
  const title = brand ? `${brand} — Quotation` : 'Quotation';
  const content = buildExportHTML();
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<link rel="stylesheet" href="css/style.css" />
<style>
body{background:#fff}.wrap{width:min(900px,94vw);margin:28px auto}
.btn,button{display:none!important}
.svc-table{border-collapse:collapse!important;border-spacing:0!important;width:100%}
@media (max-width:900px){
  .svc-table,.svc-table thead,.svc-table tbody,.svc-table th,.svc-table td,.svc-table tr{display:revert!important;width:auto!important}
  .svc-table tbody td::before{content:''!important;display:none!important}
}
.export-field{display:inline-block;min-height:36px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
</style></head><body>
<div class="wrap">
  <header style="margin-bottom:14px">
    <h1 style="margin:0 0 6px">${title}</h1>
    <p class="sub" style="margin:0;color:#64748b">Bản tổng hợp thông tin đặt dịch vụ</p>
  </header>
  ${content}
</div></body></html>`);
  w.document.close();
}
document.getElementById('btnExportView')?.addEventListener('click', openExportPage);


