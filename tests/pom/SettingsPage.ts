import type { Locator, Page } from "@playwright/test";

export type ThemeChoice = "Light" | "Dark" | "System";

/** The athlete-profile fields, by the label rendered above each input. */
export type ProfileField =
  | "Date of birth"
  | "Weight (kg)"
  | "Height (cm)"
  | "Resting HR"
  | "Max HR"
  | "FTP (watts)"
  | "Threshold pace"
  | "Hours per week"
  | "Sessions per week"
  | "Primary goal"
  | "Target event"
  | "Event date";

export type ProfileSelect = "Sex" | "Experience" | "Units";

const startsWith = (label: string): RegExp =>
  new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

export class SettingsPage {
  readonly heading: Locator;
  readonly logout: Locator;
  readonly themeGroup: Locator;
  readonly saveProfile: Locator;
  readonly extractText: Locator;
  readonly pdfInput: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Settings" });
    this.logout = page.getByRole("button", { name: "Log out" });
    this.themeGroup = page.getByRole("radiogroup", { name: "Theme" });
    this.saveProfile = page.getByRole("button", { name: /Save profile|Saving…/ });
    this.extractText = page.getByRole("button", { name: /Extract text|Processing…/ });
    this.pdfInput = page.locator("#pdf-upload");
  }

  async open(): Promise<void> {
    await this.page.goto("/settings");
  }

  // -- account card -------------------------------------------------------

  accountCard(): Locator {
    return this.page.locator("div").filter({ has: this.logout }).last();
  }

  // -- appearance ---------------------------------------------------------

  themeOption(choice: ThemeChoice): Locator {
    return this.themeGroup.getByRole("radio", { name: choice });
  }

  async chooseTheme(choice: ThemeChoice): Promise<void> {
    await this.themeOption(choice).click();
  }

  // -- athlete profile ----------------------------------------------------

  /**
   * Every field is wrapped in its own <label>, so the accessible name is the
   * label text and no field needs a test id. Several labels also carry a hint
   * ("Max HR" is followed by "Without this, zones are only estimated."), which
   * becomes part of that name - hence a prefix match rather than an exact one.
   */
  field(label: ProfileField): Locator {
    return this.page.getByLabel(startsWith(label));
  }

  select(label: ProfileSelect): Locator {
    return this.page.getByLabel(startsWith(label));
  }

  async fillProfile(values: Partial<Record<ProfileField, string>>): Promise<void> {
    for (const [label, value] of Object.entries(values)) {
      await this.field(label as ProfileField).fill(value);
    }
  }
}
