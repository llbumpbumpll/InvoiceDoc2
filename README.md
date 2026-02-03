# Invoice System (React + Express + PostgreSQL)

This project contains:
- PostgreSQL schema + CSV import scripts
- Express API (Invoices + Reports)
- React client (minimal pages)

## 1) Database
Create DB:
    createdb invoices_db

Apply schema + import (run from server/ folder):
    psql -d invoices_db -f src/sql/001_schema.sql
    psql -d invoices_db -f src/sql/002_import_csv.sql

## 2) Server
    cd server
    cp .env.example .env
    npm i
    npm run dev
Health check:
    http://localhost:4000/health

## 3) Client
    cd client
    cp .env.example .env
    npm i
    npm run dev
Open:
    http://localhost:5173

## Create Invoice (UI)
Go to Invoices → + Create, fill form, submit. It calls POST /api/invoices.
