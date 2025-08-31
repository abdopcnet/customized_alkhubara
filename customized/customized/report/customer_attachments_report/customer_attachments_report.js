// Copyright (c) 2025, admin@future-support.online and contributors
// For license information, please see license.txt

frappe.query_reports["Customer Attachments Report"] = {
    "filters": [
        {
            "fieldname": "doc_start_from",
            "label": __("بداية المستند (من)"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "doc_start_to",
            "label": __("بداية المستند (إلى)"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "doc_end_from",
            "label": __("نهاية المستند (من)"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "doc_end_to",
            "label": __("نهاية المستند (إلى)"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "customer_name",
            "label": __("Customer"),
            "fieldtype": "Link",
            "options": "Customer"
        },
        {
            "fieldname": "custom_status",
            "label": __("Status"),
            "fieldtype": "Link",
            "options": "Attach Status"
        },        
        {
            "fieldname": "attach_type",
            "label": __("نوع المستند"),
            "fieldtype": "MultiSelectList",
            "get_data": function (txt) {
                return frappe.db.get_link_options("Attach Type", txt);
            }
        }
    ],
  
};