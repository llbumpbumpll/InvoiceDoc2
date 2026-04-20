# Lab 10 — Invoice Lab 4: Receipt Transactions and Reports

> Add a Receipt module (partial payment tracking), an Invoice LoV that filters to unpaid invoices, and two reports.

> Each step shows the file path and near-complete code. (`____________` = fill in yourself; `-- comment` hints tell you what to write)

---

## Overview — What you will build in this lab

| # | Task | Key files |
|---|------|-----------|
| 1 | Database delta script | `database/sql/005_invoice_lab4_delta.sql` |
| 2 | Server: Receipt CRUD API | `server/src/services/receipts.service.js` + controller + routes |
| 3 | Server: Receipt Reports API | `server/src/services/receiptReports.service.js` + controller + routes |
| 4 | Mount new routes in app.js | `server/src/app.js` |
| 5 | Client: Receipts API file | `client/src/api/receipts.api.js` |
| 6 | Client: Receipt pages | `ReceiptList.jsx` + `ReceiptPage.jsx` + `InvoicePickerModal.jsx` |
| 7 | Client: Receipt Reports page | `client/src/pages/reports/ReceiptReports.jsx` |
| 8 | Wire up routes + nav | `client/src/main.jsx` |

---

## Step 1 — Database: Delta Script

> This lab uses **incremental migration** — never DROP existing tables. Only use `CREATE TABLE IF NOT EXISTS`.

**New file:** `database/sql/005_invoice_lab4_delta.sql`

```sql
-- FILE: database/sql/005_invoice_lab4_delta.sql
\set ON_ERROR_STOP on
```

### 1.1 Receipt header table

```sql
CREATE TABLE IF NOT EXISTS receipt (
  id               bigint primary key,
  created_at       timestamptz not null default now(),
  receipt_no       text unique not null,
  receipt_date     ____________ not null,                              -- date
  customer_id      bigint not null references ____________(id),       -- customer
  payment_method   text not null default 'cash',  -- cash | bank transfer | check
  payment_notes    text,
  total_received   numeric(14,2) not null default 0.00
);
```

### 1.2 Receipt line item table

```sql
CREATE TABLE IF NOT EXISTS receipt_line_item (
  id               bigint primary key,
  created_at       timestamptz not null default now(),
  receipt_id       bigint not null references ____________(id) on delete cascade,   -- receipt
  invoice_id       bigint not null references ____________(id),                     -- invoice
  amount_received  numeric(14,2) not null default 0.00
);
```

> **Note:** `on delete cascade` on `receipt_id` means line items are deleted automatically when the receipt is deleted.

### 1.3 View: invoice_received_view

> This view shows how much each invoice has received and how much remains.
> Must use `LEFT JOIN` so invoices that have never been paid still appear (INNER JOIN would hide them).

```sql
CREATE OR REPLACE VIEW invoice_received_view AS
SELECT
  c.id                                                          AS customer_id,
  i.id                                                          AS invoice_id,
  i.____________,                                               -- invoice_no
  i.____________,                                               -- amount_due
  COALESCE(SUM(rli.____________), 0)                            AS amount_received,   -- amount_received (field in receipt_line_item)
  i.amount_due - COALESCE(SUM(rli.____________), 0)             AS amount_remain       -- amount_received (field in receipt_line_item)
FROM invoice i
JOIN customer c ON c.id = i.____________                            -- customer_id
LEFT JOIN receipt_line_item rli ON rli.____________ = i.____________ -- invoice_id, id
GROUP BY c.id, i.id, i.invoice_no, i.amount_due;
```

### Run and verify

**macOS / Linux:**
```bash
cat database/sql/005_invoice_lab4_delta.sql | docker exec -i pgdatabase psql -U root -d invoices_db
```

**Windows (PowerShell):**
```powershell
Get-Content database\sql\005_invoice_lab4_delta.sql | docker exec -i pgdatabase psql -U root -d invoices_db
```

**Windows (CMD):**
```cmd
type database\sql\005_invoice_lab4_delta.sql | docker exec -i pgdatabase psql -U root -d invoices_db
```

Open Adminer [http://localhost:8080](http://localhost:8080) and verify:
- Tables `receipt` and `receipt_line_item` exist
- View `invoice_received_view` exists — run `SELECT * FROM invoice_received_view LIMIT 5;` to check

---

## Step 2 — Server: Receipt CRUD API (3 files)

### 2.1 Service

**New file:** `server/src/services/receipts.service.js`

```js
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
      JOIN customer c ON c.id = r.____________          -- customer_id
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
      JOIN customer c ON c.id = r.____________          -- customer_id
      LEFT JOIN country co ON co.id = c.____________    -- country_id
      WHERE r.receipt_no = $1
    `,
    [receiptNo],
  );

  if (headerResult.rowCount === 0) return null;

  const header = headerResult.rows[0];
  const receiptId = header.receipt_id;

  // ⚠️ CRITICAL: amount_already_received must EXCLUDE the current receipt's own payments
  // so the "Already Received" column shows amounts from OTHER receipts only.
  const linesResult = await pool.query(
    `
      SELECT
        rli.id,
        i.invoice_no,
        i.amount_due,
        rli.amount_received,
        COALESCE((
          SELECT SUM(rli2.____________)              -- amount_received
          FROM receipt_line_item rli2
          WHERE rli2.____________ = rli.____________ -- invoice_id = invoice_id
            AND rli2.____________ != $2             -- receipt_id != receiptId (exclude self)
        ), 0) AS amount_already_received,
        i.amount_due - COALESCE((
          SELECT SUM(rli2.____________)              -- amount_received
          FROM receipt_line_item rli2
          WHERE rli2.____________ = rli.____________ -- invoice_id = invoice_id
            AND rli2.____________ != $2             -- receipt_id != receiptId
        ), 0) AS amount_remain_before_this
      FROM receipt_line_item rli
      JOIN invoice i ON i.id = rli.____________     -- invoice_id
      WHERE rli.____________ = $1                   -- receipt_id = receiptId
      ORDER BY rli.id
    `,
    [receiptId, receiptId],
  );

  const { receipt_id, ...headerOut } = header;
  return { header: headerOut, line_items: linesResult.rows };
}

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

    const enrichedLines = [];
    for (const li of line_items) {
      const inv = await client.query("SELECT id FROM invoice WHERE invoice_no = $1", [li.____________]);  // invoice_no
      if (inv.rowCount === 0) throw new Error(`Invoice not found: ${li.____________}`);  // invoice_no
      enrichedLines.push({ invoice_id: inv.rows[0].id, amount_received: Number(li.____________) });  // amount_received
    }

    const total_received = enrichedLines.reduce((s, x) => s + x.____________, 0);  // amount_received

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
        [receipt_id, li.____________, li.____________],  // invoice_id, amount_received
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

    const cur = await client.query("SELECT ____________ FROM receipt WHERE receipt_no = $1", [____________]);  // id, receiptNo
    if (cur.____________ === 0) throw new Error(`Receipt not found: ${receiptNo}`);  // rowCount
    const receipt_id = cur.rows[0].____________;  // id

    const code = customer_code != null ? String(customer_code).trim() : "";
    const cust = await client.query("SELECT id FROM customer WHERE code = $1", [code]);
    if (cust.rowCount === 0) throw new Error(`Customer not found: ${code}`);
    const customer_id = cust.rows[0].id;

    const enrichedLines = [];
    for (const li of line_items) {
      const inv = await client.query("SELECT id FROM invoice WHERE invoice_no = $1", [li.____________]);  // invoice_no
      if (inv.rowCount === 0) throw new Error(`Invoice not found: ${li.____________}`);  // invoice_no
      enrichedLines.push({ invoice_id: inv.rows[0].id, amount_received: Number(li.____________) });  // amount_received
    }

    const total_received = enrichedLines.reduce((s, x) => s + x.____________, 0);  // amount_received

    await client.query(
      `
        UPDATE receipt
        SET receipt_date=$1, customer_id=$2, payment_method=$3, payment_notes=$4, total_received=$5
        WHERE id=$6
      `,
      [receipt_date, customer_id, payment_method || "cash", payment_notes || null, total_received, receipt_id],
    );

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
        [receipt_id, li.____________, li.____________],  // invoice_id, amount_received
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
  const result = await pool.query("DELETE FROM receipt WHERE receipt_no=$1 RETURNING id", [____________]);  // receiptNo
  if (result.rowCount === 0) return null;
  return { ok: true };
}

