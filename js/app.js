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

// Alias đa ngôn ngữ + viết tắt → nhãn Hàn chuẩn
const TYPE_ALIAS = {
  // vi → ko
  "golf":"골프", "chung cư":"아파트", "xe":"차량", "khách sạn":"호텔",
  "ăn uống":"식사", "tham quan":"관광", "khác":"기타", "dịch vụ khác":"기타",
  "villa":"빌라", "biệt thự":"빌라", "du thuyền":"유람선",

  // en → ko
  "golf":"골프", "apartment":"아파트", "car":"차량", "hotel":"호텔",
  "food":"식사", "tour":"관광", "other":"기타", "other service":"기타",
  "services":"기타", "cruise":"크루즈", "yacht":"유람선", "boat":"유람선", "villa":"빌라",

  // viết tắt (ko → ko)
  "아파":"아파트", "골":"골프", "차":"차량",
  "기타서비스":"기타" // nếu muốn giữ nhãn này riêng thì đổi về "기타서비스"
};

function normalizeType(t) {
  const k = String(t || "").trim();
  const key = k.toLowerCase();
  return TYPE_ALIAS[key] || k; // trả về nhãn Hàn chuẩn nếu có alias
}

function getIconForType(typeText) {
  const t = normalizeType(typeText);
  return TYPE_ICON[t] || TYPE_ICON["기타"];
}

/* ==========================
   Lấy danh sách loại cho dropdown
========================== */
function getServiceTypes() {
  const fromPanel = $$(".svc-item")
    .map(el => normalizeType(el.dataset.type || ""))
    .filter(Boolean);
  const fromFixed = Object.keys(TYPE_ICON);
  const merged = [...fromPanel, ...fromFixed];
  const uniq = [];
  const seen = new Set();
  merged.forEach(t => { if (t && !seen.has(t)) { seen.add(t); uniq.push(t); } });
  return uniq;
}

