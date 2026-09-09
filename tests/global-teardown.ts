import { deleteTestUsers } from "./helpers/db";

/**
 * The app exposes no way to delete an account, so the suite cleans up through the
 * database it shares with the backend. Without this the users pile up run after
 * run and the "no activities yet" empty states stop being reachable.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    const removed = await deleteTestUsers();

    if (removed === null) {
      console.warn(
        "\n[teardown] No database connection resolved - test users were left behind." +
          "\n[teardown] Set DATABASE_URL in tests/.env, or keep POSTGRES_* in backend/.env.",
      );
      return;
    }

    console.log(`\n[teardown] Removed ${removed} test user(s) and everything they owned.`);
  } catch (error) {
    // A failed cleanup must not turn a green suite red: the run already told the
    // truth about the app. It only means the next run starts from a dirtier database.
    console.warn(`\n[teardown] Cleanup failed: ${(error as Error).message}`);
  }
}
