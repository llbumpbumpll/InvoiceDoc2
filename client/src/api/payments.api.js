import { http } from "./http";

export async function listPayments(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await http(`/api/payments/list${query ? `?${query}` : ""}`);
  return res;
}