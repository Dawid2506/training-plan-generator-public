import type { Locator, Page } from "@playwright/test";

export class StravaPage {
  readonly heading: Locator;
  readonly connectButton: Locator;
  readonly disconnectedEmptyState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Strava", exact: true });
    // Never clicked: it assigns window.location to the OAuth entry point, which
    // leaves the app for strava.com.
    this.connectButton = page.getByRole("button", { name: "Connect Strava" });
    this.disconnectedEmptyState = page.getByText("Connect Strava to see your activities");
  }

  async open(): Promise<void> {
    await this.page.goto("/strava");
  }
}
