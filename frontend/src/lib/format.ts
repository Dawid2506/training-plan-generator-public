/** Shared metric formatting. Every number the user reads goes through here. */

const asFiniteNumber = (value: number | string | undefined | null) => {
  if (value === undefined || value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatDistance = (value: number | string) => {
  const meters = asFiniteNumber(value);
  if (meters === null) return String(value);
  return `${(meters / 1000).toFixed(1)}`;
};

export const formatDuration = (value: number | string) => {
  const raw = asFiniteNumber(value);
  if (raw === null) return String(value);

  const totalSeconds = Math.max(0, Math.floor(raw));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const durationUnit = (value: number | string) => {
  const raw = asFiniteNumber(value);
  return raw !== null && raw >= 3600 ? "h:mm" : "mm:ss";
};

export const formatSpeed = (value: number | string) => {
  const mps = asFiniteNumber(value);
  if (mps === null) return String(value);
  return `${(mps * 3.6).toFixed(1)}`;
};

/** Running pace reads better than km/h, so runs get min/km. */
export const formatPace = (value: number | string) => {
  const mps = asFiniteNumber(value);
  if (mps === null || mps <= 0) return "-";
  const secondsPerKm = 1000 / mps;
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  if (seconds === 60) return `${minutes + 1}:00`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const formatElevation = (value: number | string) => {
  const meters = asFiniteNumber(value);
  if (meters === null) return String(value);
  return `${Math.round(meters)}`;
};

export const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatRelative = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return formatDate(value);
};

export const formatCompactNumber = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
};

export const formatSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 0) return `${minutes} min`;
  if (minutes === 0) return `${rest} sec`;
  return `${minutes} min ${rest} sec`;
};

export const formatMeters = (meters: number) => {
  if (!Number.isFinite(meters) || meters <= 0) return "-";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
};
