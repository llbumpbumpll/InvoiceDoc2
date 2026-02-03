// Reports controller (ตรรกะสรุปยอดขาย)
// Example usage: GET /api/reports/product-sales
import { pool } from "../db/pool.js";

// Latest invoices (quick summary)
export async function getInvoicesMonthlySummary(req, res) {
  const { rows } = await pool.query(`
    select i.invoice_no, i.invoice_date, c.name as customer_name, i.amount_due
    from invoice i
    join customer c on c.id = i.customer_id
    order by i.invoice_date desc
    limit 20
  `);
  res.json(rows);
}

// Sales grouped by product
export async function getSalesByProductSummary(req, res) {
  const { rows } = await pool.query(`
    select p.code as product_code, p.name as product_name,
           sum(li.quantity) as quantity_sold,
           sum(li.extended_price) as value_sold
    from invoice_line_item li
    join product p on p.id = li.product_id
    group by p.code, p.name
    order by sum(li.extended_price) desc
  `);
  res.json(rows);
}

// Sales grouped by customer and product
export async function getSalesByCustomerSummary(req, res) {
  const { rows } = await pool.query(`
    select p.code as product_code, p.name as product_name,
           c.code as customer_code, c.name as customer_name,
           sum(li.quantity) as quantity_sold,
           sum(li.extended_price) as value_sold
    from invoice i
    join customer c on c.id = i.customer_id
    join invoice_line_item li on li.invoice_id = i.id
    join product p on p.id = li.product_id
    group by p.code, p.name, c.code, c.name
    order by p.code, c.code
  `);
  res.json(rows);
}

// Sales grouped by calendar month and product
export async function getSalesByProductMonthlySummary(req, res) {
  const { rows } = await pool.query(`
    select
      extract(year from i.invoice_date) as year,
      extract(month from i.invoice_date) as month,
      p.code as product_code,
      p.name as product_name,
      sum(li.quantity) as quantity_sold,
      sum(li.extended_price) as value_sold
    from invoice_line_item li
    join invoice i on i.id = li.invoice_id
    join product p on p.id = li.product_id
    group by year, month, p.code, p.name
    order by year, month, sum(li.extended_price) desc
  `);
  res.json(rows);
}

// Cleanup previous functions
