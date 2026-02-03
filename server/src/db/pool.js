// PostgreSQL connection pool (ตัวเชื่อม DB)
// Example usage: pool.query("SELECT 1")
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
