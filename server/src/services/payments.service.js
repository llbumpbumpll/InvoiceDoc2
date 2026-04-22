import { pool } from "../db/pool.js";

export async function listPayments({ page = 1, limit = 10 } = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await pool.query("SELECT COUNT(*) AS total FROM payment");
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `SELECT id, invoice_id, payment_date, amount, method, note
     FROM payment
     ORDER BY id DESC
     LIMIT $1 OFFSET $2`,
    [Number(limit), offset]
  );

  return {
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
}

export async function createPayment({ invoice_id, payment_date, amount, method, note }) {
  const { rows } = await pool.query(
    `INSERT INTO payment (invoice_id, payment_date, amount, method, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [invoice_id, payment_date, amount, method, note]
  );
  return rows[0];
}

export async function getPayment(id) {
  const { rows } = await pool.query(
    `SELECT id, invoice_id, payment_date, amount, method, note
     FROM payment
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}