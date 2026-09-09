import { TEST_PREFIX } from "../env";

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

let sequence = 0;

/**
 * A user nobody else will collide with.
 *
 * Both the username and the email local part carry TEST_PREFIX, because the
 * teardown finds accounts by username and a human reading the database should be
 * able to tell at a glance which rows the suite owns.
 *
 * The counter matters as much as the timestamp: workers run in parallel and
 * Date.now() has millisecond resolution, so two users created in the same tick
 * would otherwise share a name.
 */
export const makeUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const id = `${Date.now().toString(36)}${(sequence += 1).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  return {
    username: `${TEST_PREFIX}${id}`,
    email: `${TEST_PREFIX}${id}@example.com`,
    password: "Str0ng-Passw0rd!",
    ...overrides,
  };
};
