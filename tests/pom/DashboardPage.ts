import type { Locator, Page } from "@playwright/test";

/** The four summary tiles, keyed by the label printed under the value. */
export const TILES = {
  savedSessions: "Saved sessions",
  intervalPlans: "Interval plans",
  strava: "Strava",
  tokens: "Tokens · 24h",
} as const;

export type TileName = (typeof TILES)[keyof typeof TILES];

export class DashboardPage {
  readonly importFit: Locator;
  readonly askCoach: Locator;
  readonly latestSessionHeading: Locator;
  readonly recentPlansHeading: Locator;

  /** Scoped to the content area: the sidebar carries links with the same names. */
  private readonly main: Locator;
  /**
   * The summary grid, which is the first grid on the page.
   *
   * Scoping by text alone is not enough: "Connect Strava" in the empty state
   * points at the same route as the Strava tile, so a text filter matches both.
   */
  private readonly tiles: Locator;

  constructor(private readonly page: Page) {
    this.main = page.locator("main");
    this.tiles = this.main.locator("div.grid").first();
    this.importFit = page.getByRole("link", { name: "Import FIT" });
    this.askCoach = page.getByRole("link", { name: "Ask the coach" });
    this.latestSessionHeading = page.getByRole("heading", { name: "Latest session" });
    this.recentPlansHeading = page.getByRole("heading", { name: "Recent plans" });
  }

  async open(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  tile(label: TileName): Locator {
    return this.tiles.getByRole("link").filter({ hasText: label });
  }

  /** The value sits in the first paragraph of the tile, above its label. */
  tileValue(label: TileName): Locator {
    return this.tile(label).locator("p").first();
  }

  emptyState(title: string): Locator {
    return this.main.getByText(title, { exact: true });
  }

  stravaNotConnectedCard(): Locator {
    return this.page.getByText("Strava is not connected");
  }
}
