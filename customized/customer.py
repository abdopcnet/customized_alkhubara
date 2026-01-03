import frappe
from frappe import _


@frappe.whitelist()
def run_monthly_projects_for_customer(customer):
    """Run monthly projects creation for a specific customer"""
    today = frappe.utils.getdate(frappe.utils.nowdate())
    created = 0

    try:
        doc = frappe.get_doc("Customer", customer)
        rows = doc.get("custom_scheduled_projects_table") or []
        changed = False

        for row in rows:
            # تاريخ التشغيل المعتمد
            run_date = row.get("تاريخ_التشغيل_القادم") or row.get("تاريخ_الانشاء")
            if not run_date:
                continue

            run_date = frappe.utils.getdate(run_date)

            if today >= run_date:
                template = row.get("المشروع")
                if not template:
                    continue

                # ✅ إنشاء مشروع واحد فقط
                p = frappe.new_doc("Project")
                p.project_name = f"{template} - {doc.customer_name} - {today}"
                p.project_template = template
                p.customer = doc.name
                p.expected_start_date = today
                p.insert(ignore_permissions=True)
                created += 1

                # ✅ سجل آخر تشغيل
                row.set("اخر_تاريخ_تشغيل", today)

                # ✅ احسب القادم بناء على run_date (آخر موعد مستحق)
                freq = int(row.get("عدد_شهور_التشغيل") or 1)
                base_next = frappe.utils.add_months(run_date, freq)

                target_day = int(row.get("يوم_التشغيل_في_شهر_التشغيل") or base_next.day)
                last_day = frappe.utils.get_last_day(base_next)
                if target_day > last_day.day:
                    target_day = last_day.day

                next_run = frappe.utils.getdate(f"{base_next.year}-{base_next.month}-{target_day}")

                # ✅ لو كان متأخر أكتر من دورة، ارفع التاريخ لحد ما يبقى بعد اليوم (بدون إنشاء مشاريع إضافية)
                while today >= next_run:
                    base_next = frappe.utils.add_months(next_run, freq)
                    last_day = frappe.utils.get_last_day(base_next)
                    target_day2 = int(row.get("يوم_التشغيل_في_شهر_التشغيل") or base_next.day)
                    if target_day2 > last_day.day:
                        target_day2 = last_day.day
                    next_run = frappe.utils.getdate(f"{base_next.year}-{base_next.month}-{target_day2}")

                row.set("تاريخ_التشغيل_القادم", next_run)
                changed = True

        if changed:
            doc.save(ignore_permissions=True)

        frappe.db.commit()
        return {
            "created_projects": created,
            "message": _("تم إنشاء {0} مشروع بنجاح").format(created) if created > 0 else _("لا توجد مشاريع مستحقة للإنشاء")
        }

    except Exception as e:
        frappe.log_error(frappe.utils.get_traceback(), "Monthly Projects Run Customer Error")
        frappe.throw(_("خطأ في تشغيل المشاريع: {0}").format(str(e)))


@frappe.whitelist()
def get_scheduled_projects_data(customer=None):
    """Get scheduled projects data from Customer child table for dashboard"""
    try:
        filters = {"disabled": 0}
        if customer:
            filters["name"] = customer

        customers = frappe.get_all("Customer", filters=filters, fields=["name", "customer_name"])

        data = []
        for cust in customers:
            try:
                doc = frappe.get_doc("Customer", cust.name)
                rows = doc.get("custom_scheduled_projects_table") or []

                for row in rows:
                    row_data = {
                        "parent": cust.name,
                        "customer_name": cust.customer_name,
                        "المشروع": row.get("المشروع"),
                        "تاريخ_الانشاء": row.get("تاريخ_الانشاء"),
                        "عدد_شهور_التشغيل": row.get("عدد_شهور_التشغيل"),
                        "يوم_التشغيل_في_شهر_التشغيل": row.get("يوم_التشغيل_في_شهر_التشغيل"),
                        "ملاحظات": row.get("ملاحظات"),
                        "تاريخ_التشغيل_القادم": row.get("تاريخ_التشغيل_القادم"),
                        "اخر_تاريخ_تشغيل": row.get("اخر_تاريخ_تشغيل"),
                    }
                    data.append(row_data)
            except Exception:
                continue

        return data
    except Exception as e:
        frappe.log_error(frappe.utils.get_traceback(), "Get Scheduled Projects Data Error")
        return []


