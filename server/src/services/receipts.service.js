// FILE: server/src/services/receipts.service.js
// Receipt CRUD: list (search, pagination, sort), get with line items, create/update/delete. Transactions for create/update.
import { pool } from "../db/pool.js";

export async function listReceipts({
  search = "",
  page = 1,
  limit = 10,
  sortBy = "receipt_date",
  sortDir = "desc",
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);
  const allowedSort = ["receipt_no", "receipt_date", "customer_code", "customer_name", "payment_method", "total_received"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "receipt_date";
  const sortDirection = sortDir === "asc" ? "ASC" : "DESC";
  const searchParam = `%${search}%`;

  const countResult = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM receipt r
      JOIN customer c ON c.id = r.customer_id
      WHERE r.receipt_no ILIKE $1 OR c.name ILIKE $1
    `,
    [searchParam],
  );
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `
      SELECT r.receipt_no, r.receipt_date, r.payment_method, r.payment_notes,
             r.total_received,
             c.code AS customer_code, c.name AS customer_name
      FROM receipt r
      JOIN customer c ON c.id = r.customer_id
      WHERE r.receipt_no ILIKE $1 OR c.name ILIKE $1
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST, r.id DESC
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

export async function getReceipt(receiptNo) {
  const headerResult = await pool.query(
    `
      SELECT r.id AS receipt_id, r.receipt_no, r.receipt_date, r.payment_method,
             r.payment_notes, r.total_received,
             c.code AS customer_code, c.name AS customer_name,
             c.address_line1, c.address_line2,
             co.name AS country_name
      FROM receipt r
      JOIN customer c ON c.id = r.customer_id
      LEFT JOIN country co ON co.id = c.country_id
      WHERE r.receipt_no = $1
    `,
    [receiptNo],
  );

  if (headerResult.rowCount === 0) return null;

  const header = headerResult.rows[0];
  const receiptId = header.receipt_id;

  // For each line item: get amount_already_received from OTHER receipts (exclude this one)
  // to correctly show how much was already received before this receipt
  const linesResult = await pool.query(
    `
      SELECT
        rli.id,
        i.invoice_no,
        i.amount_due,
        rli.amount_received,
        COALESCE((
          SELECT SUM(rli2.amount_received)
          FROM receipt_line_item rli2
          WHERE rli2.invoice_id = rli.invoice_id
            AND rli2.receipt_id != $2
        ), 0) AS amount_already_received,
        i.amount_due
          - COALESCE((
              SELECT SUM(rli2.amount_received)
              FROM receipt_line_item rli2
              WHERE rli2.invoice_id = rli.invoice_id
                AND rli2.receipt_id != $2
            ), 0)
          AS amount_remain_before_this
      FROM receipt_line_item rli
      JOIN invoice i ON i.id = rli.invoice_id
      WHERE rli.receipt_id = $1
      ORDER BY rli.id
    `,
    [receiptId, receiptId],
  );

  // Remove internal receipt_id from header before returning
  const { receipt_id, ...headerOut } = header;

  return { header: headerOut, line_items: linesResult.rows };
}

/** Generate next receipt_no in format RCT{YY}-{5-digit seq} */
async function generateReceiptNo(client) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const prefix = `RCT${yy}-`;

  const result = await client.query(
    `SELECT receipt_no FROM receipt WHERE receipt_no LIKE $1 ORDER BY receipt_no DESC LIMIT 1`,
    [`${prefix}%`],
  );

  let nextSeq = 1;
  if (result.rowCount > 0) {
    const lastNo = result.rows[0].receipt_no;
    const parts = lastNo.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
}

export async function createReceipt({
  receipt_no,
  receipt_date,
  customer_code,
  payment_method,
  payment_notes,
  line_items = [],
}) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const code = customer_code != null ? String(customer_code).trim() : "";
    const cust = await client.query("SELECT id FROM customer WHERE code = $1", [code]);
    if (cust.rowCount === 0) throw new Error(`Customer not found: ${code}`);
    const customer_id = cust.rows[0].id;

    let resolvedReceiptNo = receipt_no;
    if (!resolvedReceiptNo || String(resolvedReceiptNo).trim() === "") {
      resolvedReceiptNo = await generateReceiptNo(client);
    }

    // Resolve invoice_no → invoice_id and validate
    const enrichedLines = [];
    for (const li of line_items) {
      const inv = await client.query("SELECT id FROM invoice WHERE invoice_no = $1", [li.invoice_no]);
      if (inv.rowCount === 0) throw new Error(`Invoice not found: ${li.invoice_no}`);
      enrichedLines.push({ invoice_id: inv.rows[0].id, amount_received: Number(li.amount_received) });
    }

    const total_received = enrichedLines.reduce((s, x) => s + x.amount_received, 0);

    const rcpt = await client.query(
      `
        INSERT INTO receipt (id, created_at, receipt_no, receipt_date, customer_id, payment_method, payment_notes, total_received)
        VALUES (
          (SELECT COALESCE(MAX(id),0)+1 FROM receipt),
          NOW(),
          $1,$2,$3,$4,$5,$6
        )
        RETURNING id, receipt_no
      `,
      [resolvedReceiptNo, receipt_date, customer_id, payment_method || "cash", payment_notes || null, total_received],
    );

    const receipt_id = rcpt.rows[0].id;

    for (const li of enrichedLines) {
      await client.query(
        `
          INSERT INTO receipt_line_item (id, created_at, receipt_id, invoice_id, amount_received)
          VALUES (
            (SELECT COALESCE(MAX(id),0)+1 FROM receipt_line_item),
            NOW(),
            $1,$2,$3
          )
        `,
        [receipt_id, li.invoice_id, li.amount_received],
      );
    }

    await client.query("commit");
    return { receipt_no: rcpt.rows[0].receipt_no };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateReceipt(
  receiptNo,
  { receipt_date, customer_code, payment_method, payment_notes, line_items = [] },
) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    // Get current receipt
    const cur = await client.query("SELECT id FROM receipt WHERE receipt_no = $1", [receiptNo]);
    if (cur.rowCount === 0) throw new Error(`Receipt not found: ${receiptNo}`);
    const receipt_id = cur.rows[0].id;

    const code = customer_code != null ? String(customer_code).trim() : "";
    const cust = await client.query("SELECT id FROM customer WHERE code = $1", [code]);
    if (cust.rowCount === 0) throw new Error(`Customer not found: ${code}`);
    const customer_id = cust.rows[0].id;

    // Resolve invoice_no → invoice_id
    const enrichedLines = [];
    for (const li of line_items) {
      const inv = await client.query("SELECT id FROM invoice WHERE invoice_no = $1", [li.invoice_no]);
      if (inv.rowCount === 0) throw new Error(`Invoice not found: ${li.invoice_no}`);
      enrichedLines.push({ invoice_id: inv.rows[0].id, amount_received: Number(li.amount_received) });
    }

    const total_received = enrichedLines.reduce((s, x) => s + x.amount_received, 0);

    await client.query(
      `
        UPDATE receipt
        SET receipt_date=$1, customer_id=$2, payment_method=$3, payment_notes=$4, total_received=$5
        WHERE id=$6
      `,
      [receipt_date, customer_id, payment_method || "cash", payment_notes || null, total_received, receipt_id],
    );

    // Replace all line items
    await client.query("DELETE FROM receipt_line_item WHERE receipt_id=$1", [receipt_id]);

    for (const li of enrichedLines) {
      await client.query(
        `
          INSERT INTO receipt_line_item (id, created_at, receipt_id, invoice_id, amount_received)
          VALUES (
            (SELECT COALESCE(MAX(id),0)+1 FROM receipt_line_item),
            NOW(),
            $1,$2,$3
          )
        `,
        [receipt_id, li.invoice_id, li.amount_received],
      );
    }

    await client.query("commit");
    return { receipt_no: receiptNo };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteReceipt(receiptNo) {
  const result = await pool.query("DELETE FROM receipt WHERE receipt_no=$1 RETURNING id", [receiptNo]);
  if (result.rowCount === 0) return null;
  return { ok: true };
}

/**
 * List invoices with outstanding balance for a customer.
 * When editing a receipt (excludeReceiptNo provided), include that receipt's invoices too
 * (since their balance shown should exclude this receipt's payments).
 */
export async function listUnpaidInvoicesByCustomer(customerCode, excludeReceiptNo = null) {
  const code = customerCode != null ? String(customerCode).trim() : "";
  if (!code) return [];

  const custResult = await pool.query("SELECT id FROM customer WHERE code=$1", [code]);
  if (custResult.rowCount === 0) return [];
  const customer_id = custResult.rows[0].id;

  let excludeReceiptId = null;
  if (excludeReceiptNo) {
    const rctResult = await pool.query("SELECT id FROM receipt WHERE receipt_no=$1", [excludeReceiptNo]);
    if (rctResult.rowCount > 0) excludeReceiptId = rctResult.rows[0].id;
  }

  // amount_received excludes the current receipt being edited (if any)
  const { rows } = await pool.query(
    `
      SELECT
        i.id AS invoice_id,
        i.invoice_no,
        i.invoice_date,
        i.amount_due,
        COALESCE((
          SELECT SUM(rli.amount_received)
          FROM receipt_line_item rli
          WHERE rli.invoice_id = i.id
            AND ($1::bigint IS NULL OR rli.receipt_id != $1)
        ), 0) AS amount_received,
        i.amount_due - COALESCE((
          SELECT SUM(rli.amount_received)
          FROM receipt_line_item rli
          WHERE rli.invoice_id = i.id
            AND ($1::bigint IS NULL OR rli.receipt_id != $1)
        ), 0) AS amount_remain
      FROM invoice i
      WHERE i.customer_id = $2
        AND i.amount_due - COALESCE((
          SELECT SUM(rli.amount_received)
          FROM receipt_line_item rli
          WHERE rli.invoice_id = i.id
            AND ($1::bigint IS NULL OR rli.receipt_id != $1)
        ), 0) > 0
      ORDER BY i.invoice_date ASC, i.invoice_no ASC
    `,
    [excludeReceiptId, customer_id],
  );

  return rows;
}
