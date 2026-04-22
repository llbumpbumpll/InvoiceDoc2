import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function getConfig() {
  const res = unwrap(await http("/api/configuration"));
  return res.data;
}

export async function updateConfig(data) {
  const res = unwrap(await http("/api/configuration", { method: "PUT", body: JSON.stringify(data) }));
  return res.data;
}