@frappe.whitelist()
def monthly_projects_dashboard(action="get", customer=None, only_due=0, template=None, creation_date=None, freq_months=3, day_of_month=1, notes=None):
    """Main dashboard API - compatible with original JSON"""
    if action == "get":
        # Filter by customer if provided
        filters = {"disabled": 0}
        if customer:
            filters["name"] = customer

        customers = frappe.get_all("Customer", filters=filters, fields=["name", "customer_name"])
        today = frappe.utils.getdate(frappe.utils.nowdate())

        data = []
        for cust in customers:
            try:
                doc = frappe.get_doc("Customer", cust.name)
                rows = doc.get("custom_scheduled_projects_table") or []

                for row in rows:
                    # Filter by only_due if requested
                    if only_due:
                        run_date = row.get("تاريخ_التشغيل_القادم") or row.get("تاريخ_الانشاء")
                        if run_date:
                            run_date = frappe.utils.getdate(run_date)
                            if today < run_date:
                                continue

                    row_data = {
                        "parent": cust.name,
                        "customer_name": cust.customer_name,
                        "المشروع": row.get("المشروع"),
                        "تاريخ_الانشاء": row.get("تاريخ_الانشاء"),
                        "عدد_شهور_التشغيل": row.get("عدد_شهور_التشغيل"),
                        "يوم_التشغيل_في_شهر_التشغيل": row.get("يوم_التشغيل_في_شهر_التشغيل"),
                        "ملاحظات": row.get("ملاحظات"),
                        "تاريخ_التشغيل_القادم": row.get("تاريخ_التشغيل_القادم"),
                        "اخر_تاريخ_تشغيل": row.get("اخر_تاريخ_تشغيل"),
                    }
                    data.append(row_data)
            except Exception:
                continue

        return data

    elif action == "add":
        # Add new scheduled project to customer
        if not customer or not template:
            frappe.throw(_("العميل و قالب المشروع مطلوبان"))

        try:
            doc = frappe.get_doc("Customer", customer)
            creation_date = creation_date or frappe.utils.nowdate()
            creation_date = frappe.utils.getdate(creation_date)

            # Calculate next run date
            target_day = min(day_of_month, frappe.utils.get_last_day(creation_date).day)
            next_run = frappe.utils.getdate(f"{creation_date.year}-{creation_date.month}-{target_day}")

            row = doc.append("custom_scheduled_projects_table", {
                "المشروع": template,
                "تاريخ_الانشاء": creation_date,
                "عدد_شهور_التشغيل": freq_months,
                "يوم_التشغيل_في_شهر_التشغيل": day_of_month,
                "ملاحظات": notes or "",
                "تاريخ_التشغيل_القادم": next_run,
            })

            doc.save(ignore_permissions=True)
            frappe.db.commit()
            return {"status": "success"}
        except Exception as e:
            frappe.log_error(frappe.utils.get_traceback(), "Monthly Projects Dashboard Add Error")
            frappe.throw(_("خطأ في إضافة الجدول: {0}").format(str(e)))

    return []


@frappe.whitelist()
def monthly_projects_run_all_due():
    """Run all due monthly projects for all customers - compatible with original JSON"""
    today = frappe.utils.getdate(frappe.utils.nowdate())
    created = 0
    updated_customers = 0

    customers = frappe.get_all("Customer", filters={"disabled": 0}, pluck="name")

    for cust in customers:
        try:
            doc = frappe.get_doc("Customer", cust)
            rows = doc.get("custom_scheduled_projects_table") or []
            changed = False

            for row in rows:
                run_date = row.get("تاريخ_التشغيل_القادم") or row.get("تاريخ_الانشاء")
                if not run_date:
                    continue

                run_date = frappe.utils.getdate(run_date)

                if today >= run_date:
                    template = row.get("المشروع")
                    if not template:
                        continue

                    p = frappe.new_doc("Project")
                    p.project_name = f"{template} - {doc.customer_name} - {today}"
                    p.project_template = template
                    p.customer = doc.name
                    p.expected_start_date = today
                    p.insert(ignore_permissions=True)
                    created += 1

                    row.set("اخر_تاريخ_تشغيل", today)

                    freq = int(row.get("عدد_شهور_التشغيل") or 1)
                    base_next = frappe.utils.add_months(run_date, freq)

                    target_day = int(row.get("يوم_التشغيل_في_شهر_التشغيل") or base_next.day)
                    last_day = frappe.utils.get_last_day(base_next)
                    if target_day > last_day.day:
                        target_day = last_day.day

                    next_run = frappe.utils.getdate(f"{base_next.year}-{base_next.month}-{target_day}")

                    while today >= next_run:
                        base_next = frappe.utils.add_months(next_run, freq)
                        last_day = frappe.utils.get_last_day(base_next)
                        target_day2 = int(row.get("يوم_التشغيل_في_شهر_التشغيل") or base_next.day)
                        if target_day2 > last_day.day:
                            target_day2 = last_day.day
                        next_run = frappe.utils.getdate(f"{base_next.year}-{base_next.month}-{target_day2}")

                    row.set("تاريخ_التشغيل_القادم", next_run)
                    changed = True

            if changed:
                doc.save(ignore_permissions=True)
                updated_customers += 1

        except Exception:
            frappe.log_error(frappe.utils.get_traceback(), "Monthly Projects Run All Error")

    frappe.db.commit()
    return {
        "created_projects": created,
        "updated_customers": updated_customers
    }
