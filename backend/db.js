const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// ─── MySQL-compatible wrapper ───
// Converts mysql2-style `?` placeholders to PostgreSQL `$1, $2, $3`
// Returns [rows, fields] like mysql2 so route files work unchanged.

function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

const wrapper = {
  // pool.query(sql, params) → [rows, fields]
  async query(sql, params = []) {
    const pgSql = convertPlaceholders(sql);
    const result = await pool.query(pgSql, params);
    return [result.rows, result.fields || []];
  },

  // db.execute(sql, params) → [rows, fields]  (alias for query)
  async execute(sql, params = []) {
    const pgSql = convertPlaceholders(sql);
    const result = await pool.query(pgSql, params);
    // Attach insertId for INSERT...RETURNING compatibility
    if (result.rows.length > 0 && result.rows[0].id !== undefined) {
      result.insertId = result.rows[0].id;
    }
    return [result.rows, result];
  },

  // getConnection() → returns a client that mimics mysql2 connection
  async getConnection() {
    const client = await pool.connect();
    return {
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async execute(sql, params = []) {
        const pgSql = convertPlaceholders(sql);
        const result = await client.query(pgSql, params);
        if (result.rows.length > 0 && result.rows[0].id !== undefined) {
          result.insertId = result.rows[0].id;
        }
        return [result.rows, result];
      },
      async query(sql, params = []) {
        const pgSql = convertPlaceholders(sql);
        const result = await client.query(pgSql, params);
        return [result.rows, result.fields || []];
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        client.release();
      }
    };
  }
};

module.exports = wrapper;
