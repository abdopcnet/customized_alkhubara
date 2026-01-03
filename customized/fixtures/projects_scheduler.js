const root = root_element;

root.innerHTML = `
<style>
  /* Modern Reset & Base */
  .mp-wrap {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    padding: 24px;
    background: #f8fafc; /* Slate 50 */
    min-height: calc(100vh - 180px);
    color: #334155; /* Slate 700 */
  }

  .mp-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    border: 1px solid #e2e8f0; /* Slate 200 */
  }

  /* Header Section */
  .mp-top {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    align-items: flex-end;
    margin-bottom: 24px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 24px;
  }

  .mp-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #64748b; /* Slate 500 */
    margin-bottom: 8px;
    display: block;
  }

  /* Buttons */
  .mp-btns {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-right: auto; /* Push to left in RTL */
  }

  .mp-btns .btn {
    border-radius: 8px;
    padding: 10px 16px;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s;
    border: none;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }

  .btn-primary { background-color: #3b82f6; color: white; }
  .btn-primary:hover { background-color: #2563eb; }
  .btn-success { background-color: #10b981; color: white; }
  .btn-success:hover { background-color: #059669; }
  .btn-default { background-color: #ffffff; color: #334155; border: 1px solid #cbd5e1 !important; }
  .btn-default:hover { background-color: #f8fafc; }

  /* KPI Cards */
  .mp-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .mp-kpi {
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .mp-kpi .v {
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a; /* Slate 900 */
    line-height: 1;
    margin-bottom: 4px;
  }

  .mp-kpi .t {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  /* Search Bar */
  .mp-search {
    position: relative;
    margin-bottom: 24px;
  }

  .mp-search input.form-control {
    width: 100%;
    max-width: 100%;
    border-radius: 12px;
    padding: 12px 16px;
    border: 1px solid #cbd5e1;
    font-size: 0.95rem;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    transition: all 0.2s;
  }

  .mp-search input.form-control:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    outline: none;
  }

  .mp-stat {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    color: #94a3b8;
  }

  /* Grid List Replaced with Table */
  .mp-table-wrap {
    overflow-x: auto;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    border: 1px solid #e2e8f0;
  }

  .mp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .mp-table th {
    background: #f8fafc;
    padding: 16px;
    text-align: right;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  .mp-table td {
    padding: 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: middle;
  }

  .mp-table tr:last-child td {
    border-bottom: none;
  }

  .mp-table tr:hover td {
    background: #f8fafc;
  }

  /* Status Cell */
  .status-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mp-notes-cell {
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #94a3b8;
  }

  /* Badges */
  .badge {
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .b-over { background: #fef2f2; color: #ef4444; }
  .b-due { background: #fffbeb; color: #b45309; }
  .b-ok { background: #f0fdf4; color: #15803d; }
  .b-info { background: #eff6ff; color: #1d4ed8; }

  @media (max-width: 768px){
    .mp-top { flex-direction: column; align-items: stretch; gap: 16px; }
    .mp-btns { width: 100%; justify-content: stretch; }
    .mp-btns .btn { flex: 1; text-align: center; }
    .mp-kpis { grid-template-columns: repeat(2, 1fr); }
  }
</style>

<div class="mp-wrap">
  <div class="mp-card">
    <div class="mp-top">
      <div style="flex: 1; min-width: 250px;">
        <label class="mp-label">العميل</label>
        <div id="mp_customer"></div>
      </div>

      <div class="mp-btns">
        <button class="btn btn-primary" id="mp_refresh">
          <i class="fa fa-refresh"></i> تحديث
        </button>
        <button class="btn btn-success" id="mp_run_all">
          <i class="fa fa-play"></i> تشغيل المستحق
        </button>
        <button class="btn btn-default" id="mp_add">
          <i class="fa fa-plus"></i> إضافة جدول
        </button>
      </div>
    </div>

    <div class="mp-kpis">
      <div class="mp-kpi">
        <div class="v" id="k_total">0</div>
        <div class="t">إجمالي الجداول</div>
      </div>
      <div class="mp-kpi" style="border-left: 4px solid #ef4444;">
        <div class="v" id="k_over" style="color: #ef4444;">0</div>
        <div class="t">متأخر (سالب)</div>
      </div>
      <div class="mp-kpi" style="border-left: 4px solid #f59e0b;">
        <div class="v" id="k_due7" style="color: #f59e0b;">0</div>
        <div class="t">خلال 7 أيام</div>
      </div>
      <div class="mp-kpi">
        <div class="v" id="k_next">-</div>
        <div class="t">أقرب تشغيل</div>
      </div>
    </div>

    <div class="mp-search">
      <input id="mp_search" class="form-control" placeholder="بحث في الجدول… (اسم العميل / المشروع / ملاحظات)">
      <div id="mp_stat" class="mp-stat"></div>
    </div>
  </div>

  <br>

  <div class="mp-table-wrap">
    <table class="mp-table">
      <thead>
        <tr>
          <th>المشروع</th>
          <th>العميل</th>
          <th>التكرار</th>
          <th>التشغيل القادم</th>
          <th>آخر تشغيل</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody id="mp_list"></tbody>
    </table>
  </div>
</div>
`;

