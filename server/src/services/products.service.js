import { pool } from "../db/pool.js";

export async function listProducts({
  search = "",
  page = 1,
  limit = 10,
  sortBy = "code",
  sortDir = "asc",
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  const allowedSort = ["code", "name", "units_code", "unit_price"];
  const sortColumn = allowedSort.includes(sortBy)
    ? sortBy === "units_code"
      ? "u.code"
      : `p.${sortBy}`
    : "p.code";
  const sortDirection = sortDir === "asc" ? "ASC" : "DESC";

  const searchParam = `%${search}%`;

  const countResult = await pool.query(
    `
      SELECT COUNT(*) as total
      FROM product p
      JOIN units u ON u.id = p.units_id
      WHERE p.code ILIKE $1 OR p.name ILIKE $1 OR u.code ILIKE $1
    `,
    [searchParam],
  );
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `
      SELECT p.id, p.code, p.name, p.unit_price, u.code as units_code, p.units_id
      FROM product p
      JOIN units u ON u.id = p.units_id
      WHERE p.code ILIKE $1 OR p.name ILIKE $1 OR u.code ILIKE $1
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST
      LIMIT $2 OFFSET $3
    `,
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

export async function createProduct({ code, name, units_id, unit_price } = {}) {
  let resolvedCode = code;

  if (!resolvedCode || String(resolvedCode).trim() === "") {
    const maxRes = await pool.query("SELECT MAX(id) as m FROM product");
    const nextId = (maxRes.rows[0].m || 0) + 1;
    resolvedCode = `P${nextId.toString().padStart(3, "0")}`;
  }

  const { rows } = await pool.query(
    "INSERT INTO product (code, name, units_id, unit_price) VALUES ($1, $2, $3, $4) RETURNING id",
    [resolvedCode, name, units_id, unit_price],
  );
  return { id: rows[0].id, code: resolvedCode };
}

export async function updateProduct(id, { code, name, units_id, unit_price } = {}) {
  await pool.query("UPDATE product SET code=$1, name=$2, units_id=$3, unit_price=$4 WHERE id=$5", [
    code,
    name,
    units_id,
    unit_price,
    id,
  ]);
  return { ok: true };
}

export async function deleteProduct(id, { force = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    if (force) {
      const invLines = await client.query(
        "SELECT distinct invoice_id FROM invoice_line_item WHERE product_id=$1",
        [id],
      );
      const invIds = invLines.rows.map((i) => i.invoice_id);

      if (invIds.length > 0) {
        await client.query("DELETE FROM invoice WHERE id = ANY($1::int[])", [invIds]);
      }
    }

    await client.query("DELETE FROM product WHERE id=$1", [id]);
    await client.query("commit");
    return { ok: true };
  } catch (err) {
    await client.query("rollback");
    if (err?.code === "23503") {
      const e = new Error("Cannot delete product because it is used in invoices.");
      e.statusCode = 400;
      throw e;
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function listUnits() {
  const { rows } = await pool.query("SELECT id, code, name FROM units ORDER BY name");
  return { data: rows };
}

export async function getProductById(id) {
  const { rows } = await pool.query(
    `
      SELECT p.id, p.code, p.name, p.unit_price, u.code as units_code, p.units_id
      FROM product p
      JOIN units u ON u.id = p.units_id
      WHERE p.id = $1
    `,
    [id],
  );
  return rows[0] ?? null;
}

