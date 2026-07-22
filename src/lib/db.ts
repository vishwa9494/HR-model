import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool() {
  if (typeof window !== 'undefined') {
    return null; // DB queries can only run on server side
  }
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn("DATABASE_URL is not configured. DB queries will fall back to local state.");
      return null;
    }
    try {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    } catch (error) {
      console.error("Failed to initialize database pool:", error);
      pool = null;
    }
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const p = getPool();
  if (!p) {
    throw new Error("Database not connected. Running in offline/mock mode.");
  }
  return p.query(text, params);
}
