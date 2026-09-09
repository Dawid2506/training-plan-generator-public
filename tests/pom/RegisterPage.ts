import type { Locator, Page } from "@playwright/test";

import type { TestUser } from "../helpers/users";

export class RegisterPage {
  readonly username: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly passwordConfirmation: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByTestId("register-username");
    this.email = page.getByTestId("register-email");
    this.password = page.getByTestId("register-password");
    this.passwordConfirmation = page.getByTestId("register-passwordConfirmation");
    this.submit = page.getByTestId("register-submit");
  }

  async open(): Promise<void> {
    await this.page.goto("/register");
  }

  async fill(user: TestUser, confirmation = user.password): Promise<void> {
    await this.username.fill(user.username);
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.passwordConfirmation.fill(confirmation);
  }

  async register(user: TestUser, confirmation = user.password): Promise<void> {
    await this.fill(user, confirmation);
    await this.submit.click();
  }

  /** react-hook-form renders one message per field; this reads them all. */
  fieldError(message: string | RegExp): Locator {
    return this.page.getByText(message);
  }
}
