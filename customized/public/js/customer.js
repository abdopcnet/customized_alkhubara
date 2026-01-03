// Frontend logging: console.log('[customer.js] method: function_name')

frappe.ui.form.on("Customer", {
  custom_create_projects: function (frm) {
    frappe.msgprint(__("جاري مراجعة المشاريع المستحقة..."));

    frappe.call({
      method: "customized.customer.run_monthly_projects_for_customer",
      args: {
        customer: frm.doc.name,
      },
      callback: function (r) {
        if (r.message) {
          frappe.msgprint(r.message.message || r.message);
        }
        frm.reload_doc();
      },
    });
    console.log("[customer.js] method: custom_create_projects");
  },
});
