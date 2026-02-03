-- Import seed CSV data (นำเข้าข้อมูลตัวอย่าง)
-- Example usage: psql -f src/sql/002_import_csv.sql
\copy country(id, created_at, code, name) from 'data/country_test.csv' with (format csv, header true);
\copy customer(id, created_at, code, name, address_line1, address_line2, country_id, credit_limit) from 'data/customer_test.csv' with (format csv, header true);
\copy units(id, created_at, code, name) from 'data/units_test.csv' with (format csv, header true);
\copy product(id, created_at, code, name, units_id, unit_price) from 'data/product_test.csv' with (format csv, header true);
\copy invoice(id, created_at, invoice_no, invoice_date, customer_id, total_amount, vat, amount_due) from 'data/invoice_test.csv' with (format csv, header true);
\copy invoice_line_item(id, created_at, invoice_id, product_id, quantity, unit_price, extended_price) from 'data/invoice_line_item_test.csv' with (format csv, header true);
