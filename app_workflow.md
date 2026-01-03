# App Workflow (customized)

## Customer client script

1. Add or update the client code in `customized/customized/public/js/customer.js`.
2. Ensure `doctype_js` in `customized/customized/hooks.py` maps `Customer` to that file.
3. Rebuild and clear cache:

- `bench build`
- `bench --site <site> clear-cache`
- `bench restart`

## Fixtures

- Fixtures JSON files are imported as data.
- Non-JSON files inside `fixtures/` are not loaded automatically by Frappe.
