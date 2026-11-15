import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/**
 * Any Drizzle Postgres database (Neon in production, PGlite in tests).
 * Services receive it so they can be tested against real constraints.
 */
export type Database = PgDatabase<PgQueryResultHKT>;
