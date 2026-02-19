// Invoice CRUD: list (search, pagination, sort), get with line items, create/update/delete. Transactions for create/update.
import { pool } from "../db/pool.js";

export async function listInvoices({
  search = "",
  page = 1,
  limit = 10,
  sortBy = "invoice_date",
  sortDir = "desc",
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  const allowedSort = ["invoice_no", "customer_name", "invoice_date", "amount_due"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "invoice_date";
  const sortDirection = sortDir === "asc" ? "ASC" : "DESC";

  const searchParam = `%${search}%`;

  const countResult = await pool.query(
    `
      SELECT COUNT(*) as total
      FROM invoice i
      JOIN customer c ON c.id = i.customer_id
      WHERE i.invoice_no ILIKE $1 OR c.name ILIKE $1
    `,
    [searchParam],
  );
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `
      SELECT i.id, i.invoice_no, i.invoice_date, i.amount_due,
             c.name as customer_name
      FROM invoice i
      JOIN customer c ON c.id = i.customer_id
      WHERE i.invoice_no ILIKE $1 OR c.name ILIKE $1
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST, i.id DESC
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

export async function getInvoice(id) {
  const header = await pool.query(
    `
      select i.*, c.code as customer_code, c.name as customer_name,
             c.address_line1, c.address_line2,
             co.name as country_name
      from invoice i
      join customer c on c.id = i.customer_id
      left join country co on co.id = c.country_id
      where i.id = $1
    `,
    [id],
  );

  if (header.rowCount === 0) return null;

  const lines = await pool.query(
    `
      select li.id, li.product_id, p.code as product_code, p.name as product_name,
             u.code as units_code,
             li.quantity, li.unit_price, li.extended_price
      from invoice_line_item li
      join product p on p.id = li.product_id
      join units u on u.id = p.units_id
      where li.invoice_id = $1
      order by li.id
    `,
    [id],
  );

  return { header: header.rows[0], line_items: lines.rows };
}

function enrichLineItems(client, line_items) {
  return (async () => {
    const enriched = [];
    for (const li of line_items) {
      const pr = await client.query("select unit_price from product where id=$1", [li.product_id]);
      if (pr.rowCount === 0) throw new Error(`product_id ${li.product_id} not found`);
      const unit_price = li.unit_price ?? Number(pr.rows[0].unit_price ?? 0);
      const extended_price = Number(li.quantity) * Number(unit_price);
      enriched.push({ ...li, unit_price, extended_price });
    }
    return enriched;
  })();
}

export async function createInvoice({ invoice_no, customer_id, invoice_date, vat_rate, line_items }) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    let resolvedInvoiceNo = invoice_no;
    if (!resolvedInvoiceNo || String(resolvedInvoiceNo).trim() === "") {
      const maxRes = await client.query("SELECT MAX(id) as m FROM invoice");
      const nextId = (maxRes.rows[0].m || 0) + 1;
      resolvedInvoiceNo = `INV-${nextId.toString().padStart(3, "0")}`;
    }

    const enriched = await enrichLineItems(client, line_items);

    const total = enriched.reduce((s, x) => s + x.extended_price, 0);
    const vat = total * vat_rate;
    const amount_due = total + vat;

    // Enforce customer credit limit: amount_due must not exceed credit_limit (if set)
    const cust = await client.query("SELECT credit_limit FROM customer WHERE id=$1", [customer_id]);
    if (cust.rowCount > 0 && cust.rows[0].credit_limit != null) {
      const limit = Number(cust.rows[0].credit_limit);
      if (amount_due > limit) {
        throw new Error(`Amount due (${amount_due}) exceeds customer credit limit (${limit}).`);
      }
    }

    const inv = await client.query(
      `
        insert into invoice (id, created_at, invoice_no, invoice_date, customer_id, total_amount, vat, amount_due)
        values (
          (select coalesce(max(id),0)+1 from invoice),
          now(),
          $1,$2,$3,$4,$5,$6
        )
        returning id
      `,
      [resolvedInvoiceNo, invoice_date, customer_id, total, vat, amount_due],
    );

    const invoice_id = inv.rows[0].id;

    for (const li of enriched) {
      await client.query(
        `
          insert into invoice_line_item (id, created_at, invoice_id, product_id, quantity, unit_price, extended_price)
          values (
            (select coalesce(max(id),0)+1 from invoice_line_item),
            now(),
            $1,$2,$3,$4,$5
          )
        `,
        [invoice_id, li.product_id, li.quantity, li.unit_price, li.extended_price],
      );
    }

    await client.query("commit");
    return { id: invoice_id };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteInvoice(id) {
  await pool.query("delete from invoice where id=$1", [id]);
  return { ok: true };
}

export async function updateInvoice(
  id,
  { invoice_no, customer_id, invoice_date, vat_rate, line_items },
) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const enriched = await enrichLineItems(client, line_items);

    const total = enriched.reduce((s, x) => s + x.extended_price, 0);
    const vat = total * vat_rate;
    const amount_due = total + vat;

    // Enforce customer credit limit: amount_due must not exceed credit_limit (if set)
    const cust = await client.query("SELECT credit_limit FROM customer WHERE id=$1", [customer_id]);
    if (cust.rowCount > 0 && cust.rows[0].credit_limit != null) {
      const limit = Number(cust.rows[0].credit_limit);
      if (amount_due > limit) {
        throw new Error(`Amount due (${amount_due}) exceeds customer credit limit (${limit}).`);
      }
    }

    // If invoice_no is empty (e.g. frontend sent "" for "auto"), keep existing value to avoid unique constraint
    let resolvedInvoiceNo = (invoice_no != null && String(invoice_no).trim() !== "") ? String(invoice_no).trim() : null;
    if (resolvedInvoiceNo === null) {
      const cur = await client.query("SELECT invoice_no FROM invoice WHERE id=$1", [id]);
      if (cur.rowCount > 0) resolvedInvoiceNo = cur.rows[0].invoice_no;
      else resolvedInvoiceNo = `INV-${id}`;
    }

    await client.query(
      `
        UPDATE invoice 
        SET invoice_no=$1, invoice_date=$2, customer_id=$3, total_amount=$4, vat=$5, amount_due=$6
        WHERE id=$7
      `,
      [resolvedInvoiceNo, invoice_date, customer_id, total, vat, amount_due, id],
    );

    await client.query("DELETE FROM invoice_line_item WHERE invoice_id=$1", [id]);

    for (const li of enriched) {
      await client.query(
        `
          INSERT INTO invoice_line_item (id, created_at, invoice_id, product_id, quantity, unit_price, extended_price)
          VALUES (
            (select coalesce(max(id),0)+1 from invoice_line_item),
            now(),
            $1,$2,$3,$4,$5
          )
        `,
        [id, li.product_id, li.quantity, li.unit_price, li.extended_price],
      );
    }

    await client.query("commit");
    return { id };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