// Customer link control
const customer_control = frappe.ui.form.make_control({
  parent: root.querySelector("#mp_customer"),
  df: { fieldtype: "Link", options: "Customer", fieldname: "customer" },
  render_input: true,
});

// FIX: Prevent global search from hijacking focus
const customer_input = root.querySelector("#mp_customer input");
if (customer_input) {
  customer_input.addEventListener("keydown", (e) => {
    e.stopPropagation();
  });
}

const listEl = root.querySelector("#mp_list");
const searchInput = root.querySelector("#mp_search");

// FIX: Prevent global search from hijacking focus on search bar too
if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
  });
}

let DATA = [];

function esc(v) {
  return frappe.utils.escape_html((v ?? "").toString());
}

function toDate(s) {
  if (!s) return null;
  try {
    return frappe.datetime.str_to_obj(s);
  } catch (e) {
    return null;
  }
}

function daysDiff(target) {
  const t = toDate(target);
  if (!t) return null;
  const now = toDate(frappe.datetime.nowdate());
  const ms = t.getTime() - now.getTime();
  return Math.ceil(ms / 86400000); // عدّاد بالأيام
}

// عدّاد ذكي
function badgeFor(diff) {
  if (diff === null) return { cls: "b-info", txt: "بدون موعد" };

  if (diff < 0) {
    return { cls: "b-over", txt: `متأخر ${Math.abs(diff)} يوم` };
  }

  if (diff === 0) {
    return { cls: "b-due", txt: "اليوم" };
  }

  if (diff <= 7) {
    return { cls: "b-due", txt: `بعد ${diff} يوم` };
  }

  if (diff <= 30) {
    return { cls: "b-ok", txt: `بعد ${Math.ceil(diff / 7)} أسبوع` };
  }

  return { cls: "b-ok", txt: `بعد ${Math.ceil(diff / 30)} شهر` };
}

function computeKPIs(rows) {
  const total = rows.length;
  const diffs = rows.map((r) => daysDiff(r.تاريخ_التشغيل_القادم || r.تاريخ_الانشاء)).filter((x) => x !== null);

  const over = diffs.filter((d) => d < 0).length;
  const due7 = diffs.filter((d) => d >= 0 && d <= 7).length;
  const next = diffs.length ? Math.min(...diffs) : null;

  root.querySelector("#k_total").textContent = total;
  root.querySelector("#k_over").textContent = over;
  root.querySelector("#k_due7").textContent = due7;
  root.querySelector("#k_next").textContent = next === null ? "-" : next < 0 ? `${next}` : `${next} يوم`;
}

