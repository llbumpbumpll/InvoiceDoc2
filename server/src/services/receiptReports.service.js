// FILE: server/src/services/receiptReports.service.js
// Receipt report queries: receipt list and invoice-receipt cross report.
import { pool } from "../db/pool.js";

/**
 * Report 1: Receipt List
 * Filters: date_from, date_to, customer_code (all optional)
 * Output: receipt_no, receipt_date, customer_code, customer_name, payment_method, payment_notes, total_received
 */
export async function getReceiptList({ date_from, date_to, customer_code, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (date_from) {
    conditions.push(`r.receipt_date >= $${idx++}`);
    params.push(date_from);
  }
  if (date_to) {
    conditions.push(`r.receipt_date <= $${idx++}`);
    params.push(date_to);
  }
  if (customer_code && String(customer_code).trim() !== "") {
    conditions.push(`c.code = $${idx++}`);
    params.push(String(customer_code).trim());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM receipt r
     JOIN customer c ON c.id = r.customer_id
     ${where}`,
    params,
  );
  const total = Number(countResult.rows[0].total);

  const offset = (Number(page) - 1) * Number(limit);

  const { rows } = await pool.query(
    `SELECT r.receipt_no, r.receipt_date, r.payment_method, r.payment_notes, r.total_received,
            c.code AS customer_code, c.name AS customer_name
     FROM receipt r
     JOIN customer c ON c.id = r.customer_id
     ${where}
     ORDER BY r.receipt_date DESC, r.receipt_no ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, Number(limit), offset],
  );

  return {
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
}

/**
 * Report 2: Invoice & Receipt cross report
 * One row per receipt line item (invoices with no receipts appear once with null receipt fields).
 * Filters: date_from, date_to, customer_code (all optional, based on invoice_date)
 * Output: invoice_no, invoice_date, customer_code, customer_name, amount_due,
 *         amount_received (total), amount_remain, receipt_no, receipt_date, receipt_amount
 */
export async function getInvoiceReceiptReport({ date_from, date_to, customer_code, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (date_from) {
    conditions.push(`i.invoice_date >= $${idx++}`);
    params.push(date_from);
  }
  if (date_to) {
    conditions.push(`i.invoice_date <= $${idx++}`);
    params.push(date_to);
  }
  if (customer_code && String(customer_code).trim() !== "") {
    conditions.push(`c.code = $${idx++}`);
    params.push(String(customer_code).trim());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // CTE to get total received per invoice (all receipts)
  const cteQuery = `
    WITH invoice_totals AS (
      SELECT
        i.id AS invoice_id,
        COALESCE(SUM(rli.amount_received), 0) AS total_received_all
      FROM invoice i
      LEFT JOIN receipt_line_item rli ON rli.invoice_id = i.id
      GROUP BY i.id
    )
  `;

  const countResult = await pool.query(
    `${cteQuery}
     SELECT COUNT(*) AS total
     FROM invoice i
     JOIN customer c ON c.id = i.customer_id
     JOIN invoice_totals it ON it.invoice_id = i.id
     LEFT JOIN receipt_line_item rli ON rli.invoice_id = i.id
     LEFT JOIN receipt r ON r.id = rli.receipt_id
     ${where}`,
    params,
  );
  const total = Number(countResult.rows[0].total);

  const offset = (Number(page) - 1) * Number(limit);

  const { rows } = await pool.query(
    `${cteQuery}
     SELECT
       i.invoice_no,
       i.invoice_date,
       c.code AS customer_code,
       c.name AS customer_name,
       i.amount_due,
       it.total_received_all AS amount_received,
       i.amount_due - it.total_received_all AS amount_remain,
       r.receipt_no,
       r.receipt_date,
       rli.amount_received AS receipt_amount
     FROM invoice i
     JOIN customer c ON c.id = i.customer_id
     JOIN invoice_totals it ON it.invoice_id = i.id
     LEFT JOIN receipt_line_item rli ON rli.invoice_id = i.id
     LEFT JOIN receipt r ON r.id = rli.receipt_id
     ${where}
     ORDER BY i.invoice_date DESC, i.invoice_no ASC, r.receipt_date ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, Number(limit), offset],
  );

  return {
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
}
