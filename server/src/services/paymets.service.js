import { pool } from "../db/pool.js";

export async function listPayments({page = 1, limit = 10} = {}) {
    const offset = (Number(page) - 1) * Number(limit);

    const countResult = await pool.query(
        "SELECT COUNT(*) as total FROM payment"
    );

    const total = Number(countResult.rows[0].total);

    const { rows } = await pool.query(
        "SELECT * FROM payment ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [Number(limit), offset]
    );

    return {
        data: rows,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
    };
}