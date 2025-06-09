// db/db.js
import { Pool } from "pg";
import dotenv from 'dotenv'
import { DB_URI } from "../config/env.js";
dotenv.config();

if (!DB_URI) {
  throw new Error("Missing DATABASE_URL in environment");
}

const isNeon = DB_URI.includes("neon.tech");

const pool = new Pool({
  connectionString: DB_URI,
  ssl: isNeon
    ? { rejectUnauthorized: false } 
    : false,      
  keepAlive: true,
  idleTimeoutMillis: 30000,      
  connectionTimeoutMillis: 10000, 
});
pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client:", err.stack);
     process.exit(-1);  // crash & restart
});
pool
  .connect()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("DB connection error:", err.message));

export default pool;
