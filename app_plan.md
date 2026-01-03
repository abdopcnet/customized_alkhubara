# App Plan (customized)

## Purpose

The `customized` app contains deployment-friendly customizations for a Frappe site.

## Current Plan

- Load Customer DocType client code from `customized/customized/public/js/customer.js` using `doctype_js` in `customized/customized/hooks.py`.
- Keep server-side logic in Python under `customized/customized/`.

## Notes

- After changing hooks or frontend assets, run `bench build` and clear cache for the site.
