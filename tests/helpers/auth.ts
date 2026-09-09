import { expect, type APIRequestContext, type BrowserContext, type Cookie } from "@playwright/test";

import { ENV } from "../env";
import type { TestUser } from "./users";

const AUTH_COOKIE = "token";

/**
 * Signing in is setup for almost every spec, so it goes over the API rather than
 * the form. Driving the login screen hundreds of times would make every spec in
 * the suite fail whenever login breaks, hiding what each one actually tests -
 * and it is slower. The UI login path is covered explicitly, once, in
 * specs/auth.spec.ts, where it is the subject rather than the setup.
 */

export const registerViaApi = async (
  request: APIRequestContext,
  user: TestUser,
): Promise<void> => {
  const response = await request.post(`${ENV.apiURL}/api/auth/register`, {
    data: { username: user.username, email: user.email, password: user.password },
  });

  expect(
    response.status(),
    `Registering ${user.username} failed: ${await response.text()}`,
  ).toBe(201);
};

/**
 * Returns the raw session cookie value.
 *
 * NOTE: the API authenticates by **email**, never by username - the login form
 * calls the field "Username" but sends it as `email` (see AuthContext.tsx and
 * auth.service.ts). Passing a username here yields 401 for reasons that have
 * nothing to do with the spec calling it.
 */
export const loginViaApi = async (
  request: APIRequestContext,
  credentials: { email: string; password: string },
): Promise<string> => {
  const response = await request.post(`${ENV.apiURL}/api/auth/login`, {
    data: { email: credentials.email, password: credentials.password },
  });

  expect(
    response.status(),
    `Signing ${credentials.email} in failed: ${await response.text()}`,
  ).toBe(200);

  const setCookie = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value)
    .find((value) => value.startsWith(`${AUTH_COOKIE}=`));

  if (!setCookie) {
    throw new Error("The login response carried no token cookie.");
  }

  return setCookie.slice(`${AUTH_COOKIE}=`.length).split(";")[0];
};

/**
 * The backend runs with NODE_ENV=production even locally, so it issues the cookie
 * as `Secure; SameSite=None`. Chrome treats localhost as a trustworthy origin, so
 * this is accepted over plain http - but the flags have to be reproduced exactly
 * or the browser drops the cookie and the session silently does not exist.
 *
 * The domain is deliberately bare `localhost`: cookies ignore ports, which is why
 * a cookie minted by the API on :3000 authenticates the SPA on :5173.
 */
const sessionCookie = (token: string): Cookie => ({
  name: AUTH_COOKIE,
  value: token,
  domain: "localhost",
  path: "/",
  expires: -1,
  httpOnly: true,
  secure: true,
  sameSite: "None",
});

export const applySession = async (context: BrowserContext, token: string): Promise<void> => {
  await context.addCookies([sessionCookie(token)]);
};
