import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listCustomers(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/customers${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function getCustomer(id) {
  const res = unwrap(await http(`/api/customers/${id}`));
  return res.data;
}

export async function listCountries() {
  const res = unwrap(await http("/api/customers/countries"));
  return res.data ?? [];
}

export async function createCustomer(data) {
  const res = unwrap(await http("/api/customers", { method: "POST", body: JSON.stringify(data) }));
  return res.data;
}

export async function updateCustomer(id, data) {
  const res = unwrap(await http(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }));
  return res.data;
}

export async function deleteCustomer(id, force = false) {
  const url = `/api/customers/${id}` + (force ? "?force=true" : "");
  const res = unwrap(await http(url, { method: "DELETE" }));
  return res.data;
}
