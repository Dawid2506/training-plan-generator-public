import type { Locator, Page } from "@playwright/test";

export class ActivitiesPage {
  /** The visible drop target; the real input next to it is sr-only. */
  readonly dropzone: Locator;
  readonly fileInput: Locator;
  readonly importButton: Locator;
  readonly clearSelection: Locator;
  readonly createPlan: Locator;
  readonly refresh: Locator;
  readonly sortSelect: Locator;
  readonly savedCount: Locator;
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.dropzone = page.getByText("Drop a .fit file here, or click to browse");
    this.fileInput = page.locator("#fit-upload");
    this.importButton = page.getByRole("button", { name: /^(Import|Importing…)$/ });
    this.clearSelection = page.getByRole("button", { name: "Clear selected file" });
    this.createPlan = page.getByRole("button", { name: /Create plan|Creating…/ });
    this.refresh = page.getByRole("button", { name: "Refresh" });
    this.sortSelect = page.getByRole("combobox");
    this.savedCount = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Saved sessions" }) })
      .locator("span.tnum")
      .first();
    // Each saved activity renders one card with this control.
    this.cards = page.getByRole("button", { name: "Remove saved activity" });
  }

  async open(): Promise<void> {
    await this.page.goto("/activities");
  }

  /** Puts a file on the hidden input, which is what clicking the dropzone does. */
  async chooseFile(absolutePath: string): Promise<void> {
    await this.fileInput.setInputFiles(absolutePath);
  }

  async importFile(absolutePath: string): Promise<void> {
    await this.chooseFile(absolutePath);
    await this.importButton.click();
  }

  async sortBy(option: "Activity date" | "Import date"): Promise<void> {
    await this.sortSelect.click();
    await this.page.getByRole("option", { name: option }).click();
  }

  /** The staged-but-not-yet-imported file, shown between the dropzone and the list. */
  stagedFile(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  card(text: string | RegExp): Locator {
    return this.page.locator("div.stagger-item").filter({ hasText: text });
  }

  /**
   * The number shown for one stat on a card, e.g. `stat(card, "Avg speed")`.
   *
   * `Stat` renders the value, its unit and its label inside one block, so the
   * label is what identifies the block and the first span is the value.
   */
  stat(card: Locator, label: string): Locator {
    return card
      .locator('[data-slot="stat"]')
      .filter({ hasText: label })
      .locator("span")
      .first();
  }

  /**
   * Moving time off the card, in hours, so it can be divided into a distance.
   *
   * The unit is part of the reading, not decoration: formatDuration switches
   * from mm:ss to h:mm once a session passes an hour, and "1:08" means very
   * different things either side of that.
   */
  async movingTimeHours(card: Locator): Promise<number> {
    const spans = card
      .locator('[data-slot="stat"]')
      .filter({ hasText: "Moving" })
      .locator("span");

    const [value, unit] = [
      (await spans.nth(0).innerText()).trim(),
      (await spans.nth(1).innerText()).trim(),
    ];
    const [left, right] = value.split(":").map(Number);

    return unit === "h:mm" ? left + right / 60 : left / 60 + right / 3600;
  }

  async removeFirstActivity(): Promise<void> {
    await this.cards.first().click();
  }
}
