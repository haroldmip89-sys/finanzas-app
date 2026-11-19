import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
/**
 * Drizzle client for Neon using @neondatabase/serverless Pool.
 * In Vercel production, set DATABASE_URL to Neon’s pooled connection endpoint
 * (hostname includes "-pooler") to reduce connection overhead during serverless
 * cold starts. This code intentionally does not rewrite/guess the URL because
 * local, test, and migration environments may use different connection types.
 *
 * Server-only, Node.js runtime. No schema is passed: modules use query
 * builder with tables from src/db/schema.
 */
function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined. Set it in .env.local.");
  }
  return drizzle(new Pool({ connectionString }));
}

type Db = ReturnType<typeof createDb>;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
let instance: Db | undefined;
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
