import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listInvoices(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/invoices${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function getInvoice(id) {
  const res = unwrap(await http(`/api/invoices/${id}`));
  return res.data;
}

export async function createInvoice(payload) {
  const res = unwrap(await http("/api/invoices", { method: "POST", body: JSON.stringify(payload) }));
  return res.data;
}

export async function deleteInvoice(id) {
  const res = unwrap(await http(`/api/invoices/${id}`, { method: "DELETE" }));
  return res.data;
}

export async function updateInvoice(id, payload) {
  const res = unwrap(await http(`/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(payload) }));
  return res.data;
}