/* ==========================
   Ô "Loại": icon + select
========================== */
function mountTypeSelect(tdType, initialType, tr) {
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

  // tránh sự kiện cha nuốt click (nếu có listener trên <tr>)
  ["click","mousedown","touchstart"].forEach(evt =>
    sel.addEventListener(evt, e => e.stopPropagation())
  );

  // đổi loại → cập nhật data-type + icon + reset fields
  sel.addEventListener("change", () => {
    const newType = normalizeType(sel.value);
    tr.dataset.type = newType;
    ico.textContent = getIconForType(newType);

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
  type = normalizeType(type);
  icon = icon && icon !== "🧾" ? icon : getIconForType(type);

  const tr = document.createElement("tr");

  // layout số lượng theo loại ban đầu (đổi loại sau KHÔNG đổi layout)
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

  tr.innerHTML = `
    <td data-label="유형">
      <span class="type-chip">
        <span class="svc-icon">${icon}</span>
        <strong class="svc-type-text">${type}</strong>
      </span>
    </td>
    <td data-label="항목">
      <input class="svc-input" type="text" value="${name}" placeholder="항목명" />
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

  // gắn select loại (và icon)
  const tdType = tr.querySelector('td[data-label="유형"]');
  mountTypeSelect(tdType, type, tr);

  const priceEl = $(".price", tr);
  const currSel = $(".curr", tr);
  const totalEl = $(".total", tr);
  const delBtn  = $(".btn-del", tr);
  const qtyEls  = [...tr.querySelectorAll(".qty-person,.qty-day,.qty-round")];

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

  [priceEl, currSel, ...qtyEls].forEach(el => el.addEventListener("input", recalcRow));
  delBtn.addEventListener("click", () => { tr.remove(); recalcTotals(); });

  svcBody.appendChild(tr);
  recalcRow();
}

/* ==========================
   Totals
========================== */
function getAllRowUSD() {
  return $$(".total", svcBody).reduce((sum, td) => {
    const num = parseFloat(td.textContent.replace(/[^\d.-]/g, "")) || 0;
    return sum + num;
  }, 0);
}

function recalcTotals() {
  const totalUSD = getAllRowUSD();
  const { vnd, krw } = getRates();
  sumUSD.textContent = formatUSD(totalUSD);
  sumVND.textContent = formatVND(totalUSD * vnd);
  sumKRW.textContent = formatKRW(totalUSD * krw);
}

/* ==========================
   Bind service items
========================== */
function bindServiceItems() {
  $$(".svc-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const type = item.getAttribute("data-type") || "기타";
      const iconRaw = item.getAttribute("data-icon") || "";
      const name = item.getAttribute("data-name") || $(".svc-name", item)?.textContent || "Item";
      const usd  = parseFloat(item.getAttribute("data-usd")) || 0;

      const normType = normalizeType(type);
      const icon = iconRaw || getIconForType(normType);

      createRow({ type: normType, icon, name, usd });
    });
  });
}

/* ==========================
   Add blank line button
========================== */
function bindAddLine() {
  $("#addLine")?.addEventListener("click", () => {
    createRow({ type: "기타", icon: getIconForType("기타"), name: "", usd: 0 });
  });
}

/* ==========================
   Rate change handlers
========================== */
function bindRates() {
  ["rateVND", "rateKRW"].forEach((id) => {
    const el = $("#" + id);
    if (el) el.addEventListener("input", recalcTotals);
  });
}

/* ==========================
   Panel accordion (collapse)
========================== */
function bindPanels() {
  $$(".svc-panel").forEach((panel) => {
    const head = $(".svc-panel__head", panel);
    if (!head) return;

    head.addEventListener("click", () => {
      // Đóng panel khác
      $$(".svc-panel").forEach(p => {
        if (p !== panel) { p.classList.add("collapsed"); p.classList.remove("open"); }
      });
      // Toggle panel hiện tại
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
    });
  });
}

/* ==========================
   Chuẩn hoá các dòng đang có
   (trước khi Export/Print)
========================== */
function normalizeExistingRows(){
  $$(".svc-type-select").forEach(sel=>{
    const canon = normalizeType(sel.value);
    if (canon !== sel.value) sel.value = canon;
    const tr = sel.closest("tr");
    if (tr) {
      tr.dataset.type = canon;
      const ico = tr.querySelector(".svc-icon");
      if (ico) ico.textContent = getIconForType(canon);
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
   Xuất/In
========================== */
// Clone section và biến input/select thành text để in
function cloneForPrint(sectionEl) {
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

function buildPrintContent() {
  const booking   = document.querySelector('.booking-section');
  const svcSection= document.querySelector('.svc-table')?.closest('section.card');
  const summary   = document.querySelector('.summary-bank');

  const parts = [];
  if (booking)   parts.push(cloneForPrint(booking).outerHTML);
  if (svcSection)parts.push(cloneForPrint(svcSection).outerHTML);
  if (summary)   parts.push(cloneForPrint(summary).outerHTML);
  return parts.join('\n');
}

function openPrintView() {
  normalizeExistingRows(); // đảm bảo loại/icon chuẩn trước khi in
  const html = buildPrintContent();

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>Quotation</title>
<style>
  *{box-sizing:border-box}
  body{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:20px;background:#fff}
  .card{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:16px}
  .section-title{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:800}
  .subhead{margin:10px 0 6px;font-weight:700;color:#64748b}
  label{color:#64748b;font-size:12px;margin-bottom:4px;display:block}
  .grid{display:grid;gap:10px}
  .g3{grid-template-columns:1fr 1fr 1fr}
  .g2{grid-template-columns:1fr 1fr}
  @media print, (max-width:800px){
    .g3{grid-template-columns:1fr}
    .g2{grid-template-columns:1fr}
  }
  .pill-input,.print-field{display:block;width:100%;min-height:36px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
  .svc-table{width:100%;border-collapse:collapse;margin-top:6px}
  .svc-table th,.svc-table td{border:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}
  .svc-table th{background:#f8fafc;font-weight:700}
  .col-total{text-align:right}
  .totals{display:grid;gap:8px}
  .totals>div{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px}
  .totals .grand{background:#eef6ff;border-color:#d6e4ff;font-weight:800}
  .summary-bank .bank-box{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px}
  .summary-bank .bank-title{display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:8px;color:#78350f}
  .summary-bank .bank-rows{display:grid;gap:6px;margin-bottom:8px}
  .summary-bank .row{display:flex;justify-content:space-between}
  .summary-bank .label{color:#6b7280}
  .summary-bank .value{color:#8a5a00;font-weight:700}
  .summary-bank .bank-note{display:flex;gap:8px;padding:8px 10px;background:#fef9c3;border:1px solid #facc15;border-radius:8px;color:#8a5a00}
  .btn,.btn.pill,#addLine{display:none!important}
  @page{size:A4;margin:14mm}
</style>
</head>
<body>
  <h2 style="margin:0 0 12px 0;">고객 예약 내역</h2>
  ${html}
  <script>
    setTimeout(function(){
      window.focus();
      window.print();
      setTimeout(()=> window.close(), 300);
    }, 200);
  <\/script>
</body>
</html>`);
  doc.close();
}
document.getElementById('btnExport')?.addEventListener('click', openPrintView);

// Clone section để xuất trang xem (không in)
function cloneForExport(sectionEl) {
  const clone = sectionEl.cloneNode(true);

  clone.querySelectorAll('button,.btn,#addLine,.btn-del,.calc-btn').forEach(n => n.remove());

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

  const tbl = clone.querySelector('.svc-table');
  if (tbl) {
    const delTh = tbl.querySelector('thead th.col-del');
    if (delTh && delTh.parentElement) delTh.parentElement.removeChild(delTh);
    clone.querySelectorAll('tbody td.col-del').forEach(td => td.remove());
  }
  return clone;
}

function buildExportHTML() {
  const booking   = document.querySelector('.booking-section');
  const svcSection= document.querySelector('.svc-table')?.closest('section.card');
  const summary   = document.querySelector('.summary-bank');

  const parts = [];
  if (booking)    parts.push(cloneForExport(booking).outerHTML);
  if (svcSection) parts.push(cloneForExport(svcSection).outerHTML);
  if (summary)    parts.push(cloneForExport(summary).outerHTML);
  return parts.join('\n');
}

function openExportPage() {
  normalizeExistingRows(); // chuẩn hóa trước khi xuất
  const brand = document.getElementById('brand')?.value?.trim() || '';
  const title = brand ? `${brand} — Quotation` : 'Quotation';

  const content = buildExportHTML();
  const w = window.open('', '_blank');

  w.document.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="css/style.css" />
  <style>
    body{ background:#fff; }
    .wrap{ width:min(900px,94vw); margin:28px auto; }
    .btn, button{ display:none !important; }
    .svc-table{ border-collapse:collapse !important; border-spacing:0 !important; width:100%; }
    @media (max-width: 900px){
      .svc-table, .svc-table thead, .svc-table tbody,
      .svc-table th, .svc-table td, .svc-table tr{
        display:revert !important; width:auto !important;
      }
      .svc-table tbody td::before{ content:'' !important; display:none !important; }
    }
    .export-field{
      display:inline-block; min-height:36px; padding:8px 12px;
      border:1px solid #e5e7eb; border-radius:8px; background:#fff;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header style="margin-bottom:14px">
      <h1 style="margin:0 0 6px">${title}</h1>
      <p class="sub" style="margin:0;color:#64748b">Bản tổng hợp thông tin đặt dịch vụ</p>
    </header>
    ${content}
  </div>
</body>
</html>`);
  w.document.close();
}
document.getElementById('btnExportView')?.addEventListener('click', openExportPage);
