// FILE: client/src/api/receiptReports.api.js
import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

// strip null/empty values before building query string
function buildQuery(params) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== "")),
  ).toString();
}

export async function fetchReceiptList(params) {
  const q = buildQuery(params);
  const res = unwrap(await http(`/api/receipt-reports/receipt-list${q ? `?${q}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function fetchInvoiceReceiptReport(params) {
  const q = buildQuery(params);
  const res = unwrap(await http(`/api/receipt-reports/invoice-receipt${q ? `?${q}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}
