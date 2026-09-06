import { useEffect } from "react";
import { createPortal } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

    if (
      data.activitySource === "specific" &&
      data.selectedActivityIds.length === 0
    ) {
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

const formatActivityDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

const CreatePlanDialog: React.FC<CreatePlanDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  activities,
  isSubmitting,
  filterByActivityType = true,
  noActivitiesHint = "No activities available for this sport yet. Sync Strava and try again.",
}) => {
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
        !filterByActivityType ||
        normalizeActivityType(activity.type) === activityType,
    )
    .slice(0, 30);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isSubmitting, onOpenChange, open]);

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

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-1000 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close create plan dialog"
        onClick={() => {
          if (!isSubmitting) {
            onOpenChange(false);
          }
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-plan-title"
        className="relative z-1001 w-full max-w-2xl rounded-xl border border-third bg-card p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-plan-title" className="text-2xl font-semibold text-white">
              Create interval plan
            </h2>
            <p className="mt-1 text-sm text-gray-300">
              Pick sport, training focus and which activities should be used.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Close
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={submitHandler} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="activityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full transition-colors hover:bg-input/30">
                          <SelectValue placeholder="Select activity type" />
                        </SelectTrigger>
                        <SelectContent className="z-1200">
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
                  <FormItem>
                    <FormLabel>Training focus</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full transition-colors hover:bg-input/30">
                          <SelectValue placeholder="Select training focus" />
                        </SelectTrigger>
                        <SelectContent className="z-1200">
                          <SelectItem value="adaptive">Adaptive</SelectItem>
                          <SelectItem value="Base">Base</SelectItem>
                          <SelectItem value="Threshold">Threshold</SelectItem>
                          <SelectItem value="VO2Max">VO2Max</SelectItem>
                          <SelectItem value="Recovery">Recovery</SelectItem>
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
                <FormItem>
                  <FormLabel>Activity source</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full transition-colors hover:bg-input/30 md:w-[24rem]">
                        <SelectValue placeholder="Select source mode" />
                      </SelectTrigger>
                      <SelectContent className="z-1200">
                        <SelectItem value="recent">Use last N activities</SelectItem>
                        <SelectItem value="specific">Use specific activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Choose whether the plan should be based on recent history or a selected workout.
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
                  <FormItem>
                    <FormLabel>How many last activities should be used?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        step={1}
                        className="w-full md:w-56"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Use a value from 1 to 20.
                    </FormDescription>
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
                    <FormItem>
                      <FormLabel>Which activities should be used?</FormLabel>
                      <FormControl>
                        <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-third/80 bg-second/20 p-3">
                          {filteredActivities.map((activity) => {
                            const activityId = activity.id;
                            const checked = selectedIds.includes(activityId);

                            return (
                              <label
                                key={activity.id}
                                className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2.5 transition-all hover:border-border hover:bg-input/25"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    if (isChecked === true) {
                                      field.onChange([...selectedIds, activityId]);
                                      return;
                                    }

                                    field.onChange(
                                      selectedIds.filter((id) => id !== activityId),
                                    );
                                  }}
                                />
                                <span className="text-sm leading-5 text-white">
                                  <span className="font-medium">{activity.name}</span>{" "}
                                  <span className="text-gray-300">
                                    ({formatActivityDate(activity.start_date)}
                                    {filterByActivityType
                                      ? ""
                                      : `, ${activityTypeLabel(activity.type)}`}
                                    )
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
                            ? `Selected activities: ${selectedIds.length}`
                            : "Select one or more activities matching selected sport."
                          : noActivitiesHint}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="secondary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create plan"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>,
    document.body,
  );
};

export default CreatePlanDialog;