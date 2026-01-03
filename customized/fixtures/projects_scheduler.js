const root = root_element;

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
        <div style="font-weight:600;">${esc(r.customer_name || r.parent || "-")}</div>
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
