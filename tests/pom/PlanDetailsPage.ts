import type { Locator, Page } from "@playwright/test";

export class PlanDetailsPage {
  readonly notFound: Locator;
  readonly backToPlans: Locator;
  readonly downloadFit: Locator;

  constructor(private readonly page: Page) {
    this.notFound = page.getByText("Plan not found");
    this.backToPlans = page.getByRole("button", { name: /Back to plans|All plans/ });
    this.downloadFit = page.getByRole("button", { name: /Download for Garmin/ });
  }

  async open(planId: string): Promise<void> {
    await this.page.goto(`/plans/${planId}`);
  }

  section(title: string): Locator {
    return this.page.getByText(title, { exact: true });
  }
}
