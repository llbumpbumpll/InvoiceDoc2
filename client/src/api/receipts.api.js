// FILE: client/src/api/receipts.api.js
import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listReceipts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/receipts${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function getReceipt(receiptNo) {
  const res = unwrap(await http(`/api/receipts/${encodeURIComponent(receiptNo)}`));
  return res.data ?? null;
}

export async function createReceipt(body) {
  const res = unwrap(await http(`/api/receipts`, { method: "POST", body: JSON.stringify(body) }));
  return res.data;
}

export async function updateReceipt(receiptNo, body) {
  const res = unwrap(
    await http(`/api/receipts/${encodeURIComponent(receiptNo)}`, { method: "PUT", body: JSON.stringify(body) }),
  );
  return res.data;
}

export async function deleteReceipt(receiptNo) {
  unwrap(await http(`/api/receipts/${encodeURIComponent(receiptNo)}`, { method: "DELETE" }));
  return { ok: true };
}

export async function listUnpaidInvoices(customerCode, receiptNo = null) {
  const params = new URLSearchParams({ customer_code: customerCode });
  if (receiptNo) params.set("receipt_no", receiptNo);
  const res = unwrap(await http(`/api/receipts/unpaid-invoices?${params.toString()}`));
  return res.data ?? [];
}
