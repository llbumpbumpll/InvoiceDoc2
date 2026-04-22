import { pool } from "../db/pool.js";

export async function getConfig() {
  const { rows } = await pool.query(
    "SELECT id, vat_percent FROM configuration WHERE id = 1",
  );
  if (rows.length === 0) {
    // Auto-seed default row if missing (matches migration default)
    await pool.query(
      "INSERT INTO configuration (id, vat_percent) VALUES (1, 0.07) ON CONFLICT DO NOTHING",
    );
    return { id: 1, vat_percent: 0.07 };
  }
  return rows[0];
}

export async function updateConfig({ vat_percent } = {}) {
  const current = await getConfig();
  const nextVat = vat_percent != null ? Number(vat_percent) : Number(current.vat_percent);
  await pool.query("UPDATE configuration SET vat_percent = $1 WHERE id = 1", [nextVat]);
  return { id: 1, vat_percent: nextVat };
}
