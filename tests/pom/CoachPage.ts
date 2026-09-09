import type { Locator, Page } from "@playwright/test";

/**
 * The composer is located but never submitted: sending a message calls OpenAI,
 * which is neither deterministic nor free. What this page object is for is the
 * shell around the model - that it renders, and what it says when the API
 * refuses the caller.
 */
export class CoachPage {
  readonly composer: Locator;
  readonly send: Locator;
  readonly emptyStateTitle: Locator;
  readonly forbiddenMessage: Locator;

  constructor(private readonly page: Page) {
    this.composer = page.getByRole("textbox");
    this.send = page.getByRole("button", { name: "Send message" });
    this.emptyStateTitle = page.getByText("Start a conversation");
    this.forbiddenMessage = page.getByText("You do not have permission to access the AI coach.");
  }

  async open(): Promise<void> {
    await this.page.goto("/coach");
  }
}
