/* ==========================
   Helpers
========================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const formatUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const formatVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n || 0);

const formatKRW = (n) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n || 0);

/* Lấy tỷ giá hiện tại */
const getRates = () => {
  const vnd = parseFloat($("#rateVND")?.value) || 0;
  const krw = parseFloat($("#rateKRW")?.value) || 0;
  return { vnd, krw };
};

/* ==========================
   DOM targets
========================== */
const svcBody = $("#svcBody");
const sumUSD = $("#sumUSD");
const sumVND = $("#sumVND");
const sumKRW = $("#sumKRW");

function createRow({ type = "기타", icon = "🧾", name = "", usd = 0 } = {}) {
  const tr = document.createElement("tr");

  // Chọn field số lượng theo loại dịch vụ
  let qtyInputs = "";
  if (type.includes("아파트")) { // Chung cư
    qtyInputs = `
      <div class="svc-qty-wrap">
        <input class="svc-input qty-person" type="number" min="1" value="1" placeholder="인원" />
        <input class="svc-input qty-day" type="number" min="1" value="1" placeholder="일수" />
      </div>`;
  } else if (type.includes("골프")) { // Golf
    qtyInputs = `
      <div class="svc-qty-wrap">
        <input class="svc-input qty-person" type="number" min="1" value="1" placeholder="인원" />
        <input class="svc-input qty-round" type="number" min="1" value="1" placeholder="라운드" />
      </div>`;
  } else if (type.includes("차량")) { // Thuê xe
    qtyInputs = `
      <div class="svc-qty-wrap">
        <input class="svc-input qty-person" type="number" min="1" value="1" placeholder="인원" />
      </div>`;
  } else { // Mặc định
    qtyInputs = `<input class="svc-input qty-person" type="number" min="1" value="1" />`;
  }

  tr.innerHTML = `
    <td data-label="유형">
      <span class="type-chip"><span>${icon}</span><strong>${type}</strong></span>
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

  const priceEl = $(".price", tr);
  const currSel = $(".curr", tr);
  const totalEl = $(".total", tr);
  const delBtn  = $(".btn-del", tr);

  // Lấy các input số lượng (nếu có)
  const qtyEls = [
    ...tr.querySelectorAll(".qty-person,.qty-day,.qty-round")
  ];

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
  // Đọc tất cả .total -> parse từ text hoặc tính lại trực tiếp
  return $$(".total", svcBody).reduce((sum, td) => {
    // td.textContent như "$136.00" -> bỏ ký hiệu & phẩy
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
      const icon = item.getAttribute("data-icon") || "🧾";
      const name = item.getAttribute("data-name") || $(".svc-name", item)?.textContent || "Item";
      const usd = parseFloat(item.getAttribute("data-usd")) || 0;
      const unit = item.getAttribute("data-unit") || "";
      createRow({ type, icon, name, usd, unit });
    });
  });
}

/* ==========================
   Add blank line button
========================== */
function bindAddLine() {
  $("#addLine")?.addEventListener("click", () => {
    createRow({ type: "기타", icon: "🧾", name: "", usd: 0 });
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
      // Đóng tất cả panels khác
      $$(".svc-panel").forEach(p => {
        if(p !== panel) {
          p.classList.add("collapsed");
          p.classList.remove("open");
        }
      });
      // Toggle panel hiện tại
      panel.classList.toggle("collapsed");
      panel.classList.toggle("open");
    });
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
  recalcTotals();
});


// --- helper: clone section và biến input/select thành text để in đẹp
function cloneForPrint(sectionEl) {
  const clone = sectionEl.cloneNode(true);

  // bỏ các nút không cần in
  clone.querySelectorAll('button,.btn,.btn-del,.calc-btn,#addLine').forEach(n => n.remove());

  // đổi input/select thành span text
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

// --- build HTML cần in
function buildPrintContent() {
  const booking = document.querySelector('.booking-section');
  const svcSection = document.querySelector('.svc-table')?.closest('section.card');
  const summary = document.querySelector('.summary-bank');

  const parts = [];
  if (booking) parts.push(cloneForPrint(booking).outerHTML);
  if (svcSection) parts.push(cloneForPrint(svcSection).outerHTML);
  if (summary) parts.push(cloneForPrint(summary).outerHTML);

  return parts.join('\n');
}

// --- mở trang in bằng iframe (khỏi bị chặn popup)
function openPrintView() {
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
  /* Reset in ấn gọn */
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
  /* Bảng dịch vụ */
  .svc-table{width:100%;border-collapse:collapse;margin-top:6px}
  .svc-table th,.svc-table td{border:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}
  .svc-table th{background:#f8fafc;font-weight:700}
  .col-total{text-align:right}
  /* Totals */
  .totals{display:grid;gap:8px}
  .totals>div{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px}
  .totals .grand{background:#eef6ff;border-color:#d6e4ff;font-weight:800}
  /* Bank box */
  .summary-bank .bank-box{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px}
  .summary-bank .bank-title{display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:8px;color:#78350f}
  .summary-bank .bank-rows{display:grid;gap:6px;margin-bottom:8px}
  .summary-bank .row{display:flex;justify-content:space-between}
  .summary-bank .label{color:#6b7280}
  .summary-bank .value{color:#8a5a00;font-weight:700}
  .summary-bank .bank-note{display:flex;gap:8px;padding:8px 10px;background:#fef9c3;border:1px solid #facc15;border-radius:8px;color:#8a5a00}
  /* Ẩn các nút, icon */
  .btn,.btn.pill,#addLine{display:none!important}
  /* Margin trang in đẹp */
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
