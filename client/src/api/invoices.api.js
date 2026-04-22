import { http } from "./http.js";

// If backend returns success: false, throw the error.message
function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listInvoices(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/invoices${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function getInvoice(invoiceNo) {
  const res = unwrap(await http(`/api/invoices/${encodeURIComponent(invoiceNo)}`));
  return res.data;
}

export async function createInvoice(payload) {
  const res = unwrap(await http("/api/invoices", { method: "POST", body: JSON.stringify(payload) }));
  return res.data;
}

export async function deleteInvoice(invoiceNo) {
  const res = unwrap(await http(`/api/invoices/${encodeURIComponent(invoiceNo)}`, { method: "DELETE" }));
  return res.data;
}

export async function updateInvoice(invoiceNo, payload) {
  const res = unwrap(await http(`/api/invoices/${encodeURIComponent(invoiceNo)}`, { method: "PUT", body: JSON.stringify(payload) }));
  return res.data;
}

// Lab 4: unpaid invoices for a given customer — used by receipt form Invoice LoV.
// Optionally exclude a specific receipt_id (so editing a receipt can still see
// the invoices that receipt already touches).
export async function listUnpaidInvoicesForCustomer(customer_code, exclude_receipt_id) {
  const params = new URLSearchParams();
  if (customer_code) params.set("customer_code", String(customer_code));
  if (exclude_receipt_id != null && exclude_receipt_id !== "") {
    params.set("exclude_receipt_id", String(exclude_receipt_id));
  }
  const qs = params.toString();
  const res = unwrap(await http(`/api/invoices/lov/unpaid${qs ? `?${qs}` : ""}`));
  return res.data ?? [];
}
