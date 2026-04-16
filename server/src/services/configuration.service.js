import { pool } from "../db/pool.js";

export async function getConfig(key) {
  const { rows } = await pool.query(
    `SELECT value FROM configuration WHERE key = $1`,
    [key],
  );
  return rows[0]?.value ?? null;
}
