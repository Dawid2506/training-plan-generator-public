const MAX_FILE_NAME_LENGTH = 40;

/**
 * The downloaded file is copied onto the watch's own filesystem, so the name is
 * reduced to plain ASCII: accents are stripped, everything else becomes a dash.
 */
export const toFitFileName = (title: string): string => {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_FILE_NAME_LENGTH)
    .replace(/-+$/, "");

  return `${slug || "workout"}.fit`;
};
