# Project Structure and Documentation

## Overview
This project is an Invoice Management System with FULL CRUD capabilities for Customers, Products, and Invoices.
It uses a React frontend (Vite) and a Node.js/Express backend with PostgreSQL.

## Directory Structure

### `client/`
Frontend application built with React.

-   `src/api/`: Contains API client functions (`http.js` wrapper).
    -   `customers.api.js`: API calls for customers.
    -   `products.api.js`: API calls for products.
    -   `invoices.api.js`: API calls for invoices.
-   `src/components/`: Reusable UI components.
    -   `InvoiceForm.jsx`: Complex form for creating/editing invoices with line items.
    -   `LineItemsEditor.jsx`: Sub-component for managing invoice line items.
-   `src/pages/`: Main page views.
    -   `CustomerList.jsx`: Lists customers, supports Create/Edit/Delete (with cascade delete).
    -   `ProductList.jsx`: Lists products, supports Create/Edit/Delete (with cascade delete).
    -   `InvoiceList.jsx`: Lists invoices, supports Delete.
    -   `InvoiceCreate.jsx`: Page to create a new invoice.
    -   `InvoiceEdit.jsx`: Page to edit an existing invoice (modifies header and lines).
    -   `InvoiceView.jsx`: Read-only view of a single invoice.
    -   `Reports.jsx`: Dashboard for viewing sales reports.

### `server/`
Backend API server built with Express.

-   `src/controllers/`: Logic for handling API requests.
    -   `invoices.controller.js`: Handles Invoice CRUD. Includes transaction management for header/lines and Auto-Numbering (`INV-XXX`).
    -   `reports.controller.js`: aggregation queries for reports.
-   `src/routes/`: Express Routes definitions.
    -   `customers.routes.js`: Routes for Customers. Includes Force Delete logic (deletes related invoices).
    -   `products.routes.js`: Routes for Products. Includes Force Delete logic (deletes invoices containing the product).
    -   `invoices.routes.js`: Routes for Invoices.
-   `src/db/`: Database connection (`pool.js`).
-   `sql_run.sql`: Database schema and seed data.

## Key Features

### Auto-Numbering
-   **Customers**: Auto-generates `C{ID}` if code is left blank.
-   **Products**: Auto-generates `P{ID}` if code is left blank.
-   **Invoices**: Auto-generates `INV-{ID}` if Invoice No is left blank.

### Cascading Deletes
-   **Customer Delete**: If a customer has invoices, the system prevents accidental deletion. The user can choose to "Force Delete," which removes the customer AND all their invoices.
-   **Product Delete**: If a product is in invoices, the system prevents deletion. The user can choose to "Force Delete," which removes the product AND all invoices that contain that product (as per user requirement).

### Invoice Editing
-   Invoices can be updated. The system updates the header and fully replaces line items to ensure data consistency.

## Environment Variables
-   `PORT`: Backend server port (default 4000).
-   `DATABASE_URL`: PostgreSQL connection string.
