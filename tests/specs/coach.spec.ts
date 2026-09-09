import { expect, test } from "../fixtures/test";

/**
 * No message is ever sent from these tests. Sending calls OpenAI, whose answers
 * are neither repeatable nor free; testing the model belongs to a different
 * harness. What is worth pinning here is the shell around it - and in particular
 * what a user who is not allowed in is told.
 */
test.describe("as a regular user", () => {
  test.beforeEach(async ({ coachPage }) => {
    await coachPage.open();
  });

  test("the coach is reachable in the navigation but refuses to open", async ({
    coachPage,
  }) => {
    // The whole of /api/chat sits behind requireAdmin (chat.routes.ts), while the
    // sidebar offers Coach to everyone. The page handles the 403 rather than
    // hanging or going blank, which is the thing worth keeping true.
    await expect(coachPage.forbiddenMessage).toBeVisible();
  });

  test("the composer is present but there is no session to send into", async ({
    coachPage,
  }) => {
    await expect(coachPage.composer).toBeVisible();
    await expect(coachPage.send).toBeVisible();
  });
});

test.describe("as an admin @admin", () => {
  test("the coach opens without a permission error", async ({ adminPage }) => {
    await adminPage.goto("/coach");

    await expect(
      adminPage.getByText("You do not have permission to access the AI coach."),
    ).toBeHidden();
    await expect(adminPage.getByRole("textbox")).toBeVisible();
    await expect(adminPage.getByRole("button", { name: "Send message" })).toBeVisible();
  });
});
