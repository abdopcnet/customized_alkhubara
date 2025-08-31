# Copyright (c) 2025, admin@future-support.online and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
	# Columns definition
	columns = [
		{
			"fieldname": "customer_name",
			"label": _("اسم العميل"),
			"fieldtype": "Link",
			"options": "Customer",
			"width": 230
		},
		{
			"fieldname": "attach_type",
			"label": _("نوع المستند"),
			"fieldtype": "Data",
			"width": 150
		},
		{
			"fieldname": "custom_status",
			"label": _("حالة الملف "),
			"fieldtype": "Select",
			"width": 100
		},
		{
			"fieldname": "attach_name",
			"label": _("وصف المستند"),
			"fieldtype": "Data",
			"width": 200
		},
		{
			"fieldname": "attach_file",
			"label": _("المستند المرفق"),
			"fieldtype": "HTML",
			"width": 180
		},
		{
			"fieldname": "doc_start",
			"label": _("تاريخ بداية المستند"),
			"fieldtype": "Date",
			"width": 180
		},
		{
			"fieldname": "doc_end",
			"label": _("تاريخ انتهاء المستند"),
			"fieldtype": "Date",
			"width": 180
		},
		{
			"fieldname": "days_from_doc_end",
			"label": "الايام المتبقية لانتهاء المستند",
			"fieldtype": "Float",
			"width": 200
		},
		{
			"fieldname": "notes",
			"label": _("الملاحظات"),
			"fieldtype": "Data",
			"width": 300
		}
	]

	# Query to fetch data
	query = """
		SELECT
			c.name,
			c.customer_name,
			ca.attach_name,
			ca.attach_type,
			ca.doc_start,
			ca.doc_end,
			ca.attach_file,
			ca.notes,
			ca.custom_status,
			DATEDIFF(ca.doc_end, CURRENT_DATE) AS days_from_doc_end
		FROM
			`tabCustomer` c
		LEFT JOIN
			`tabCustomer Attachment` ca ON c.name = ca.parent
	"""

	where_conditions = []
	params = {}

	# Get allowed customers for user permissions
	allowed_customers = frappe.db.sql("""
		SELECT for_value
		FROM `tabUser Permission`
		WHERE user = %s AND allow = 'Customer'
	""", (frappe.session.user,), as_list=True)

	allowed_customers = [x[0] for x in allowed_customers]

	if allowed_customers:
		where_conditions.append("c.name IN %(allowed_customers)s")
		params["allowed_customers"] = tuple(allowed_customers)

	# Apply filters dynamically
	if filters.get("doc_start_from"):
		where_conditions.append("ca.doc_start >= %(doc_start_from)s")
		params["doc_start_from"] = filters["doc_start_from"]

	if filters.get("doc_start_to"):
		where_conditions.append("ca.doc_start <= %(doc_start_to)s")
		params["doc_start_to"] = filters["doc_start_to"]

	if filters.get("doc_end_from"):
		where_conditions.append("ca.doc_end >= %(doc_end_from)s")
		params["doc_end_from"] = filters["doc_end_from"]

	if filters.get("doc_end_to"):
		where_conditions.append("ca.doc_end <= %(doc_end_to)s")
		params["doc_end_to"] = filters["doc_end_to"]

	if filters.get("customer_name"):
		where_conditions.append("c.name = %(customer_name)s")
		params["customer_name"] = filters["customer_name"]

	if filters.get("custom_status"):
		where_conditions.append("ca.custom_status = %(custom_status)s")
		params["custom_status"] = filters["custom_status"]    

	if filters.get("attach_type"):
		where_conditions.append("ca.attach_type IN %(attach_type)s")
		params["attach_type"] = tuple(filters["attach_type"])

	if where_conditions:
		query = query +  " WHERE " + " AND ".join(where_conditions)

	# Execute the query
	mydata = frappe.db.sql(query, params, as_dict=True)

	# Process data
	for row in mydata:
		# Correct attach_file URL
		if row.get("attach_file"):
			file_url = row["attach_file"].replace("/app/file", "/files")
			row["attach_file"] = f'<a href="{file_url}" target="_blank">Show Document</a>'

		# Add custom styling based on `custom_status`
		if row.get("custom_status"):
			if row["custom_status"] == "Valid":
				row["row_style"] = "background-color: #f8d7da; color: #721c24;"  # Red for expired
			elif row["custom_status"] == "Active":
				row["row_style"] = "background-color: #d4edda; color: #155724;"  # Green for active
			elif row["custom_status"] == "Pending":
				row["row_style"] = "background-color: #fff3cd; color: #856404;"  # Yellow for pending

	return columns, mydata