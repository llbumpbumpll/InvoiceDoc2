-- FILE: database/sql/005_invoice_lab4_delta.sql
\set ON_ERROR_STOP on

-- Receipt header
CREATE TABLE IF NOT EXISTS receipt (
  id               bigint primary key,
  created_at       timestamptz not null default now(),
  receipt_no       text unique not null,
  receipt_date     date not null,
  customer_id      bigint not null references customer(id),
  payment_method   text not null default 'cash',  -- cash | bank transfer | check
  payment_notes    text,
  total_received   numeric(14,2) not null default 0.00
);

-- Receipt line items (one row per invoice being paid in this receipt)
CREATE TABLE IF NOT EXISTS receipt_line_item (
  id               bigint primary key,
  created_at       timestamptz not null default now(),
  receipt_id       bigint not null references receipt(id) on delete cascade,
  invoice_id       bigint not null references invoice(id),
  amount_received  numeric(14,2) not null default 0.00
);

-- View: per-invoice summary of how much has been received and how much remains
CREATE OR REPLACE VIEW invoice_received_view AS
SELECT
  c.id                                                          AS customer_id,
  i.id                                                          AS invoice_id,
  i.invoice_no,
  i.amount_due,
  COALESCE(SUM(rli.amount_received), 0)                         AS amount_received,
  i.amount_due - COALESCE(SUM(rli.amount_received), 0)          AS amount_remain
FROM invoice i
JOIN customer c ON c.id = i.customer_id
LEFT JOIN receipt_line_item rli ON rli.invoice_id = i.id
GROUP BY c.id, i.id, i.invoice_no, i.amount_due;
