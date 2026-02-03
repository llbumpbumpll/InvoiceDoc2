// HTTP helper for API calls (ตัวช่วยเรียก API)
// Example usage: http("/api/products")
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function http(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}
