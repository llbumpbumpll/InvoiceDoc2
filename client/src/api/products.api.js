import { http } from "./http.js";

// If backend returns success: false, throw the error.message
function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/products${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function getProduct(id) {
  const res = unwrap(await http(`/api/products/${id}`));
  return res.data;
}

export async function listUnits() {
  const res = unwrap(await http("/api/products/units"));
  return res.data ?? [];
}

export async function createProduct(data) {
  const res = unwrap(await http("/api/products", { method: "POST", body: JSON.stringify(data) }));
  return res.data;
}

export async function updateProduct(id, data) {
  const res = unwrap(await http(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }));
  return res.data;
}

export async function deleteProduct(id, force = false) {
  const url = `/api/products/${id}` + (force ? "?force=true" : "");
  const res = unwrap(await http(url, { method: "DELETE" }));
  return res.data;
}