export async function listUnpaidInvoicesByCustomer(customerCode, excludeReceiptNo = null) {
  const code = customerCode != null ? String(customerCode).trim() : "";
  if (!code) return [];

  const custResult = await pool.query("SELECT id FROM customer WHERE code=$1", [code]);
  if (custResult.rowCount === 0) return [];
  const customer_id = custResult.rows[0].id;

  let excludeReceiptId = null;
  if (excludeReceiptNo) {
    const rctResult = await pool.query("SELECT id FROM receipt WHERE receipt_no=$1", [____________]);  // excludeReceiptNo
    if (rctResult.rowCount > 0) excludeReceiptId = rctResult.rows[0].id;
  }

  // Filter to invoices where amount_remain > 0
  // If editing a receipt, exclude that receipt's own payments
  // so its invoice lines still appear in the LoV
  const { rows } = await pool.query(
    `
      SELECT
        i.id AS invoice_id,
        i.invoice_no,
        i.invoice_date,
        i.amount_due,
        COALESCE((
          SELECT SUM(rli.____________)              -- amount_received
          FROM receipt_line_item rli
          WHERE rli.____________ = i.____________   -- invoice_id = id
            AND ($1::bigint IS NULL OR rli.____________ != $1)  -- receipt_id != excludeReceiptId
        ), 0) AS amount_received,
        i.amount_due - COALESCE((
          SELECT SUM(rli.____________)              -- amount_received
          FROM receipt_line_item rli
          WHERE rli.____________ = i.____________   -- invoice_id = id
            AND ($1::bigint IS NULL OR rli.____________ != $1)  -- receipt_id != excludeReceiptId
        ), 0) AS amount_remain
      FROM invoice i
      WHERE i.____________ = $2                    -- customer_id
        AND i.amount_due - COALESCE((
          SELECT SUM(rli.____________)              -- amount_received
          FROM receipt_line_item rli
          WHERE rli.____________ = i.____________   -- invoice_id = id
            AND ($1::bigint IS NULL OR rli.____________ != $1)  -- receipt_id != excludeReceiptId
        ), 0) > 0
      ORDER BY i.invoice_date ASC, i.invoice_no ASC
    `,
    [excludeReceiptId, customer_id],
  );

  return rows;
}
```

---

### 2.2 Controller

**New file:** `server/src/controllers/receipts.controller.js`

```js
import {
  listReceipts,
  ____________,   // getReceipt
  ____________,   // createReceipt
  ____________,   // updateReceipt
  ____________,   // deleteReceipt
  ____________,   // listUnpaidInvoicesByCustomer
} from "../services/receipts.service.js";

