import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(here, ".env"), quiet: true });

/**
 * Every environment-dependent value the suite needs, resolved once.
 *
 * The suite never starts the app. Both servers are expected to be up already,
 * which keeps the config honest about what it does and does not own.
 */
export const ENV = {
  baseURL: process.env.BASE_URL ?? "http://localhost:5173",
  apiURL: process.env.API_URL ?? "http://localhost:3000",
  admin: {
    email: process.env.ADMIN_EMAIL ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
  },
  /** Blank is valid: the teardown then falls back to ../backend/.env. */
  databaseUrl: process.env.DATABASE_URL ?? "",
} as const;

/** Specs tagged @admin skip themselves rather than fail when no admin is configured. */
export const hasAdminCredentials = Boolean(ENV.admin.email && ENV.admin.password);

/** Where the admin session is cached between the setup project and the specs. */
export const ADMIN_STORAGE_STATE = resolve(here, ".auth/admin.json");

/**
 * Marks everything the suite creates. The teardown deletes users by this prefix,
 * so it must never match an account a human made.
 */
export const TEST_PREFIX = "e2e-";
