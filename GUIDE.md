
# 📦 Invoice System Template - Documentation
ยินดีต้อนรับสู่โปรเจกต์ระบบจัดการใบแจ้งหนี้ (Invoice Management System) ซึ่งถูกออกแบบมาเพื่อเป็น Template สำหรับการเรียนรู้และนำไปใช้งานต่อ

---

## 🇹🇭 ภาษาไทย (Thai)

### 1. โครงสร้างของโปรเจกต์ (Project Structure)
- **`client/`**: ส่วนของ Frontend พัฒนาด้วย **React + Vite**
  - `src/pages/`: หน้าเว็บต่างๆ เช่น รายการใบแจ้งหนี้ (InvoiceList), การสร้าง (InvoiceCreate), รายงาน (Reports)
  - `src/api/`: ส่วนที่ใช้เชื่อมต่อกับ Backend API โดยใช้ `fetch`
  - `src/utils.js`: ฟังก์ชันช่วยจัดรูปแบบเงินบาท (฿) และวันที่
- **`server/`**: ส่วนของ Backend พัฒนาด้วย **Node.js + Express**
  - `src/routes/`: กำหนดเส้นทาง API (API Endpoints)
  - `src/db/pool.js`: การเชื่อมต่อฐานข้อมูล PostgreSQL
  - `sql_run.sql`: ไฟล์สำหรับสร้างตาราง (Schema) และข้อมูลจำลอง (Mock Data)

### 2. ฟีเจอร์หลัก (Key Features)
- **จัดการใบแจ้งหนี้**: สร้าง, ดูรายละเอียด และพิมพ์เป็น PDF
- **จัดการข้อมูลพื้นฐาน**: เพิ่มข้อมูลลูกค้า (Customer) และสินค้า (Product) ได้โดยตรง
- **รายงานสรุป**: ดูยอดขายแยกตามสินค้าและลูกค้าในรูปแบบ Business Analytics
- **ระบบพิมพ์**: รองรับการ Print Preview และบันทึกเป็น PDF ที่จัดรูปแบบให้อย่างสวยงาม

### 3. วิธีการนำไปพัฒนาต่อ (How to Extend)
- **การเพิ่มฟิลด์ในฐานข้อมูล**: แก้ไขไฟล์ `server/sql_run.sql` แล้วรัน SQL ใหม่ หรือใช้คำสั่ง `ALTER TABLE`
- **การปรับเปลี่ยนดีไซน์**: แก้ไขไฟล์ `client/src/index.css` ซึ่งใช้ CSS Variables ในการกำหนดสีและ UI

---

## 🇺🇸 English (English)

### 1. Project Structure
- **`client/`**: Frontend built with **React + Vite**
  - `src/pages/`: Application pages like InvoiceList, InvoiceCreate, and Reports.
  - `src/api/`: API wrappers that communicate with the backend.
  - `src/utils.js`: Utility functions for Thai Baht (฿) and Date formatting.
- **`server/`**: Backend built with **Node.js + Express**
  - `src/routes/`: Defines API endpoints.
  - `src/db/pool.js`: PostgreSQL connection pool setup.
  - `sql_run.sql`: SQL script for database schema and sample data.

### 2. Key Features
- **Invoice Management**: Create, view, and export invoices to PDF.
- **Master Data CRUD**: Added forms to create new Customers and Products.
- **Business Analytics**: Report section showing sales performance.
- **Print Optimization**: Built-in CSS print styles for clean PDF exports.

### 3. How to Extend
- **Database Changes**: Modify `server/sql_run.sql` or use SQL migration commands.
- **Design Customization**: Edit `client/src/index.css`. The project uses CSS Variables for easy theme adjustments.

---

## 🛠 Tech Stack
- **Frontend**: React, React Router, Vite
- **Backend**: Node.js, Express, pg (PostgreSQL Client)
- **Database**: PostgreSQL (Dockerized)
