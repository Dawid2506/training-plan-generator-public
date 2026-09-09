import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Real ride files, supplied by whoever runs the suite. See tests/README.md. */
export const TRAININGS_DIR = resolve(here, "../trainings");

export const fitFiles = (): string[] =>
  readdirSync(TRAININGS_DIR)
    .filter((name) => name.toLowerCase().endsWith(".fit"))
    .sort()
    .map((name) => resolve(TRAININGS_DIR, name));

/**
 * A file whose name contains a space and brackets.
 *
 * Not a contrived case: the fixtures are named the way a watch exports them
 * ("Afternoon_Ride (2).fit"), and the name travels through multipart encoding
 * into the activity list, so it is worth pinning that it survives intact.
 */
export const awkwardlyNamedFit = (): string =>
  fitFiles().find((path) => /[()\s]/.test(basename(path))) ?? fitFiles()[0];

/** Any file that is not a .fit, for the rejection path. */
export const notAFitFile = (): string => resolve(here, "../package.json");

export const fileName = (path: string): string => basename(path);
