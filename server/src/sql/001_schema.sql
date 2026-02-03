-- Schema for invoice system tables (โครงสร้างตารางหลัก)
-- Example usage: psql -f src/sql/001_schema.sql
drop table if exists invoice_line_item;
drop table if exists invoice;
drop table if exists product;
drop table if exists customer;
drop table if exists units;
drop table if exists country;

create table country (
  id bigint primary key,
  created_at timestamp,
  code text unique not null,
  name text not null
);

create table customer (
  id bigint primary key,
  created_at timestamp,
  code text unique not null,
  name text not null,
  address_line1 text,
  address_line2 text,
  country_id bigint references country(id),
  credit_limit numeric(12,2)
);

create table units (
  id bigint primary key,
  created_at timestamp,
  code text unique not null,
  name text not null
);

create table product (
  id bigint primary key,
  created_at timestamp,
  code text unique not null,
  name text not null,
  units_id bigint references units(id),
  unit_price numeric(12,2)
);

create table invoice (
  id bigint primary key,
  created_at timestamp,
  invoice_no text unique not null,
  invoice_date date,
  customer_id bigint references customer(id),
  total_amount numeric(12,2),
  vat numeric(12,2),
  amount_due numeric(12,2)
);

create table invoice_line_item (
  id bigint primary key,
  created_at timestamp,
  invoice_id bigint not null references invoice(id) on delete cascade,
  product_id bigint not null references product(id),
  quantity numeric(12,2),
  unit_price numeric(12,2),
  extended_price numeric(12,2),
  unique (invoice_id, product_id)
);

create index if not exists idx_invoice_date on invoice(invoice_date);
create index if not exists idx_line_invoice on invoice_line_item(invoice_id);
create index if not exists idx_line_product on invoice_line_item(product_id);