function render(rows) {
  const q = (searchInput.value || "").toLowerCase();
  let filtered = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));

  // ترتيب أذكى
  filtered.sort((a, b) => {
    const da = daysDiff(a.تاريخ_التشغيل_القادم || a.تاريخ_الانشاء);
    const db = daysDiff(b.تاريخ_التشغيل_القادم || b.تاريخ_الانشاء);

    const wa = da < 0 ? 0 : da <= 0 ? 1 : da <= 7 ? 2 : da <= 30 ? 3 : 4;
    const wb = db < 0 ? 0 : db <= 0 ? 1 : db <= 7 ? 2 : db <= 30 ? 3 : 4;

    if (wa !== wb) return wa - wb;
    return (da ?? 999999) - (db ?? 999999);
  });

  computeKPIs(filtered);

  listEl.innerHTML = filtered
    .map((r) => {
      const nextRef = r.تاريخ_التشغيل_القادم || r.تاريخ_الانشاء;
      const diff = daysDiff(nextRef);
      const b = badgeFor(diff);

      // Urgent styles not needed on rows, maybe just a border on the left or text color
      const rowClass = diff !== null && diff < 0 ? "bg-red-50" : "";

      return `
    <tr class="${rowClass}">
      <td>
        <div style="font-weight:700; color:#0f172a;">${esc(r.المشروع || "-")}</div>
        <div style="font-size:0.8rem; color:#94a3b8;">أنشئ: ${esc(r.تاريخ_الانشاء || "-")}</div>
      </td>
      <td>
        <div style="font-weight:600;">${esc(r.parent || "-")}</div>
      </td>
      <td>
        <span class="badge b-info">
           ${esc((r.عدد_شهور_التشغيل ?? "-") + " شهر")}
        </span>
        <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px">يوم: ${esc(
          r.يوم_التشغيل_في_شهر_التشغيل || "-"
        )}</div>
      </td>
      <td>
        <div class="status-cell">
          <span class="badge ${b.cls}">
            ${esc(b.txt)}
          </span>
        </div>
        <div style="font-size:0.8rem; color:#64748b; margin-top:4px; font-weight:600">${esc(nextRef || "-")}</div>
      </td>
      <td>
        <div style="font-weight:600; color:#334155;">${esc(r.اخر_تاريخ_تشغيل || "-")}</div>
      </td>
      <td class="mp-notes-cell" title="${esc(r.ملاحظات || "")}">
        ${esc(r.ملاحظات || "—")}
      </td>
    </tr>
    `;
    })
    .join("");

  root.querySelector("#mp_stat").textContent = `${filtered.length} نتيجة`;
}

async function load() {
  // Removed mp_only_due checkbox logic
  const only_due = 0;
  // Get value from the control if possible, or input
  const val = customer_control ? customer_control.get_value() : customer_input.value;
  const customer = (val || "").trim();

  try {
    const r = await frappe.call({
      method: "monthly_projects_dashboard",
      args: { action: "get", customer, only_due },
    });

    DATA = r.message || [];
    render(DATA);
  } catch (e) {
    console.error(e);
    // Fallback if method fails
    root.querySelector("#mp_stat").textContent = "خطأ في التحميل";
  }
}

root.querySelector("#mp_refresh").onclick = load;
searchInput.oninput = () => render(DATA);

root.querySelector("#mp_run_all").onclick = () => {
  frappe.confirm("هل أنت متأكد من تشغيل جميع المشاريع المستحقة الآن؟", () => {
    frappe.call({
      method: "monthly_projects_run_all_due",
      callback: (r) => {
        const m = r.message || {};
        frappe.msgprint(
          `تمت العملية بنجاح: <br> تم إنشاء ${m.created_projects || 0} مشروع <br> تم تحديث ${
            m.updated_customers || 0
          } عميل`
        );
        load();
      },
    });
  });
};

root.querySelector("#mp_add").onclick = () => {
  const d = new frappe.ui.Dialog({
    title: "إضافة جدول مشروع جديد",
    fields: [
      { fieldtype: "Link", fieldname: "customer", label: "العميل", options: "Customer", reqd: 1 },
      { fieldtype: "Link", fieldname: "template", label: "قالب المشروع", options: "Project Template", reqd: 1 },
      { fieldtype: "Date", fieldname: "creation_date", label: "تاريخ البداية", default: frappe.datetime.nowdate() },
      { fieldtype: "Int", fieldname: "freq_months", label: "تكرار كل (أشهر)", default: 3, reqd: 1 },
      { fieldtype: "Int", fieldname: "day_of_month", label: "يوم الاستحقاق في الشهر", default: 1, reqd: 1 },
      { fieldtype: "Small Text", fieldname: "notes", label: "ملاحظات" },
    ],
    primary_action_label: "حفظ البيانات",
    primary_action(values) {
      frappe.call({
        method: "monthly_projects_dashboard",
        args: { action: "add", ...values },
        callback() {
          frappe.msgprint({ title: "تم بنجاح", message: "تمت إضافة الجدول الجديد بنجاح", indicator: "green" });
          d.hide();
          load();
        },
      });
    },
  });
  d.show();
};

// أول تحميل + تحديث تلقائي كل 5 دقائق
load();
setInterval(() => load(), 5 * 60 * 1000);