export async function handleList(req, res) {
  try {
    const { search = "", page = 1, limit = 10, sortBy, sortDir } = req.query;
    const result = await listReceipts({ search, page, limit, sortBy, sortDir });
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleGet(req, res) {
  try {
    const receipt = await ____________(req.params.____________);   // getReceipt, receiptNo
    if (!receipt) return res.status(404).json({ success: false, error: { message: "Receipt not found" } });
    res.json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleCreate(req, res) {
  try {
    const result = await ____________(req.body);   // createReceipt
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleUpdate(req, res) {
  try {
    const result = await ____________(req.params.____________, req.body);   // updateReceipt, receiptNo
    if (!result) return res.status(404).json({ success: false, error: { message: "Receipt not found" } });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleDelete(req, res) {
  try {
    const result = await ____________(req.params.____________);   // deleteReceipt, receiptNo
    if (!result) return res.status(404).json({ success: false, error: { message: "Receipt not found" } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleListUnpaidInvoices(req, res) {
  try {
    const { customer_code, receipt_no } = req.____________;   // query
    const rows = await ____________(____________, receipt_no || null);   // listUnpaidInvoicesByCustomer, customer_code
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
```

---

### 2.3 Routes

**New file:** `server/src/routes/receipts.routes.js`

```js
import { Router } from "express";
import {
  handleList,
  ____________,   // handleGet
  ____________,   // handleCreate
  ____________,   // handleUpdate
  ____________,   // handleDelete
  ____________,   // handleListUnpaidInvoices
} from "../controllers/receipts.controller.js";

const router = Router();

router.get("/", ____________);                        // handleList
router.get("/unpaid-invoices", ____________);         // handleListUnpaidInvoices — MUST be before /:receiptNo !
router.get("/:____________", ____________);           // receiptNo, handleGet
router.post("/", ____________);                       // handleCreate
router.put("/:____________", ____________);           // receiptNo, handleUpdate
router.delete("/:____________", ____________);        // receiptNo, handleDelete

export default router;
```

> **Important:** `/unpaid-invoices` must be declared **before** `/:receiptNo`. Otherwise Express treats the literal string "unpaid-invoices" as a receiptNo parameter value.

### Test

```
GET    http://localhost:4000/api/receipts
GET    http://localhost:4000/api/receipts/unpaid-invoices?customer_code=C001
POST   http://localhost:4000/api/receipts   body: { "receipt_date": "2026-01-15", "customer_code": "C001", "payment_method": "cash", "line_items": [{ "invoice_no": "INV-001", "amount_received": 500 }] }
GET    http://localhost:4000/api/receipts/RCT26-00001
PUT    http://localhost:4000/api/receipts/RCT26-00001   body: { ... }
DELETE http://localhost:4000/api/receipts/RCT26-00001
```

> ⚠️ **You cannot test the API yet** — complete **Step 4 (Mount routes in app.js) first**, then come back to test here.

---

## Step 3 — Server: Receipt Reports API (3 files)

### 3.1 Service

**New file:** `server/src/services/receiptReports.service.js`

```js
import { pool } from "../db/pool.js";

export async function getReceiptList({ date_from, date_to, customer_code, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (date_from) {
    conditions.push(`r.____________ >= $${idx++}`);   // receipt_date
    params.push(date_from);
  }
  if (date_to) {
    conditions.push(`r.____________ <= $${idx++}`);   // receipt_date
    params.push(date_to);
  }
  if (customer_code && String(customer_code).trim() !== "") {
    conditions.push(`c.____________ = $${idx++}`);    // code
    params.push(String(customer_code).trim());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM receipt r
     JOIN customer c ON c.id = r.____________   -- customer_id
     ${where}`,
    params,
  );
  const total = Number(countResult.rows[0].total);
  const offset = (Number(page) - 1) * Number(limit);

  const { rows } = await pool.query(
    `SELECT r.receipt_no, r.receipt_date, r.payment_method, r.payment_notes, r.total_received,
            c.code AS customer_code, c.name AS customer_name
     FROM receipt r
     JOIN customer c ON c.id = r.____________   -- customer_id
     ${where}
     ORDER BY r.receipt_date DESC, r.receipt_no ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, Number(limit), offset],
  );

  return { data: rows, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
}

export async function getInvoiceReceiptReport({ date_from, date_to, customer_code, page = 1, limit = 50 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (date_from) {
    conditions.push(`i.____________ >= $${idx++}`);   // invoice_date
    params.push(date_from);
  }
  if (date_to) {
    conditions.push(`i.____________ <= $${idx++}`);   // invoice_date
    params.push(date_to);
  }
  if (customer_code && String(customer_code).trim() !== "") {
    conditions.push(`c.____________ = $${idx++}`);    // code
    params.push(String(customer_code).trim());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const cteQuery = `
    WITH invoice_totals AS (
      SELECT
        i.id AS invoice_id,
        COALESCE(SUM(rli.____________), 0) AS total_received_all   -- amount_received
      FROM invoice i
      LEFT JOIN receipt_line_item rli ON rli.____________ = i.____________  -- invoice_id, id
      GROUP BY i.id
    )
  `;

  const countResult = await pool.query(
    `${cteQuery}
     SELECT COUNT(*) AS total
     FROM invoice i
     JOIN customer c ON c.id = i.____________          -- customer_id
     JOIN invoice_totals it ON it.invoice_id = i.id
     LEFT JOIN receipt_line_item rli ON rli.____________ = i.____________  -- invoice_id, id
     LEFT JOIN receipt r ON r.id = rli.____________    -- receipt_id
     ${where}`,
    params,
  );
  const total = Number(countResult.rows[0].total);
  const offset = (Number(page) - 1) * Number(limit);

  const { rows } = await pool.query(
    `${cteQuery}
     SELECT
       i.invoice_no, i.invoice_date,
       c.code AS customer_code, c.name AS customer_name,
       i.amount_due,
       it.total_received_all AS amount_received,
       i.amount_due - it.total_received_all AS amount_remain,
       r.receipt_no, r.receipt_date,
       rli.____________ AS receipt_amount   -- amount_received
     FROM invoice i
     JOIN customer c ON c.id = i.____________          -- customer_id
     JOIN invoice_totals it ON it.invoice_id = i.id
     LEFT JOIN receipt_line_item rli ON rli.____________ = i.____________  -- invoice_id, id
     LEFT JOIN receipt r ON r.id = rli.____________    -- receipt_id
     ${where}
     ORDER BY i.invoice_date DESC, i.invoice_no ASC, r.receipt_date ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, Number(limit), offset],
  );

  return { data: rows, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
}
```

---

### 3.2 Controller

**New file:** `server/src/controllers/receiptReports.controller.js`

```js
import { ____________, ____________ } from "../services/receiptReports.service.js";
  // getReceiptList, getInvoiceReceiptReport

export async function handleReceiptList(req, res) {
  try {
    const { date_from, date_to, customer_code, page = 1, limit = 50 } = req.____________;   // query
    const result = await ____________({ date_from, date_to, customer_code, page, limit });   // getReceiptList
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleInvoiceReceiptReport(req, res) {
  try {
    const { date_from, date_to, customer_code, page = 1, limit = 50 } = req.____________;   // query
    const result = await ____________({ date_from, date_to, customer_code, page, limit });   // getInvoiceReceiptReport
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
```

---

### 3.3 Routes

**New file:** `server/src/routes/receiptReports.routes.js`

```js
import { Router } from "express";
import { ____________, ____________ } from "../controllers/receiptReports.controller.js";
  // handleReceiptList, handleInvoiceReceiptReport

const router = Router();
router.get("/receipt-list", ____________);       // handleReceiptList
router.get("/invoice-receipt", ____________);    // handleInvoiceReceiptReport

export default router;
```

### Test

```
GET http://localhost:4000/api/receipt-reports/receipt-list
GET http://localhost:4000/api/receipt-reports/receipt-list?date_from=2026-01-01&customer_code=C001
GET http://localhost:4000/api/receipt-reports/invoice-receipt
```

> ⚠️ **You cannot test the API yet** — complete **Step 4 (Mount routes in app.js) first**, then come back to test here.

---

## Step 4 — Mount new routes in app.js

**File:** `server/src/app.js`

**Before:**
```js
import salesPersonsRoutes from "./routes/salesPersons.routes.js";
import configurationRoutes from "./routes/configuration.routes.js";
```

**After:**
```js
import salesPersonsRoutes from "./routes/salesPersons.routes.js";
import configurationRoutes from "./routes/configuration.routes.js";
import ____________ from "./routes/receipts.routes.js";          // receiptsRoutes
import ____________ from "./routes/receiptReports.routes.js";    // receiptReportsRoutes
```

**Before:**
```js
app.use("/api/config", configurationRoutes);
app.use("/api/reports", reportsRoutes);
```

**After:**
```js
app.use("/api/config", configurationRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/____________", ____________);     // receipts, receiptsRoutes
app.use("/api/____________", ____________);     // receipt-reports, receiptReportsRoutes
```

> ✅ **Now go back and test the APIs from Step 2 and Step 3** using the URLs listed in the ### Test section of each step.

---

## Step 5 — Client: Receipts API file

**New file:** `client/src/api/receipts.api.js`

```js
import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listReceipts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/receipts${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.____________ || {}) };   // meta
}

export async function getReceipt(receiptNo) {
  const res = unwrap(await http(`/api/receipts/${encodeURIComponent(____________)}`));   // receiptNo
  return res.____________ ?? null;   // data
}

export async function createReceipt(body) {
  const res = unwrap(await http(`/api/receipts`, { method: "POST", body: JSON.stringify(____________) }));   // body
  return res.data;
}

export async function updateReceipt(receiptNo, body) {
  const res = unwrap(
    await http(`/api/receipts/${encodeURIComponent(____________)}`, { method: "PUT", body: JSON.stringify(____________) }),   // receiptNo, body
  );
  return res.data;
}

export async function deleteReceipt(receiptNo) {
  unwrap(await http(`/api/receipts/${encodeURIComponent(____________)}`, { method: "DELETE" }));   // receiptNo
  return { ok: true };
}

export async function listUnpaidInvoices(customerCode, receiptNo = null) {
  const params = new URLSearchParams({ customer_code: ____________ });   // customerCode
  if (receiptNo) params.set("____________", receiptNo);   // receipt_no
  const res = unwrap(await http(`/api/receipts/unpaid-invoices?${params.toString()}`));
  return res.____________ ?? [];   // data
}
```

---

## Step 6 — Client: Receipt Pages (3 new files)

### 6.1 ReceiptList.jsx

> **What this page does:** Shows all receipts with search, sort, pagination, and Delete button.
> Uses the existing `DataList` component (same as InvoiceList) — no need to write a table from scratch.

**New file:** `client/src/pages/receipts/ReceiptList.jsx`

```jsx
import React from "react";
import { toast } from "react-toastify";
import { listReceipts, ____________ } from "../../api/receipts.api.js";   // deleteReceipt
import { formatBaht, formatDate } from "../../utils.js";
import DataList from "../../components/DataList.jsx";
import { ConfirmModal, AlertModal } from "../../components/Modal.jsx";

export default function ReceiptList() {
  // fetchData: DataList calls this callback whenever search/page/sort changes
  const fetchData = React.useCallback((params) => listReceipts(params), []);
  // confirmModal.id stores the receiptNo to delete
  const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, id: null });
  const [alertModal, setAlertModal] = React.useState({ isOpen: false, message: "" });
  // refreshTrigger: increment after successful delete → DataList auto re-fetches
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const closeConfirm = () => setConfirmModal({ isOpen: false, id: null });

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await ____________(confirmModal.____________);   // deleteReceipt, id
      closeConfirm();
      setRefreshTrigger((t) => t + 1);
      toast.success("Receipt deleted.");
    } catch (e) {
      const msg = String(e.message || e);
      toast.error(msg);
      setAlertModal({ isOpen: true, message: "Error: " + msg });
      closeConfirm();
    }
  };

  const columns = [
    { key: "____________", label: "Receipt No" },                                      // receipt_no
    { key: "____________", label: "Date", render: (v) => formatDate(v) },             // receipt_date
    { key: "____________", label: "Customer Code" },                                   // customer_code
    { key: "____________", label: "Customer Name" },                                   // customer_name
    { key: "____________", label: "Payment Method" },                                  // payment_method
    { key: "total_received", label: "Total Received", align: "right",
      render: (v) => <span className="font-bold">{formatBaht(v)}</span> },
  ];

  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={____________}          // confirmDelete
        closeOnConfirm={false}
        title="Delete Receipt"
        message="Are you sure you want to delete this receipt? This will remove all payment records associated with it."
        confirmText="Delete"
      />
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        title="Error"
        message={alertModal.message}
      />
      <DataList
        refreshTrigger={____________}    // refreshTrigger
        title="Receipts"
        fetchData={____________}         // fetchData
        columns={____________}           // columns
        searchPlaceholder="Search receipt no, customer..."
        itemName="receipts"
        basePath="/receipts"
        itemKey="____________"           // receipt_no
        onDelete={____________}          // handleDelete
      />
    </>
  );
}
```

---

### 6.2 InvoicePickerModal.jsx

> **What this page does:** Modal for selecting an invoice inside the receipt form.
> - Shows only invoices with outstanding balance (amount_remain > 0) for the selected customer.
> - `excludeReceiptNo`: when editing a receipt, pass the current receipt number so invoices already in this receipt still appear in the list (otherwise they'd be hidden because they look "paid").

**New file:** `client/src/pages/receipts/InvoicePickerModal.jsx`

```jsx
import React from "react";
import { createPortal } from "react-dom";  // renders modal at document.body, not inside parent element
import { listUnpaidInvoices } from "../../api/receipts.api.js";
import { formatBaht, formatDate } from "../../utils.js";
import { TableLoading } from "../../components/Loading.jsx";

export default function InvoicePickerModal({ isOpen, onClose, onSelect, customerCode, excludeReceiptNo }) {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    // if modal is closed or no customer selected → skip loading
    if (!isOpen || !____________) { setData([]); return; }   // customerCode
    let cancelled = false;  // prevents state update after component unmounts
    setLoading(true);
    setErr("");
    listUnpaidInvoices(____________, excludeReceiptNo || null)   // customerCode
      .then((rows) => { if (!cancelled) setData(rows); })
      .catch((e) => { if (!cancelled) setErr(String(e.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };  // cleanup: cancel async if modal closes before fetch finishes
  }, [isOpen, ____________, excludeReceiptNo]);   // customerCode

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={____________}   // onClose
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
               display: "flex", alignItems: "center", justifyContent: "center",
               zIndex: 10000, padding: 24 }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)",
                 maxWidth: 760, width: "100%", maxHeight: "85vh", overflow: "hidden",
                 display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)",
                      display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Select Invoice</h3>
          <button type="button" className="btn btn-outline" onClick={____________} style={{ padding: "4px 12px" }}>   // onClose
            Close
          </button>
        </div>

        {err && <div className="alert alert-error" style={{ margin: "12px 20px" }}>{err}</div>}

        <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Invoice Date</th>
                  <th className="text-right">Amount Due</th>
                  <th className="text-right">Already Received</th>
                  <th className="text-right">Remaining</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoading colSpan={6} />
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                      {____________ ? "No unpaid invoices for this customer." : "Select a customer first."}   // customerCode
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.____________}>   // invoice_id
                      <td style={{ fontWeight: 500 }}>{row.____________}</td>   // invoice_no
                      <td>{formatDate(row.____________)}</td>                   // invoice_date
                      <td className="text-right">{formatBaht(row.____________)}</td>   // amount_due
                      <td className="text-right">{formatBaht(row.____________)}</td>   // amount_received
                      <td className="text-right font-bold" style={{ color: "var(--primary)" }}>
                        {formatBaht(row.____________)}                          // amount_remain
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          onClick={() => {
                            ____________(row);   // onSelect
                            ____________();      // onClose
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

---

### 6.3 ReceiptPage.jsx

> **What this page does:** Form for create/edit/view a Receipt — one component handles all 3 modes.
>
> | mode | URL | Purpose |
> |------|-----|---------|
> | `create` | `/receipts/new` | Fill in new receipt |
> | `edit` | `/receipts/:receiptNo/edit` | Load existing receipt and modify |
> | `view` | `/receipts/:receiptNo` | Read-only display + Print button |
>
> **Line item columns explained:**
> - **Amount Due** = total invoice amount
> - **Already Received** = paid by *other* receipts (not this one)
> - **Remaining** = Amount Due − Already Received
> - **Amount Received Here** = editable (defaults to full Remaining)
> - **Still Remaining** = Remaining − Amount Received Here

**New file:** `client/src/pages/receipts/ReceiptPage.jsx`

```jsx
import React from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getReceipt, createReceipt, updateReceipt } from "../../api/receipts.api.js";
import { getCustomer } from "../../api/customers.api.js";
import { formatBaht, formatDate } from "../../utils.js";
import CustomerPickerModal from "../../components/CustomerPickerModal.jsx";
import InvoicePickerModal from "./InvoicePickerModal.jsx";
import Loading from "../../components/Loading.jsx";
import { AlertModal } from "../../components/Modal.jsx";

const PAYMENT_METHODS = ["cash", "bank transfer", "check"];

// template for a new empty line item
function emptyLine() {
  return { invoice_no: "", amount_due: 0, amount_already_received: 0, amount_remain: 0, amount_received: 0 };
}

export default function ReceiptPage({ mode: propMode }) {
  const { receiptNo } = useParams();
  // propMode comes from Route (mode="create"/"edit"/"view"); fall back to URL detection
  const mode = propMode || (receiptNo ? "view" : "create");
  const nav = useNavigate();

  // ── Header state ──────────────────────────────────────────
  const [autoNo, setAutoNo] = React.useState(true);           // true = let system generate RCT number
  const [receiptNoInput, setReceiptNoInput] = React.useState("");
  const [receiptDate, setReceiptDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [customerCode, setCustomerCode] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");  // auto-loaded from customerCode
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [paymentNotes, setPaymentNotes] = React.useState("");
  // ── Line items ────────────────────────────────────────────
  const [lines, setLines] = React.useState([emptyLine()]);
  // ── UI state ──────────────────────────────────────────────
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [customerModalOpen, setCustomerModalOpen] = React.useState(false);
  const [customerLoadError, setCustomerLoadError] = React.useState("");
  const [invoicePickerOpen, setInvoicePickerOpen] = React.useState(false);
  const [invoicePickerLineIdx, setInvoicePickerLineIdx] = React.useState(null);  // which row opened the LoV
  const [alertModal, setAlertModal] = React.useState({ isOpen: false, title: "", message: "" });
  // ── View mode data ────────────────────────────────────────
  const [viewData, setViewData] = React.useState(null);

  // auto-load customer name whenever customerCode changes
  React.useEffect(() => {
    const code = String(____________ || "").trim();   // customerCode
    if (!code) { setCustomerName(""); setCustomerLoadError(""); return; }
    let cancelled = false;
    setCustomerLoadError("");
    getCustomer(code)
      .then((data) => { if (!cancelled) setCustomerName(data?.____________ ?? ""); })   // name
      .catch(() => { if (!cancelled) { setCustomerName(""); setCustomerLoadError("Customer not found"); } });
    return () => { cancelled = true; };
  }, [____________]);   // customerCode

  // load existing receipt data for edit/view mode
  React.useEffect(() => {
    if (mode === "create") { setLoading(false); return; }
    setLoading(true);
    getReceipt(____________)   // receiptNo
      .then((data) => {
        if (!data) { setErr("Receipt not found"); setLoading(false); return; }
        setViewData(data);
        if (mode === "edit") {
          // map API response back into form state
          const h = data.____________;   // header
          setReceiptNoInput(h.receipt_no);
          setReceiptDate(h.receipt_date ? new Date(h.receipt_date).toISOString().slice(0, 10) : "");
          setCustomerCode(h.____________ || "");   // customer_code
          setPaymentMethod(h.____________ || "cash");   // payment_method
          setPaymentNotes(h.____________ || "");   // payment_notes
          setLines(
            (data.____________ || []).map((li) => ({   // line_items
              invoice_no: li.____________,   // invoice_no
              amount_due: Number(li.____________ || 0),   // amount_due
              amount_already_received: Number(li.____________ || 0),   // amount_already_received
              // amount_remain_before_this = balance before this receipt paid (excludes itself)
              amount_remain: Number(li.____________ ?? li.amount_remain ?? 0),   // amount_remain_before_this
              amount_received: Number(li.____________ || 0),   // amount_received
            })),
          );
        }
        setLoading(false);
      })
      .catch((e) => { setErr(String(e.message || e)); setLoading(false); });
  }, [receiptNo, mode]);

  // sum all line items → shown in summary card and sent to API
  const totalReceived = lines.reduce((s, l) => s + Number(l.____________ || 0), 0);   // amount_received

  function openInvoicePicker(idx) {
    setInvoicePickerLineIdx(idx);  // remember which row opened the LoV
    setInvoicePickerOpen(true);
  }

  // when invoice is selected from LoV → auto-fill all 5 fields in that row
  function handleInvoiceSelect(row) {
    setLines((prev) => {
      const next = [...prev];
      next[invoicePickerLineIdx] = {
        invoice_no: row.____________,   // invoice_no
        amount_due: Number(row.____________ || 0),   // amount_due
        amount_already_received: Number(row.____________ || 0),   // amount_received (from other receipts)
        amount_remain: Number(row.____________ || 0),   // amount_remain
        // default amount_received = amount_remain (pay full outstanding balance)
        amount_received: Number(row.____________ || 0),   // amount_remain
      };
      return next;
    });
  }

  function handleCustomerChange(code) {
    setCustomerCode(code);
    setLines([emptyLine()]);   // clear lines when customer changes to avoid mixing invoices from different customers
  }

  function updateLine(idx, field, value) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function addLine() { setLines((prev) => [...prev, emptyLine()]); }
  function removeLine(idx) { setLines((prev) => prev.filter((_, i) => i !== idx)); }

  // validates before submit — returns array of error messages (empty = valid)
  function validate() {
    const errs = [];
    if (!receiptDate) errs.push("Receipt Date is required");
    if (!String(____________ || "").trim()) errs.push("Customer is required");   // customerCode
    else if (!customerName) errs.push("Customer must be valid");
    if (lines.length === 0) errs.push("At least one invoice line is required");
    lines.forEach((l, i) => {
      if (!l.invoice_no) errs.push(`Row ${i + 1}: Invoice is required`);
      const amt = Number(l.____________);   // amount_received
      if (isNaN(amt) || amt <= 0) errs.push(`Row ${i + 1}: Amount Received must be a positive number`);
    });
    // check for duplicate invoices in the same receipt
    const nos = lines.map((l) => l.invoice_no).filter(Boolean);
    const dups = nos.filter((n, i) => nos.indexOf(n) !== i);
    if (dups.length > 0) errs.push(`Duplicate invoice(s): ${[...new Set(dups)].join(", ")}`);
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (errors.length > 0) {
      // show all errors in AlertModal as a list
      setAlertModal({
        isOpen: true, title: "Save Failed",
        message: (<ul style={{ margin: 0, paddingLeft: 20 }}>{errors.map((msg, i) => <li key={i}>{msg}</li>)}</ul>),
      });
      return;
    }
    setErr(""); setSubmitting(true);
    try {
      const payload = {
        // if autoNo = true → send "" so service generates the number; otherwise use typed value
        receipt_no: mode === "create" ? (autoNo ? "" : receiptNoInput.trim()) : receiptNoInput.trim(),
        receipt_date: ____________,   // receiptDate
        customer_code: ____________.trim(),   // customerCode
        payment_method: ____________,   // paymentMethod
        payment_notes: ____________ || "",   // paymentNotes
        // send only invoice_no + amount_received; service resolves to invoice_id internally
        line_items: lines.map((l) => ({
          invoice_no: l.____________,   // invoice_no
          amount_received: Number(l.____________),   // amount_received
        })),
      };

      if (mode === "create") {
        const res = await ____________(payload);   // createReceipt
        toast.success("Receipt created.");
        nav(`/receipts/${encodeURIComponent(res.____________)}`);   // receipt_no → redirect to view mode
      } else {
        await ____________(receiptNo, payload);   // updateReceipt
        toast.success("Receipt updated.");
        nav(`/receipts/${encodeURIComponent(____________)}`);   // receiptNo → redirect to view mode
      }
    } catch (e) {
      const msg = String(e.message || e);
      setErr(msg); toast.error(msg);
    } finally { setSubmitting(false); }
  }

  if (loading) return <Loading size="large" />;

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  if (mode === "view" && viewData) {
    const h = viewData.____________;   // header
    const items = viewData.____________ || [];   // line_items

    return (
      <div className="invoice-preview">
        <div className="page-header no-print">
          <h3 className="page-title">Receipt {h.____________}</h3>   {/* receipt_no */}
          <div className="flex gap-4">
            <Link to="/receipts" className="btn btn-outline">← Back</Link>
            <Link to={`/receipts/${encodeURIComponent(____________)}/edit`} className="btn btn-outline">Edit</Link>   {/* receiptNo */}
            <button onClick={() => window.print()} className="btn btn-primary">
              <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print PDF
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between mb-4">
            <div>
              <div className="brand mb-4">InvoiceDoc v2</div>
              <div className="font-bold">Customer</div>
              <div>{h.____________}</div>   {/* customer_name */}
              <div className="text-muted">{h.address_line1 || "-"}</div>
              <div className="text-muted">{h.address_line2 || ""}</div>
              <div className="text-muted">{h.country_name || "-"}</div>
            </div>
            <div className="text-right">
              <h2 className="mb-4">RECEIPT</h2>
              <div><span className="font-bold">Date:</span> {formatDate(h.____________)}</div>   {/* receipt_date */}
              <div><span className="font-bold">Receipt No:</span> {h.____________}</div>   {/* receipt_no */}
              <div><span className="font-bold">Payment Method:</span> {h.____________}</div>   {/* payment_method */}
              {h.payment_notes && <div><span className="font-bold">Notes:</span> {h.____________}</div>}   {/* payment_notes */}
            </div>
          </div>

          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th className="text-right">Amount Due</th>
                  <th className="text-right">Already Received</th>
                  <th className="text-right">Balance Before</th>
                  <th className="text-right">Amount Received Here</th>
                  <th className="text-right">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {items.map((li) => {
                  const balanceAfter = Number(li.____________ ?? li.amount_remain ?? 0) - Number(li.____________ || 0);
                  // amount_remain_before_this, amount_received
                  return (
                    <tr key={li.id}>
                      <td style={{ fontWeight: 500 }}>{li.____________}</td>   {/* invoice_no */}
                      <td className="text-right">{formatBaht(li.____________)}</td>   {/* amount_due */}
                      <td className="text-right">{formatBaht(li.____________)}</td>   {/* amount_already_received */}
                      <td className="text-right">{formatBaht(li.____________ ?? li.amount_remain)}</td>   {/* amount_remain_before_this */}
                      <td className="text-right font-bold">{formatBaht(li.____________)}</td>   {/* amount_received */}
                      <td className="text-right" style={{ color: balanceAfter > 0 ? "#ef4444" : "#22c55e" }}>
                        {formatBaht(balanceAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between">
            <div className="no-print text-muted" style={{ maxWidth: 300, fontSize: "0.8rem" }}>
              Thank you for your payment.
            </div>
            <div style={{ minWidth: 220 }}>
              <div className="flex justify-between mt-4 p-2 bg-body font-bold" style={{ fontSize: "1.1rem" }}>
                <span>Total Received:</span>
                <span>{formatBaht(h.____________)}</span>   {/* total_received */}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CREATE / EDIT MODE ─────────────────────────────────────────────────────
  const isCreate = mode === "create";
  const title = isCreate ? "Create Receipt" : `Edit Receipt ${receiptNo}`;

  return (
    <div>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
      />
      <CustomerPickerModal
        isOpen={____________}   // customerModalOpen
        onClose={() => setCustomerModalOpen(false)}
        initialSearch={____________}   // customerCode
        onSelect={(code) => { handleCustomerChange(String(code)); setCustomerModalOpen(false); }}
      />
      <InvoicePickerModal
        isOpen={____________}   // invoicePickerOpen
        onClose={() => setInvoicePickerOpen(false)}
        onSelect={____________}   // handleInvoiceSelect
        customerCode={____________}   // customerCode
        excludeReceiptNo={mode === "edit" ? receiptNo : null}
      />

      <div className="page-header">
        <h3 className="page-title">{title}</h3>
        <Link to="/receipts" className="btn btn-outline">
          <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </Link>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <form onSubmit={____________}>   {/* handleSubmit */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, marginBottom: 16 }}>
          <div className="card">
            <h4>Receipt Details</h4>
            <div style={{ display: "grid", gap: 12 }}>

              <div className="form-group">
                <label className="form-label">
                  {isCreate && autoNo ? "Receipt No" : <>Receipt No <span className="required-marker">*</span></>}
                </label>
                <div className="flex gap-2">
                  <input
                    className="form-control"
                    disabled={isCreate ? ____________ : true}   // autoNo
                    value={isCreate ? receiptNoInput : (receiptNoInput || receiptNo)}
                    onChange={(e) => setReceiptNoInput(e.target.value)}
                    placeholder="e.g. RCT26-00001"
                  />
                  {isCreate && (
                    <div className="form-inline-option">
                      <input type="checkbox" checked={____________} onChange={(e) => setAutoNo(e.target.checked)} id="rct_auto" />   {/* autoNo */}
                      <label htmlFor="rct_auto">Auto</label>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Date <span className="required-marker">*</span></label>
                <input type="date" className="form-control" value={____________} onChange={(e) => setReceiptDate(e.target.value)} />   {/* receiptDate */}
              </div>

              <div className="form-group">
                <label className="form-label">Customer Code <span className="required-marker">*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="form-control"
                    value={____________}   // customerCode
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    placeholder="e.g. C001"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-primary" onClick={() => setCustomerModalOpen(true)}>LoV</button>
                  {____________ && (   // customerCode
                    <button type="button" onClick={() => handleCustomerChange("")}
                      style={{ padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-body)", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}>
                      ×
                    </button>
                  )}
                </div>
                {customerLoadError && <span style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: 4, display: "block" }}>{customerLoadError}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-control" disabled value={____________} placeholder="—" readOnly />   {/* customerName */}
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method <span className="required-marker">*</span></label>
                <select className="form-control" value={____________} onChange={(e) => setPaymentMethod(e.target.value)}>   {/* paymentMethod */}
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Notes</label>
                <textarea className="form-control" rows={3} value={____________} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional notes..." />   {/* paymentNotes */}
              </div>
            </div>
          </div>

          <div className="card" style={{ height: "fit-content" }}>
            <h4>Summary</h4>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2,
                          display: "flex", justifyContent: "space-between",
                          fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>
              <span>Total Received</span>
              <span>{formatBaht(____________)}</span>   {/* totalReceived */}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.875rem" }}
                disabled={____________ || !customerCode || !customerName}   // submitting
              >
                {submitting ? (isCreate ? "Creating..." : "Saving...") : (isCreate ? "Create Receipt" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>Invoice Line Items</h4>
            <button type="button" className="btn btn-outline" onClick={____________} disabled={!customerCode || !customerName}>   {/* addLine */}
              + Add Row
            </button>
          </div>

          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th className="text-right">Full Amount Due</th>
                  <th className="text-right">Already Received</th>
                  <th className="text-right">Amount Remaining</th>
                  <th className="text-right" style={{ minWidth: 160 }}>Amount Received Here</th>
                  <th className="text-right">Still Remaining</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const stillRemaining = Number(line.____________ || 0) - Number(line.____________ || 0);   // amount_remain, amount_received
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input className="form-control" style={{ width: 140, fontSize: "0.85rem" }}
                            value={line.____________} readOnly placeholder="Select..." />   {/* invoice_no */}
                          <button type="button" className="btn btn-primary"
                            style={{ padding: "4px 10px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                            disabled={!____________ || !____________}   // customerCode, customerName
                            onClick={() => openInvoicePicker(idx)}>
                            LoV
                          </button>
                        </div>
                      </td>
                      <td className="text-right">{formatBaht(line.____________)}</td>   {/* amount_due */}
                      <td className="text-right">{formatBaht(line.____________)}</td>   {/* amount_already_received */}
                      <td className="text-right">{formatBaht(line.____________)}</td>   {/* amount_remain */}
                      <td className="text-right">
                        <input type="number" step="0.01" min="0" className="form-control"
                          style={{ width: 140, textAlign: "right", fontSize: "0.85rem" }}
                          value={line.____________}   // amount_received
                          onChange={(e) => updateLine(idx, "____________", e.target.value)} />   {/* amount_received */}
                      </td>
                      <td className="text-right" style={{ color: stillRemaining > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                        {formatBaht(stillRemaining)}
                      </td>
                      <td>
                        <button type="button" className="btn btn-outline"
                          style={{ fontSize: "0.7rem", padding: "4px 8px", color: "#ef4444", borderColor: "#ef4444" }}
                          onClick={() => removeLine(idx)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                      No lines yet. Click "+ Add Row" to add an invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}
```

---

## Step 7 — Client: Receipt Reports Page

> **What this page does:** Two reports in one file, switched by Tab.
>
> | Tab | Report | Shows |
> |-----|--------|-------|
> | Receipt List | Report 1 | All receipts with total received per receipt |
> | Invoice & Receipt | Report 2 | Each invoice with payment history — one row per receipt |
>
> All filters are optional — leave blank to show everything.

**New file:** `client/src/pages/reports/ReceiptReports.jsx`

```jsx
import React from "react";
import { toast } from "react-toastify";
import { http } from "../../api/http.js";
import { formatBaht, formatDate } from "../../utils.js";
import { TableLoading } from "../../components/Loading.jsx";

// if server returns {success: false, error: ...}, throw instead of returning normally
function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

// strip null/empty values before building query string to avoid sending ?date_from=&customer_code=
async function fetchReceiptList(params) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))).toString();
  const res = unwrap(await http(`/api/receipt-reports/____________${q ? `?${q}` : ""}`));   // receipt-list
  return { data: res.data, ...(res.____________ || {}) };   // meta
}

async function fetchInvoiceReceiptReport(params) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))).toString();
  const res = unwrap(await http(`/api/receipt-reports/____________${q ? `?${q}` : ""}`));   // invoice-receipt
  return { data: res.data, ...(res.____________ || {}) };   // meta
}

// TABS defines tab labels and keys — key must match the conditional render at the bottom
const TABS = [
  { key: "receipt-list", label: "Receipt List" },
  { key: "invoice-receipt", label: "Invoice & Receipt" },
];

// FilterBar: shared filter UI used by both reports
function FilterBar({ filters, onChange, onRun, loading }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Date From</label>
          <input type="date" className="form-control"
            value={filters.____________ || ""}   // date_from
            onChange={(e) => onChange({ ...filters, ____________: e.target.value })} />   // date_from
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Date To</label>
          <input type="date" className="form-control"
            value={filters.____________ || ""}   // date_to
            onChange={(e) => onChange({ ...filters, ____________: e.target.value })} />   // date_to
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Customer Code</label>
          <input type="text" className="form-control" style={{ width: 140 }}
            value={filters.____________ || ""}   // customer_code
            onChange={(e) => onChange({ ...filters, ____________: e.target.value })}   // customer_code
            placeholder="e.g. C001" />
        </div>
        <button type="button" className="btn btn-primary" onClick={____________} disabled={loading}>   // onRun
          {loading ? "Running..." : "Run Report"}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => onChange({})} disabled={loading}>Reset</button>
      </div>
    </div>
  );
}

// Report 1: one row per receipt with Grand Total footer
function ReceiptListReport() {
  const [filters, setFilters] = React.useState({});
  const [data, setData] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [hasRun, setHasRun] = React.useState(false);  // hides table until Run is clicked at least once

  async function run() {
    setLoading(true);
    try {
      const res = await ____________({ ...filters, page: 1, limit: 500 });   // fetchReceiptList
      setData(res.____________ || []);   // data
      setTotal(res.____________ || 0);   // total
      setHasRun(true);
    } catch (e) { toast.error(String(e.message || e)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <FilterBar filters={____________} onChange={setFilters} onRun={____________} loading={loading} />   {/* filters, run */}
      {!hasRun ? (
        <div className="card">
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <h4>Set filters and click "Run Report"</h4>
            <p>All filters are optional — leave blank to show all records.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            <strong>{total}</strong> records
          </div>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Receipt No</th><th>Date</th><th>Customer Code</th><th>Customer Name</th>
                  <th>Payment Method</th><th>Notes</th><th className="text-right">Total Received</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableLoading colSpan={7} /> : data.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No receipts found.</td></tr>
                ) : data.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.____________}</td>   {/* receipt_no */}
                    <td>{formatDate(row.____________)}</td>   {/* receipt_date */}
                    <td>{row.____________}</td>   {/* customer_code */}
                    <td>{row.____________}</td>   {/* customer_name */}
                    <td>{row.____________}</td>   {/* payment_method */}
                    <td>{row.____________ || "-"}</td>   {/* payment_notes */}
                    <td className="text-right font-bold">{formatBaht(row.____________)}</td>   {/* total_received */}
                  </tr>
                ))}
              </tbody>
              {data.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} className="text-right font-bold">Grand Total:</td>
                    <td className="text-right font-bold" style={{ color: "var(--primary)" }}>
                      {formatBaht(data.reduce((s, r) => s + Number(r.____________ || 0), 0))}   {/* total_received */}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Report 2: one row per receipt per invoice — invoices with no receipts appear with NULL receipt fields (shown as "-")
function InvoiceReceiptReport() {
  const [filters, setFilters] = React.useState({});
  const [data, setData] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [hasRun, setHasRun] = React.useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await ____________({ ...filters, page: 1, limit: 500 });   // fetchInvoiceReceiptReport
      setData(res.____________ || []);   // data
      setTotal(res.____________ || 0);   // total
      setHasRun(true);
    } catch (e) { toast.error(String(e.message || e)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <FilterBar filters={____________} onChange={setFilters} onRun={____________} loading={loading} />   {/* filters, run */}
      {!hasRun ? (
        <div className="card">
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <h4>Set filters and click "Run Report"</h4>
            <p>All filters are optional — leave blank to show all records.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            <strong>{total}</strong> records
          </div>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No</th><th>Invoice Date</th><th>Customer Code</th><th>Customer Name</th>
                  <th className="text-right">Amount Due</th><th className="text-right">Total Received</th>
                  <th className="text-right">Remaining</th>
                  <th>Receipt No</th><th>Receipt Date</th><th className="text-right">Receipt Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableLoading colSpan={10} /> : data.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No records found.</td></tr>
                ) : data.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.____________}</td>   {/* invoice_no */}
                    <td>{formatDate(row.____________)}</td>   {/* invoice_date */}
                    <td>{row.____________}</td>   {/* customer_code */}
                    <td>{row.____________}</td>   {/* customer_name */}
                    <td className="text-right">{formatBaht(row.____________)}</td>   {/* amount_due */}
                    <td className="text-right">{formatBaht(row.____________)}</td>   {/* amount_received */}
                    <td className="text-right font-bold"
                      style={{ color: Number(row.____________) > 0 ? "#ef4444" : "#22c55e" }}>   {/* amount_remain */}
                      {formatBaht(row.____________)}   {/* amount_remain */}
                    </td>
                    <td>{row.____________ || "-"}</td>   {/* receipt_no */}
                    <td>{row.____________ ? formatDate(row.____________) : "-"}</td>   {/* receipt_date, receipt_date */}
                    <td className="text-right">{row.____________ != null ? formatBaht(row.____________) : "-"}</td>   {/* receipt_amount, receipt_amount */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceiptReports({ tab: initialTab = "receipt-list" }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  React.useEffect(() => { setActiveTab(____________); }, [initialTab]);   // initialTab

  const tabBtnStyle = (key) => ({
    padding: "8px 20px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    background: activeTab === key ? "var(--primary)" : "white",
    color: activeTab === key ? "white" : "var(--text-main)",
    cursor: "pointer", fontSize: "0.9rem", fontWeight: activeTab === key ? 600 : 400,
  });

  return (
    <div>
      <div className="page-header"><h3 className="page-title">Receipt Reports</h3></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" style={tabBtnStyle(t.____________)} onClick={() => setActiveTab(t.____________)}>   {/* key, key */}
            {t.____________}   {/* label */}
          </button>
        ))}
      </div>
      {activeTab === "____________" && <ReceiptListReport />}       {/* receipt-list */}
      {activeTab === "____________" && <InvoiceReceiptReport />}    {/* invoice-receipt */}
    </div>
  );
}
```

---

## Step 8 — Wire up routes + nav in main.jsx

**File:** `client/src/main.jsx`

**Add imports:**
```jsx
import ____________ from "./pages/receipts/ReceiptList.jsx";       // ReceiptList
import ____________ from "./pages/receipts/ReceiptPage.jsx";       // ReceiptPage
import ____________ from "./pages/reports/ReceiptReports.jsx";     // ReceiptReports
```

**Add NavLink in Sidebar** (after Sales Persons, before Reports):
```jsx
<NavLink to="/receipts" className={getLinkClass}>
  <svg style={{ marginRight: 10 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
  Receipts
</NavLink>
```

**Add sub-links inside the Reports SubMenu** (after Customer Buying):
```jsx
<NavLink to="/reports/receipt-list" className={getSubLinkClass}>
  Receipt List
</NavLink>
<NavLink to="/reports/invoice-receipt" className={getSubLinkClass}>
  Invoice &amp; Receipt
</NavLink>
```

**Add routes** (append after the existing report routes):
```jsx
<Route path="/receipts" element={<Layout><____________ /></Layout>} />                                      {/* ReceiptList */}
<Route path="/receipts/new" element={<Layout><____________ mode="create" /></Layout>} />                    {/* ReceiptPage */}
<Route path="/receipts/:receiptNo/edit" element={<Layout><____________ mode="edit" /></Layout>} />          {/* ReceiptPage — edit must come before view! */}
<Route path="/receipts/:receiptNo" element={<Layout><____________ mode="view" /></Layout>} />               {/* ReceiptPage */}
<Route path="/reports/receipt-list" element={<Layout><____________ tab="receipt-list" /></Layout>} />       {/* ReceiptReports */}
<Route path="/reports/invoice-receipt" element={<Layout><____________ tab="invoice-receipt" /></Layout>} /> {/* ReceiptReports */}
```

---

## Final Testing Checklist

| Test | How | Expected result |
|------|-----|----------------|
| DB tables | Adminer | `receipt` and `receipt_line_item` tables exist |
| DB view | `SELECT * FROM invoice_received_view LIMIT 5` | Shows invoices with amount_received and amount_remain |
| Receipt list | Open `/receipts` from menu | Lists all receipts, shows Create New button |
| Create receipt | Create with 2+ invoice lines | Saved, receipt_no auto-generated (RCT26-xxxxx) |
| LoV filter | Open Invoice LoV after selecting customer | Only shows **unpaid** invoices for that customer |
| Amount default | Pick invoice from LoV | `Amount Received Here` defaults to `Amount Remaining` |
| Amount logic | Set `Amount Received Here` < remaining | `Still Remaining` shows positive (red) |
| Bug test | Create receipt RCT-A for INV-001 (pay 200 of 800 remaining). View RCT-A | `Already Received` shows 0, not 200 (self excluded) |
| Edit receipt | Open existing receipt, edit, save | Correct data, amount_already_received still excludes current receipt |
| Print | Open view mode, click Print PDF | Clean print layout with header + line items |
| Report 1 | `/reports/receipt-list`, click Run | Table of receipts with grand total footer |
| Report 2 | `/reports/invoice-receipt`, click Run | One row per receipt per invoice, invoices with no receipts show "-" for receipt fields |

---

## Common Mistakes

> - Declaring `/unpaid-invoices` route after `/:receiptNo` → "unpaid-invoices" gets matched as a receipt number
> - Forgetting `on delete cascade` on `receipt_line_item.receipt_id` → DELETE receipt fails with FK violation
> - Not excluding the current receipt in `amount_already_received` → shows inflated "Already Received" on view/edit
> - Not clearing line items when customer changes → old invoice lines remain from a different customer
> - Using `INNER JOIN` instead of `LEFT JOIN` in view → invoices with no receipts disappear from LoV
