import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { activityTypeLabel, normalizeActivityType } from "@/lib/activityType";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Both plan sources - Strava and file imports - are addressed by an id, so the
 * dialog works with string ids and each caller converts them back if needed.
 */
export interface PlanActivityOption {
  id: string;
  name: string;
  type: string;
  start_date: string;
}

const createPlanFormSchema = z
  .object({
    activityType: z.enum(["Run", "Ride"]),
    trainingType: z.enum(["Base", "Threshold", "VO2Max", "Recovery", "adaptive"]),
    activitySource: z.enum(["recent", "specific"]),
    lastActivitiesCount: z.coerce.number().int().optional(),
    selectedActivityIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.activitySource === "recent") {
      if (
        typeof data.lastActivitiesCount !== "number" ||
        data.lastActivitiesCount < 1 ||
        data.lastActivitiesCount > 20
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["lastActivitiesCount"],
          message: "Use a value from 1 to 20.",
        });
      }
    }

    if (data.activitySource === "specific" && data.selectedActivityIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedActivityIds"],
        message: "Choose at least one activity.",
      });
    }
  });

export type CreatePlanFormValues = z.infer<typeof createPlanFormSchema>;

/** Training focus values the coach prompt understands. */
export const trainingTypeApiMap: Record<
  CreatePlanFormValues["trainingType"],
  string
> = {
  adaptive: "adaptive",
  Base: "base",
  Threshold: "threshold",
  VO2Max: "vo2max",
  Recovery: "recovery",
};

const TRAINING_FOCUS_OPTIONS: {
  value: CreatePlanFormValues["trainingType"];
  label: string;
  hint: string;
}[] = [
  { value: "adaptive", label: "Adaptive", hint: "Let the coach decide" },
  { value: "Base", label: "Base", hint: "Aerobic volume" },
  { value: "Threshold", label: "Threshold", hint: "Sustained hard effort" },
  { value: "VO2Max", label: "VO2 Max", hint: "Short, very hard reps" },
  { value: "Recovery", label: "Recovery", hint: "Easy, restorative" },
];

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreatePlanFormValues) => Promise<void> | void;
  activities: PlanActivityOption[];
  isSubmitting: boolean;
  /**
   * Strava activities are already tagged Run/Ride, so the list is narrowed to the
   * selected sport. Imported files can carry any sport name, so they stay visible
   * and show their own sport label instead.
   */
  filterByActivityType?: boolean;
  noActivitiesHint?: string;
}

export function CreatePlanDialog({
  open,
  onOpenChange,
  onSubmit,
  activities,
  isSubmitting,
  filterByActivityType = true,
  noActivitiesHint = "No activities available for this sport yet. Sync Strava and try again.",
}: CreatePlanDialogProps) {
  const form = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanFormSchema),
    defaultValues: {
      activityType: "Run",
      trainingType: "adaptive",
      activitySource: "recent",
      lastActivitiesCount: 3,
      selectedActivityIds: [],
    },
  });

  const activityType = form.watch("activityType");
  const activitySource = form.watch("activitySource");

  const filteredActivities = activities
    .filter(
      (activity) =>
        !filterByActivityType || normalizeActivityType(activity.type) === activityType,
    )
    .slice(0, 30);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  useEffect(() => {
    if (activitySource === "recent") {
      form.setValue("selectedActivityIds", []);
      return;
    }

    const selectedActivityIds = form.getValues("selectedActivityIds");
    const validIds = selectedActivityIds.filter((id) =>
      filteredActivities.some((activity) => activity.id === id),
    );

    if (validIds.length !== selectedActivityIds.length) {
      form.setValue("selectedActivityIds", validIds);
    }
  }, [activitySource, activityType, filteredActivities, form]);

  const submitHandler = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create interval plan</DialogTitle>
          <DialogDescription>
            Pick a sport, a training focus and which sessions the coach should learn from.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submitHandler} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="activityType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Sport</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select sport" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Run">Run</SelectItem>
                          <SelectItem value="Ride">Bike</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trainingType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Training focus</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select training focus" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAINING_FOCUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className="flex items-baseline gap-2">
                                {option.label}
                                <span className="text-[11.5px] text-muted-foreground">
                                  {option.hint}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="activitySource"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Activity source</FormLabel>
                  <FormControl>
                    {/* Two mutually exclusive modes read better as a segmented
                        control than as a dropdown you have to open to compare. */}
                    <div
                      role="radiogroup"
                      className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-muted p-1"
                    >
                      {[
                        { value: "recent", label: "Last N activities" },
                        { value: "specific", label: "Specific activities" },
                      ].map((option) => {
                        const selected = field.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "h-8 rounded-md px-3 text-[13px] font-medium",
                              "transition-[background-color,color,transform] duration-[120ms] ease-out-quint active:scale-[0.98]",
                              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                              selected
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Base the plan on recent history, or on sessions you pick yourself.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/*
              Both branches render a FormField, so without distinct keys React reuses
              the same controller and hands over the previous field's value for one
              render - a number where the checkbox list expects an array of ids.
            */}
            {activitySource === "recent" ? (
              <FormField
                key="last-activities-count"
                control={form.control}
                name="lastActivitiesCount"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>How many of the last activities?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        step={1}
                        className="tnum w-full sm:w-40"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>Use a value from 1 to 20.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                key="selected-activities"
                control={form.control}
                name="selectedActivityIds"
                render={({ field }) => {
                  const selectedIds = Array.isArray(field.value) ? field.value : [];

                  return (
                    <FormItem className="space-y-2">
                      <FormLabel>Which activities should be used?</FormLabel>
                      <FormControl>
                        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface-muted p-1.5">
                          {filteredActivities.length === 0 && (
                            <p className="px-2.5 py-6 text-center text-[13px] text-muted-foreground">
                              {noActivitiesHint}
                            </p>
                          )}
                          {filteredActivities.map((activity) => {
                            const checked = selectedIds.includes(activity.id);

                            return (
                              <label
                                key={activity.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2",
                                  "transition-colors duration-[120ms] hover:bg-accent",
                                  checked && "bg-primary/8",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    if (isChecked === true) {
                                      field.onChange([...selectedIds, activity.id]);
                                      return;
                                    }
                                    field.onChange(
                                      selectedIds.filter((id) => id !== activity.id),
                                    );
                                  }}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] font-medium">
                                    {activity.name}
                                  </span>
                                  <span className="tnum block truncate text-[11.5px] text-muted-foreground">
                                    {formatDate(activity.start_date)}
                                    {filterByActivityType
                                      ? ""
                                      : ` · ${activityTypeLabel(activity.type)}`}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormDescription>
                        {filteredActivities.length > 0
                          ? selectedIds.length > 0
                            ? `${selectedIds.length} selected`
                            : "Select one or more sessions."
                          : noActivitiesHint}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating plan…" : "Create plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePlanDialog;
