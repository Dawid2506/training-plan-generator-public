import { expect, test } from "../fixtures/test";
import { expectToast } from "../helpers/toast";
import { makeUser } from "../helpers/users";

test.describe("registration", () => {
  test("a new account can be created from the form", async ({ registerPage, anonPage, user }) => {
    await registerPage.open();
    await registerPage.register(user);

    // The form navigates to /dashboard, but the new account has no session -
    // registering does not sign you in - so ProtectedRoute sends it to /login.
    // Asserted as the app behaves, not as the form intends.
    await expect(anonPage).toHaveURL(/\/login$/);
  });

  test("the account created this way can then sign in", async ({
    registerPage,
    loginPage,
    anonPage,
    user,
  }) => {
    await registerPage.open();
    await registerPage.register(user);
    await expect(anonPage).toHaveURL(/\/login$/);

    await loginPage.signIn(user.email, user.password);
    await expect(anonPage).toHaveURL(/\/dashboard$/);
  });

  test("mismatched passwords are rejected before anything is sent", async ({
    registerPage,
    anonPage,
    user,
  }) => {
    const requests: string[] = [];
    anonPage.on("request", (request) => {
      if (request.url().includes("/api/auth/register")) requests.push(request.url());
    });

    await registerPage.open();
    await registerPage.register(user, "a-different-password");

    await expect(registerPage.fieldError("Passwords must match.")).toBeVisible();
    await expect(anonPage).toHaveURL(/\/register$/);
    expect(requests, "client-side validation should stop the request").toHaveLength(0);
  });

  test("an email that is already taken is refused", async ({
    registerPage,
    anonPage,
    registeredUser,
  }) => {
    await registerPage.open();
    await registerPage.register(makeUser({ email: registeredUser.email }));

    await expectToast(anonPage, "User with this email already exists");
    await expect(anonPage).toHaveURL(/\/register$/);
  });

  test("a username that is already taken is refused", async ({
    registerPage,
    anonPage,
    registeredUser,
  }) => {
    await registerPage.open();
    await registerPage.register(makeUser({ username: registeredUser.username }));

    await expectToast(anonPage, "User with this username already exists");
  });
});

test.describe("signing in", () => {
  test("correct credentials reach the dashboard", async ({
    loginPage,
    anonPage,
    registeredUser,
  }) => {
    await loginPage.open();
    await loginPage.signIn(registeredUser.email, registeredUser.password);

    await expect(anonPage).toHaveURL(/\/dashboard$/);
    await expect(
      anonPage.getByRole("heading", { name: new RegExp(registeredUser.username) }),
    ).toBeVisible();
  });

  test("a wrong password is refused and stays on the login screen", async ({
    loginPage,
    anonPage,
    registeredUser,
  }) => {
    await loginPage.open();
    await loginPage.signIn(registeredUser.email, "definitely-not-the-password");

    await expectToast(anonPage, "Invalid username or password");
    await expect(anonPage).toHaveURL(/\/login$/);
  });

  test("an unknown account is refused", async ({ loginPage, anonPage, user }) => {
    await loginPage.open();
    await loginPage.signIn(user.email, user.password);

    await expectToast(anonPage, "Invalid username or password");
  });

  /**
   * DEFECT: the field is labelled "Username" and validated as one, but the value
   * is sent as `email` (AuthContext.tsx) and looked up by email
   * (auth.service.ts), so a username can never sign in.
   *
   * Marked test.fail() so the suite stays green while the bug stands, and turns
   * red the moment somebody fixes it without updating this file.
   */
  test.fail("the username should work in the field labelled Username", async ({
    loginPage,
    anonPage,
    registeredUser,
  }) => {
    await loginPage.open();
    await loginPage.signIn(registeredUser.username, registeredUser.password);

    await expect(anonPage).toHaveURL(/\/dashboard$/);
  });
});

test.describe("session", () => {
  test("a reload keeps the user signed in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("a protected route redirects an anonymous visitor to login", async ({ anonPage }) => {
    await anonPage.goto("/dashboard");
    await expect(anonPage).toHaveURL(/\/login$/);
  });

  test("logging out from settings ends the session", async ({ page, settingsPage }) => {
    await settingsPage.open();
    await settingsPage.logout.click();
    await expect(page).toHaveURL(/\/login$/);

    // The session is really gone, not just navigated away from.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("logging out from the sidebar menu ends the session", async ({ page, nav }) => {
    await page.goto("/dashboard");
    await nav.logout();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});
