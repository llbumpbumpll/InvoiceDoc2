import { pool } from "../db/pool.js";

export async function listSalesPersons({
  search = "",
  page = 1,
  limit = 10,
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);
  const searchParam = `%${search}%`;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM sales_person WHERE code ILIKE $1 OR name ILIKE $1`,
    [searchParam],
  );
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `SELECT id, code, name, start_work_date
     FROM sales_person
     WHERE code ILIKE $1 OR name ILIKE $1
     ORDER BY code ASC
     LIMIT $2 OFFSET $3`,
    [searchParam, Number(limit), offset],
  );

  return {
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
}

export async function getSalesPersonByCode(code) {
  if (!code || String(code).trim() === "") return null;
  const { rows } = await pool.query(
    `SELECT code, name, start_work_date, created_at
     FROM sales_person
     WHERE code = $1`,
    [String(code).trim()],
  );
  return rows[0] ?? null;
}

export async function createSalesPerson({ code, name, start_work_date } = {}) {
  let resolvedCode = code;

  if (!resolvedCode || String(resolvedCode).trim() === "") {
    const maxRes = await pool.query("SELECT MAX(id) as m FROM sales_person");
    const nextId = Number(maxRes.rows[0].m || 0) + 1;
    resolvedCode = `SP${nextId.toString().padStart(3, "0")}`;
  }

  await pool.query(
    "INSERT INTO sales_person (code, name, start_work_date) VALUES ($1, $2, $3)",
    [resolvedCode, name, start_work_date || null],
  );

  return { code: resolvedCode };
}

export async function updateSalesPersonByCode(code, { code: newCode, name, start_work_date } = {}) {
  const resolvedCode = (newCode != null && String(newCode).trim() !== "") ? String(newCode).trim() : code;
  const r = await pool.query(
    "UPDATE sales_person SET code=$1, name=$2, start_work_date=$3 WHERE code=$4",
    [resolvedCode, name, start_work_date || null, code],
  );
  if (r.rowCount === 0) return null;
  return { ok: true, code: resolvedCode };
}

export async function deleteSalesPersonByCode(code) {
  const r = await pool.query("DELETE FROM sales_person WHERE code = $1", [code]);
  if (r.rowCount === 0) return null;
  return { ok: true };
}
