# InvoiceDoc v2

A full-stack Invoice Management System built with React, Express, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Docker Desktop (for database)
- npm or yarn

### 1. Database Setup

Start PostgreSQL using Docker Compose:

```bash
cd database
docker-compose up -d
```

Run the database setup script:

```bash
./setup_db.sh
```

Or manually run SQL:

```bash
PGPASSWORD=root psql -h localhost -p 15432 -U root -d invoices_db -f sql/sql_run.sql
```

**Database Access:**
- Host: `localhost:15432`
- Database: `invoices_db`
- Username: `root`
- Password: `root`
- Adminer (Web UI): http://localhost:8080

### 2. Server Setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Server runs on: http://localhost:4000

**Environment Variables:**
- `PORT`: Server port (default: 4000)
- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://root:root@localhost:15432/invoices_db`)

### 3. Client Setup

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Client runs on: http://localhost:5173

**Environment Variables:**
- `VITE_API_BASE`: Backend API URL (default: `http://localhost:4000`)

## 📁 Project Structure

```
InvoiceDoc2/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page views
│   │   └── utils.js       # Utility functions
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── routes/        # API routes
│   │   └── db/            # Database connection
│   └── package.json
└── database/              # PostgreSQL setup
    ├── compose.yaml       # Docker Compose config
    ├── sql/               # SQL scripts
    ├── data/              # CSV test data
    └── setup_db.sh        # Database setup script
```

## 🎯 Features

### Invoice Management
- ✅ Create, view, edit, and delete invoices
- ✅ Auto-generate invoice numbers (`INV-001`, `INV-002`, ...)
- ✅ Multiple line items per invoice
- ✅ Automatic VAT calculation
- ✅ Print/PDF export with optimized styling

### Master Data Management
- ✅ **Customers**: Full CRUD with auto-code generation (`C{ID}`)
- ✅ **Products**: Full CRUD with auto-code generation (`P{ID}`)
- ✅ Cascading delete with force delete option

### Reports & Analytics
- ✅ Sales reports by product and customer
- ✅ Business analytics dashboard

## 🔌 API Endpoints

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer (with force delete option)

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product (with force delete option)

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice with line items
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Reports
- `GET /api/reports/sales-by-product` - Sales by product
- `GET /api/reports/sales-by-customer` - Sales by customer

## 🛠 Tech Stack

- **Frontend**: React 18, React Router 6, Vite 5
- **Backend**: Node.js, Express 4, pg (PostgreSQL client), Zod (validation)
- **Database**: PostgreSQL 17 (Docker)
- **Tools**: Docker Compose, Adminer

## 📝 Development Notes

### Auto-Numbering
- Customers: Auto-generates `C{ID}` if code is blank
- Products: Auto-generates `P{ID}` if code is blank
- Invoices: Auto-generates `INV-{ID}` if invoice_no is blank

### Cascading Deletes
- **Customer Delete**: Prevents deletion if invoices exist. Force delete removes customer and all related invoices.
- **Product Delete**: Prevents deletion if product is in invoices. Force delete removes product and all invoices containing it.

### Database Schema
- `country` - Country master data
- `units` - Unit of measurement
- `customer` - Customer information
- `product` - Product catalog
- `invoice` - Invoice headers
- `invoice_line_item` - Invoice line items

## 🐛 Troubleshooting

### Database Connection Error
If you see `relation "invoice" does not exist`:
1. Make sure Docker container is running: `docker-compose ps`
2. Run the setup script: `./setup_db.sh`
3. Or manually run SQL: `psql -h localhost -p 15432 -U root -d invoices_db -f sql/sql_run.sql`

### Port Already in Use
- Change `PORT` in `server/.env` for backend
- Change port in `client/vite.config.js` for frontend
- Change port mapping in `database/compose.yaml` for database

## 📚 Additional Documentation

- [GUIDE.md](./GUIDE.md) - Detailed project guide (Thai/English)
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed project structure

## 📄 License

This project is a template for learning and development purposes.
