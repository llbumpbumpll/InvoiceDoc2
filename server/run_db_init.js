
// Run SQL init script using DATABASE_URL (สคริปต์ตั้งค่า DB)
// Example usage: node run_db_init.js
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    const client = await pool.connect();
    try {
        const sqlPath = path.join(__dirname, 'sql_run.sql');
        if (!fs.existsSync(sqlPath)) {
            console.error(`Error: File not found at ${sqlPath}`);
            return;
        }
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Connecting to database...`);
        console.log(`Executing SQL script from: ${sqlPath}`);

        // Execute SQL (schema + seed data)
        await client.query(sql);

        console.log('Successfully executed sql_run.sql');
    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
