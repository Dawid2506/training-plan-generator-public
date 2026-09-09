import type { Locator, Page } from "@playwright/test";

/** Matches lib/brand.ts - the document title is `${section} · ${APP_NAME}`. */
export const APP_NAME = "DTStandard";

/**
 * Sidebar label -> the section title used by the top bar and the document title.
 * Mirrors components/layout/nav-items.ts, where the two differ for one entry
 * ("Plans" in the rail, "Interval plans" as the title).
 */
export const SECTIONS = {
  Home: { path: "/dashboard", title: "Home" },
  Coach: { path: "/coach", title: "Coach" },
  Activities: { path: "/activities", title: "Activities" },
  Plans: { path: "/plans", title: "Interval plans" },
  Strava: { path: "/strava", title: "Strava" },
  Settings: { path: "/settings", title: "Settings" },
} as const;

export type SectionName = keyof typeof SECTIONS;

/**
 * The sidebar and top bar wrap every signed-in screen, so they are a component
 * object rather than a page: each page object composes one instead of restating
 * how navigation works.
 */
export class AppNav {
  constructor(private readonly page: Page) {}

  private readonly sidebar = (): Locator => this.page.locator("aside");

  link(section: SectionName): Locator {
    return this.sidebar().getByRole("link", { name: section, exact: true });
  }

  /** React Router marks the active NavLink with aria-current="page". */
  activeLink(): Locator {
    return this.sidebar().locator('a[aria-current="page"]');
  }

  topBarTitle(): Locator {
    return this.page.locator("header p").first();
  }

  collapseToggle(): Locator {
    return this.sidebar().getByRole("button", { name: /collapse|expand/i });
  }

  themeToggle(): Locator {
    return this.page.locator("header").getByRole("button", { name: /switch to (light|dark) theme/i });
  }

  /** The account button at the foot of the rail; opens Settings / Log out. */
  userMenuTrigger(): Locator {
    return this.sidebar().getByRole("button").filter({ hasText: /@/ });
  }

  async openUserMenu(): Promise<void> {
    await this.userMenuTrigger().click();
  }

  logoutMenuItem(): Locator {
    return this.page.getByRole("menuitem", { name: "Log out" });
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutMenuItem().click();
    await this.page.waitForURL("**/login");
  }

  async goTo(section: SectionName): Promise<void> {
    await this.link(section).click();
    await this.page.waitForURL(`**${SECTIONS[section].path}`);
  }

  static documentTitle(section: SectionName): string {
    return `${SECTIONS[section].title} · ${APP_NAME}`;
  }
}
