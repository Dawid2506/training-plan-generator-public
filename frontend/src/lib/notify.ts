import { toast } from "sonner";

import type { NotificationType } from "@/types/commonTypes";

/**
 * The app's single notification entry point. Backed by Sonner, but the call
 * signature is unchanged from the previous in-house provider, so every existing
 * `notify(message, type)` call site keeps working.
 */
export const notify = (message: string, type: NotificationType = "Info") => {
  switch (type) {
    case "Success":
      return toast.success(message);
    case "Error":
      return toast.error(message);
    case "Warning":
      return toast.warning(message);
    default:
      return toast.info(message);
  }
};

const notifications = { notify } as const;

/** Kept as a hook so components read the same way they always did. */
export const useNotifications = () => notifications;

export { toast };
