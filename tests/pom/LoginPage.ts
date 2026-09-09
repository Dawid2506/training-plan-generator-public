import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly createAccountLink: Locator;
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    // The four ids the app already ships; nothing had to be added for the suite.
    this.username = page.getByTestId("username");
    this.password = page.getByTestId("password");
    this.submit = page.getByTestId("login-button");
    this.createAccountLink = page.getByTestId("sign-up-button");
    this.heading = page.getByRole("heading", { name: "Welcome back" });
  }

  async open(): Promise<void> {
    await this.page.goto("/login");
  }

  /**
   * The field is labelled "Username", but the value is sent as `email` and the
   * backend looks the account up by email - so this takes an identifier, and
   * callers who want a session pass the address. specs/auth.spec.ts covers the
   * mismatch itself.
   */
  async signIn(identifier: string, password: string): Promise<void> {
    await this.username.fill(identifier);
    await this.password.fill(password);
    await this.submit.click();
  }
}
