// Sales person CRUD: list (search, pagination) and get by code.
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

