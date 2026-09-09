import { config } from "dotenv";
import { Client } from "pg";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

import { ENV, TEST_PREFIX } from "../env";

const here = dirname(fileURLToPath(import.meta.url));
const BACKEND_ENV = resolve(here, "../../backend/.env");

/**
 * Where the connection string comes from, in order of preference:
 *
 * 1. DATABASE_URL in tests/.env - an explicit override.
 * 2. POSTGRES_* out of backend/.env, rewritten to reach the database from the
 *    host. The backend's own DATABASE_URL points at the compose service name
 *    (`postgres:5432`), which only resolves inside the Docker network; from here
 *    the same database is on localhost at the published port.
 *
 * Reading the backend's file keeps one copy of the credentials rather than
 * duplicating them into a second .env that then drifts.
 */
const resolveConnectionString = (): string | null => {
  if (ENV.databaseUrl) return ENV.databaseUrl;
  if (!existsSync(BACKEND_ENV)) return null;

  const parsed = config({ path: BACKEND_ENV, processEnv: {}, quiet: true }).parsed ?? {};
  const { POSTGRES_USER: user, POSTGRES_PASSWORD: password, POSTGRES_DB: database } = parsed;

  if (!user || !password || !database) return null;

  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5434";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
};

/**
 * Deletes every account the suite created, and with it everything those accounts
 * own. Safe to do in one statement: every relation to "User" in schema.prisma is
 * declared `onDelete: Cascade`, so activities, training plans, chat sessions,
 * messages, token usage and the athlete profile go with the row.
 *
 * The LIKE pattern is anchored to TEST_PREFIX, so an account a human registered
 * can never match. Returns the number of users removed, or null when no database
 * connection could be resolved - a missing password should not fail a green run.
 */
export const deleteTestUsers = async (): Promise<number | null> => {
  const connectionString = resolveConnectionString();
  if (!connectionString) return null;

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rowCount } = await client.query('DELETE FROM "User" WHERE username LIKE $1', [
      `${TEST_PREFIX}%`,
    ]);
    return rowCount ?? 0;
  } finally {
    await client.end();
  }
};
