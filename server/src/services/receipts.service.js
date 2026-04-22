import { pool } from "../db/pool.js";

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/* ===================== list ===================== */

export async function listReceipts({
  search = "",
  page = 1,
  limit = 10,
  sortBy = "receipt_date",
  sortDir = "desc",
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  const allowedSort = ["receipt_no", "receipt_date", "customer_name", "total_received"];
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

/* ===================== resolve helpers ===================== */

async function resolveReceiptId(client, receipt_no) {
  const r = await client.query("SELECT id FROM receipt WHERE receipt_no = $1", [receipt_no]);
  return r.rowCount > 0 ? r.rows[0].id : null;
}

async function resolveCustomerId(client, customer_code) {
  const r = await client.query("SELECT id FROM customer WHERE code = $1", [String(customer_code).trim()]);
  if (r.rowCount === 0) throw new Error(`Customer not found: ${customer_code}`);
  return r.rows[0].id;
}

async function resolveInvoiceId(client, invoice_no) {
  const r = await client.query("SELECT id FROM invoice WHERE invoice_no = $1", [String(invoice_no).trim()]);
  if (r.rowCount === 0) throw new Error(`Invoice not found: ${invoice_no}`);
  return r.rows[0].id;
}

/* ===================== get ===================== */

export async function getReceipt(idOrReceiptNo) {
  let id = idOrReceiptNo;
  if (typeof idOrReceiptNo === "string" && String(idOrReceiptNo).trim() !== "" && isNaN(Number(idOrReceiptNo))) {
    id = await resolveReceiptId(pool, String(idOrReceiptNo).trim());
    if (id == null) return null;
  } else {
    id = Number(idOrReceiptNo);
  }

  const header = await pool.query(
    `
      SELECT r.id, r.receipt_no, r.receipt_date, r.payment_method, r.payment_notes,
             r.total_received,
             c.code AS customer_code, c.name AS customer_name,
             c.address_line1, c.address_line2,
             co.name AS country_name
      FROM receipt r
      JOIN customer c ON c.id = r.customer_id
      LEFT JOIN country co ON co.id = c.country_id
      WHERE r.id = $1
    `,
    [id],
  );

  if (header.rowCount === 0) return null;

  // Line items — per invoice: amount_already_received EXCLUDES the current receipt.
  // This is the key logic that prevents the "common bug" described in the lab.
  const lines = await pool.query(
    `
      SELECT rli.id,
             i.invoice_no,
             i.amount_due,
             rli.amount_received_here,
             COALESCE(
               (SELECT SUM(x.amount_received_here)
                FROM receipt_line_item x
                WHERE x.invoice_id = rli.invoice_id
                  AND x.receipt_id <> $1),
               0
             ) AS amount_already_received
      FROM receipt_line_item rli
      JOIN invoice i ON i.id = rli.invoice_id
      WHERE rli.receipt_id = $1
      ORDER BY rli.id
    `,
    [id],
  );

  const line_items = lines.rows.map((r) => {
    const amount_due = Number(r.amount_due);
    const already = Number(r.amount_already_received);
    const here = Number(r.amount_received_here);
    const amount_remaining = round2(amount_due - already);
    const amount_still_remaining = round2(amount_remaining - here);
    return {
      id: r.id,
      invoice_no: r.invoice_no,
      amount_due,
      amount_already_received: round2(already),
      amount_remaining,
      amount_received_here: round2(here),
      amount_still_remaining,
    };
  });

  return { header: header.rows[0], line_items };
}

/* ===================== LoV: unpaid invoices for a customer ===================== */

/**
 * List invoices of `customer_code` that still have remaining balance.
 * When `exclude_receipt_id` is provided, that receipt's contributions are
 * subtracted from amount_received so editing a receipt can still see the
 * invoices it already touches (otherwise they'd appear fully paid).
 */
export async function listUnpaidInvoicesForCustomer(customer_code, { exclude_receipt_id } = {}) {
  const code = String(customer_code || "").trim();
  if (!code) return { data: [] };

  const cust = await pool.query("SELECT id FROM customer WHERE code = $1", [code]);
  if (cust.rowCount === 0) return { data: [] };
  const customer_id = cust.rows[0].id;

  const excludeId = exclude_receipt_id != null && exclude_receipt_id !== "" ? Number(exclude_receipt_id) : null;

  const { rows } = await pool.query(
    `
      SELECT i.id AS invoice_id,
             i.invoice_no,
             i.invoice_date,
             i.amount_due,
             COALESCE(SUM(CASE WHEN $2::bigint IS NULL OR rli.receipt_id <> $2 THEN rli.amount_received_here ELSE 0 END), 0) AS amount_received,
             i.amount_due - COALESCE(SUM(CASE WHEN $2::bigint IS NULL OR rli.receipt_id <> $2 THEN rli.amount_received_here ELSE 0 END), 0) AS amount_remain
      FROM invoice i
      LEFT JOIN receipt_line_item rli ON rli.invoice_id = i.id
      WHERE i.customer_id = $1
      GROUP BY i.id
      HAVING i.amount_due - COALESCE(SUM(CASE WHEN $2::bigint IS NULL OR rli.receipt_id <> $2 THEN rli.amount_received_here ELSE 0 END), 0) > 0
      ORDER BY i.invoice_date DESC, i.id DESC
    `,
    [customer_id, excludeId],
  );

  return {
    data: rows.map((r) => ({
      invoice_no: r.invoice_no,
      invoice_date: r.invoice_date,
      amount_due: Number(r.amount_due),
      amount_received: round2(Number(r.amount_received)),
      amount_remain: round2(Number(r.amount_remain)),
    })),
  };
}

/* ===================== create ===================== */

function formatAutoReceiptNo(nextId, receiptDateStr) {
  const d = new Date(receiptDateStr);
  const yy = String(d.getFullYear()).slice(-2);
  return `RCT${yy}-${String(nextId).padStart(5, "0")}`;
}

export async function createReceipt({
  receipt_no,
  receipt_date,
  customer_code,
  payment_method,
  payment_notes,
  line_items,
}) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const customer_id = await resolveCustomerId(client, customer_code);

    // Resolve each invoice_no → id
    const enriched = [];
    for (const li of line_items) {
      const invoice_id = await resolveInvoiceId(client, li.invoice_no);
      const amount = round2(Number(li.amount_received_here || 0));
      if (amount < 0) throw new Error("amount_received_here must be non-negative");
      enriched.push({ invoice_id, amount_received_here: amount });
    }

    const total_received = round2(enriched.reduce((s, x) => s + x.amount_received_here, 0));

    // Auto-generate receipt_no if missing
    let resolvedReceiptNo = receipt_no;
    if (!resolvedReceiptNo || String(resolvedReceiptNo).trim() === "") {
      const maxRes = await client.query("SELECT MAX(id) AS m FROM receipt");
      const nextId = Number(maxRes.rows[0].m || 0) + 1;
      resolvedReceiptNo = formatAutoReceiptNo(nextId, receipt_date);
    }

    const ins = await client.query(
      `
        INSERT INTO receipt (id, created_at, receipt_no, receipt_date, customer_id,
                             payment_method, payment_notes, total_received)
        VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM receipt), now(), $1, $2, $3, $4, $5, $6)
        RETURNING id, receipt_no
      `,
      [resolvedReceiptNo, receipt_date, customer_id, payment_method, payment_notes ?? null, total_received],
    );
    const receipt_id = ins.rows[0].id;

    for (const li of enriched) {
      await client.query(
        `
          INSERT INTO receipt_line_item (id, created_at, receipt_id, invoice_id, amount_received_here)
          VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM receipt_line_item), now(), $1, $2, $3)
        `,
        [receipt_id, li.invoice_id, li.amount_received_here],
      );
    }

    await client.query("commit");
    return { receipt_no: ins.rows[0].receipt_no };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/* ===================== update ===================== */

export async function updateReceipt(
  idOrReceiptNo,
  { receipt_no, receipt_date, customer_code, payment_method, payment_notes, line_items },
) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    let id = idOrReceiptNo;
    if (typeof idOrReceiptNo === "string" && String(idOrReceiptNo).trim() !== "" && isNaN(Number(idOrReceiptNo))) {
      id = await resolveReceiptId(client, String(idOrReceiptNo).trim());
      if (id == null) throw new Error(`Receipt not found: ${idOrReceiptNo}`);
    } else {
      id = Number(idOrReceiptNo);
    }

    const customer_id = await resolveCustomerId(client, customer_code);

    const enriched = [];
    for (const li of line_items) {
      const invoice_id = await resolveInvoiceId(client, li.invoice_no);
      const amount = round2(Number(li.amount_received_here || 0));
      if (amount < 0) throw new Error("amount_received_here must be non-negative");
      enriched.push({
        id: li.id != null && Number(li.id) > 0 ? Number(li.id) : null,
        invoice_id,
        amount_received_here: amount,
      });
    }

    const total_received = round2(enriched.reduce((s, x) => s + x.amount_received_here, 0));

    // Keep existing receipt_no if caller omitted
    let resolvedReceiptNo = (receipt_no != null && String(receipt_no).trim() !== "")
      ? String(receipt_no).trim()
      : null;
    if (resolvedReceiptNo === null) {
      const cur = await client.query("SELECT receipt_no FROM receipt WHERE id = $1", [id]);
      if (cur.rowCount > 0) resolvedReceiptNo = cur.rows[0].receipt_no;
    }

    await client.query(
      `
        UPDATE receipt
        SET receipt_no = $1, receipt_date = $2, customer_id = $3,
            payment_method = $4, payment_notes = $5, total_received = $6
        WHERE id = $7
      `,
      [resolvedReceiptNo, receipt_date, customer_id, payment_method, payment_notes ?? null, total_received, id],
    );

    // Upsert lines: delete any existing line whose id is NOT in kept list
    const keptIds = enriched.filter((li) => li.id != null).map((li) => li.id);
    if (keptIds.length > 0) {
      await client.query(
        "DELETE FROM receipt_line_item WHERE receipt_id = $1 AND id != ALL($2::bigint[])",
        [id, keptIds],
      );
    } else {
      await client.query("DELETE FROM receipt_line_item WHERE receipt_id = $1", [id]);
    }

    for (const li of enriched) {
      if (li.id) {
        await client.query(
          `
            UPDATE receipt_line_item
            SET invoice_id = $1, amount_received_here = $2
            WHERE id = $3 AND receipt_id = $4
          `,
          [li.invoice_id, li.amount_received_here, li.id, id],
        );
      } else {
        await client.query(
          `
            INSERT INTO receipt_line_item (id, created_at, receipt_id, invoice_id, amount_received_here)
            VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM receipt_line_item), now(), $1, $2, $3)
          `,
          [id, li.invoice_id, li.amount_received_here],
        );
      }
    }

    await client.query("commit");
    const out = await pool.query("SELECT receipt_no FROM receipt WHERE id = $1", [id]);
    return { receipt_no: out.rows[0]?.receipt_no };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/* ===================== delete ===================== */

export async function deleteReceipt(idOrReceiptNo) {
  let id = idOrReceiptNo;
  if (typeof idOrReceiptNo === "string" && String(idOrReceiptNo).trim() !== "" && isNaN(Number(idOrReceiptNo))) {
    id = await resolveReceiptId(pool, String(idOrReceiptNo).trim());
    if (id == null) return null;
  } else {
    id = Number(idOrReceiptNo);
  }
  await pool.query("DELETE FROM receipt WHERE id = $1", [id]);
  return { ok: true };
}
