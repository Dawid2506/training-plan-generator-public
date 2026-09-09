import type { Locator, Page } from "@playwright/test";

export class PlansPage {
  readonly heading: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly rangeLabel: Locator;
  readonly emptyState: Locator;
  readonly firstPage: Locator;
  readonly previousPage: Locator;
  readonly nextPage: Locator;
  readonly lastPage: Locator;
  readonly pageSizeSelect: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Interval plans" });
    this.table = page.getByRole("table");
    this.rows = this.table.locator("tbody tr");
    this.rangeLabel = page.getByText(/\d+–\d+ of \d+|0 plans/);
    this.emptyState = page.getByText("No interval plans yet");
    this.firstPage = page.getByRole("button", { name: "First page" });
    this.previousPage = page.getByRole("button", { name: "Previous page" });
    this.nextPage = page.getByRole("button", { name: "Next page" });
    this.lastPage = page.getByRole("button", { name: "Last page" });
    this.pageSizeSelect = page.getByRole("combobox").first();
  }

  /** Rows per page; the only control that recomputes the range label today. */
  async setPageSize(size: string): Promise<void> {
    await this.pageSizeSelect.click();
    await this.page.getByRole("option", { name: size, exact: true }).click();
  }

  async open(): Promise<void> {
    await this.page.goto("/plans");
  }

  columnHeader(name: string): Locator {
    return this.table.getByRole("columnheader", { name });
  }

  async openFirstPlan(): Promise<void> {
    await this.rows.first().click();
    await this.page.waitForURL(/\/plans\/[^/]+$/);
  }
}
