import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl && config.databaseUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false
});

export async function query(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

export { pool };
