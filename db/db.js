import { Pool } from "pg";
import dotenv from 'dotenv';
import { DB_URI } from "../config/env.js";
import fs from 'fs';
import path from 'path';

dotenv.config();

if (!DB_URI) {
  throw new Error("Missing DATABASE_URL in environment");
}

// Load the AWS RDS CA certificate
const caCertPath = path.resolve('eu-north-1-bundle.pem'); // Adjust path if needed
const caCert = fs.readFileSync(caCertPath).toString();

const pool = new Pool({
  connectionString: DB_URI,
  ssl: {
    rejectUnauthorized: true, // Enforce certificate validation
    ca: caCert, // AWS RDS CA certificate
  },
  keepAlive: true,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 50000,
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client:", err.stack);
  process.exit(-1); // Crash & restart
});

pool
  .connect()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("DB connection error:", err.message));

export default pool;