import { useEffect, useState } from "react";
import { SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notify";
import { cn } from "@/lib/utils";

/**
 * What the app knows about the athlete, rather than about their sessions.
 *
 * Without this the coach has to estimate a max HR from whatever a chest strap
 * happened to record, and it cannot reference a goal at all. Every field is
 * optional and saved as null when blank, so the form can be filled in over time
 * and the coach reports what is still missing instead of guessing.
 */

interface AthleteProfile {
  birthDate: string | null;
  sex: string | null;
  weightKg: number | null;
  heightCm: number | null;
  restingHr: number | null;
  maxHr: number | null;
  ftpWatts: number | null;
  thresholdPaceSecPerKm: number | null;
  experienceLevel: string | null;
  primaryGoal: string | null;
  targetEventName: string | null;
  targetEventDate: string | null;
  weeklyHours: number | null;
  weeklySessions: number | null;
  units: string;
}

type FormState = Record<string, string>;

const EMPTY: FormState = {
  birthDate: "",
  sex: "",
  weightKg: "",
  heightCm: "",
  restingHr: "",
  maxHr: "",
  ftpWatts: "",
  thresholdPace: "",
  experienceLevel: "",
  primaryGoal: "",
  targetEventName: "",
  targetEventDate: "",
  weeklyHours: "",
  weeklySessions: "",
  units: "METRIC",
};

const SEX_OPTIONS = ["MALE", "FEMALE", "OTHER"];
const LEVEL_OPTIONS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"];

/** Threshold pace is stored as seconds but read and written as mm:ss. */
const paceToSeconds = (value: string): number | null => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const secondsToPace = (seconds: number | null): string => {
  if (!seconds) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const numberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const textOrNull = (value: string): string | null => value.trim() || null;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12.5px] font-medium">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "flex h-9 w-full rounded-lg border border-input bg-surface-muted px-3 text-sm",
        "text-foreground transition-[border-color,box-shadow] duration-[160ms] ease-out-quint outline-none",
        "hover:border-border-strong focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option.charAt(0) + option.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}

export function AthleteProfileCard() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { notify } = useNotifications();

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.endpoints.user.profile), {
          credentials: "include",
        });
        if (!response.ok) return;

        const { profile } = (await response.json()) as { profile: AthleteProfile | null };
        if (!profile) return;

        setForm({
          birthDate: profile.birthDate?.slice(0, 10) ?? "",
          sex: profile.sex ?? "",
          weightKg: profile.weightKg?.toString() ?? "",
          heightCm: profile.heightCm?.toString() ?? "",
          restingHr: profile.restingHr?.toString() ?? "",
          maxHr: profile.maxHr?.toString() ?? "",
          ftpWatts: profile.ftpWatts?.toString() ?? "",
          thresholdPace: secondsToPace(profile.thresholdPaceSecPerKm),
          experienceLevel: profile.experienceLevel ?? "",
          primaryGoal: profile.primaryGoal ?? "",
          targetEventName: profile.targetEventName ?? "",
          targetEventDate: profile.targetEventDate?.slice(0, 10) ?? "",
          weeklyHours: profile.weeklyHours?.toString() ?? "",
          weeklySessions: profile.weeklySessions?.toString() ?? "",
          units: profile.units ?? "METRIC",
        });
      } catch (error) {
        console.error("Error loading athlete profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.user.profile), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          birthDate: textOrNull(form.birthDate),
          sex: textOrNull(form.sex),
          weightKg: numberOrNull(form.weightKg),
          heightCm: numberOrNull(form.heightCm),
          restingHr: numberOrNull(form.restingHr),
          maxHr: numberOrNull(form.maxHr),
          ftpWatts: numberOrNull(form.ftpWatts),
          thresholdPaceSecPerKm: paceToSeconds(form.thresholdPace),
          experienceLevel: textOrNull(form.experienceLevel),
          primaryGoal: textOrNull(form.primaryGoal),
          targetEventName: textOrNull(form.targetEventName),
          targetEventDate: textOrNull(form.targetEventDate),
          weeklyHours: numberOrNull(form.weeklyHours),
          weeklySessions: numberOrNull(form.weeklySessions),
          units: form.units || "METRIC",
        }),
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        // The backend validates ranges, so surface its message rather than a
        // generic failure - "Max HR must be at most 230" is actionable.
        throw new Error(problem.issues?.[0]?.message ?? problem.message ?? "Save failed");
      }

      notify("Profile saved.", "Success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      notify(`Cannot save profile: ${message}`, "Error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="soft-enter">
      <CardHeader>
        <CardTitle>Athlete profile</CardTitle>
        <CardDescription>
          What the coach knows about you. Everything is optional, but the more you fill
          in, the less it has to estimate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-8">
          <Group title="Basics">
            <Field label="Date of birth">
              <Input
                type="date"
                value={form.birthDate}
                onChange={(event) => set("birthDate", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Sex">
              <Select
                value={form.sex}
                onChange={(value) => set("sex", value)}
                options={SEX_OPTIONS}
                placeholder="Not set"
              />
            </Field>
            <Field label="Weight (kg)">
              <Input
                type="number"
                step="0.1"
                value={form.weightKg}
                onChange={(event) => set("weightKg", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Height (cm)">
              <Input
                type="number"
                value={form.heightCm}
                onChange={(event) => set("heightCm", event.target.value)}
                disabled={isLoading}
              />
            </Field>
          </Group>

          <Group title="Physiology">
            <Field label="Resting HR" hint="Lets the coach use heart-rate reserve.">
              <Input
                type="number"
                value={form.restingHr}
                onChange={(event) => set("restingHr", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Max HR" hint="Without this, zones are only estimated.">
              <Input
                type="number"
                value={form.maxHr}
                onChange={(event) => set("maxHr", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="FTP (watts)">
              <Input
                type="number"
                value={form.ftpWatts}
                onChange={(event) => set("ftpWatts", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Threshold pace" hint="mm:ss per km, e.g. 4:05">
              <Input
                value={form.thresholdPace}
                placeholder="4:05"
                onChange={(event) => set("thresholdPace", event.target.value)}
                disabled={isLoading}
              />
            </Field>
          </Group>

          <Group title="Training">
            <Field label="Experience">
              <Select
                value={form.experienceLevel}
                onChange={(value) => set("experienceLevel", value)}
                options={LEVEL_OPTIONS}
                placeholder="Not set"
              />
            </Field>
            <Field label="Hours per week">
              <Input
                type="number"
                step="0.5"
                value={form.weeklyHours}
                onChange={(event) => set("weeklyHours", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Sessions per week">
              <Input
                type="number"
                value={form.weeklySessions}
                onChange={(event) => set("weeklySessions", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Units">
              <Select
                value={form.units}
                onChange={(value) => set("units", value)}
                options={["METRIC", "IMPERIAL"]}
                placeholder="Metric"
              />
            </Field>
          </Group>

          <Group title="Goal">
            <Field label="Primary goal">
              <Input
                value={form.primaryGoal}
                placeholder="Sub-3 marathon"
                maxLength={200}
                onChange={(event) => set("primaryGoal", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Target event">
              <Input
                value={form.targetEventName}
                placeholder="Berlin Marathon"
                maxLength={80}
                onChange={(event) => set("targetEventName", event.target.value)}
                disabled={isLoading}
              />
            </Field>
            <Field label="Event date">
              <Input
                type="date"
                value={form.targetEventDate}
                onChange={(event) => set("targetEventDate", event.target.value)}
                disabled={isLoading}
              />
            </Field>
          </Group>

          <Button type="submit" variant="primary" disabled={isLoading || isSaving}>
            <SaveIcon />
            {isSaving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
