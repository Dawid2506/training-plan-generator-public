import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  BookmarkIcon,
  RouteIcon,
  SparklesIcon,
  UploadCloudIcon,
  ZapIcon,
} from "lucide-react";
import { SiStrava } from "react-icons/si";

import { ActivityCard } from "@/components/activities/ActivityCard";
import { mapIntervalPlans, type IntervalPlanRow } from "@/components/plans/IntervalPlansTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SportBadge } from "@/components/ui/sport-badge";
import { useAuth } from "@/contexts/AuthContext";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { formatCompactNumber, formatDate, formatRelative } from "@/lib/format";
import { normalizeSavedActivitiesPayload } from "@/lib/stravaActivityParser";
import { cn } from "@/lib/utils";
import type { SavedActivity, StravaStatus } from "@/types/strava";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

interface SummaryTileProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  to: string;
  accent?: boolean;
}

function SummaryTile({ label, value, hint, icon, to, accent }: SummaryTileProps) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-5 transition-[border-color,background-color,transform] duration-[160ms] ease-out-quint hover:border-border-strong active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border [&_svg]:size-4",
            accent
              ? "border-primary/25 bg-primary/12 text-primary"
              : "border-border bg-surface-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <ArrowRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity duration-[160ms] group-hover:opacity-100" />
      </div>
      <p className="tnum mt-4 text-[26px] leading-none font-semibold tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-2 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
      {hint && <p className="mt-1 truncate text-[12px] text-muted-foreground">{hint}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [savedActivities, setSavedActivities] = useState<SavedActivity[]>([]);
  const [plans, setPlans] = useState<IntervalPlanRow[]>([]);
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [tokens24h, setTokens24h] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const request = (url: string) =>
        fetch(buildApiUrl(url), { credentials: "include" })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null);

      const [activitiesPayload, plansPayload, statusPayload, usagePayload] =
        await Promise.all([
          request(API_CONFIG.endpoints.user.activities),
          request(API_CONFIG.endpoints.intervalPlans.paginated({ page: 1, limit: 100 })),
          request(API_CONFIG.endpoints.strava.status),
          request(API_CONFIG.endpoints.tokens.myUsageChart24h()),
        ]);

      if (cancelled) return;

      setSavedActivities(normalizeSavedActivitiesPayload(activitiesPayload));
      setPlans(mapIntervalPlans(plansPayload));
      setStravaStatus(statusPayload as StravaStatus | null);

      const usageRows: { totalTokens?: number }[] = Array.isArray(usagePayload?.data)
        ? usagePayload.data
        : [];
      setTokens24h(
        usageRows.reduce((total, row) => total + (Number(row.totalTokens) || 0), 0),
      );

      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const latestActivity = useMemo(() => {
    return [...savedActivities].sort((a, b) => {
      const aTime = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const bTime = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return bTime - aTime;
    })[0];
  }, [savedActivities]);

  const recentPlans = useMemo(
    () =>
      [...plans]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 4),
    [plans],
  );

  const isConnected = Boolean(stravaStatus?.authorized);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${user?.username ? `, ${user.username}` : ""}`}
        description="Where your training stands right now."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/activities">
                <UploadCloudIcon />
                Import FIT
              </Link>
            </Button>
            <Button variant="primary" asChild>
              <Link to="/coach">
                <SparklesIcon />
                Ask the coach
              </Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[9.5rem] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            to="/activities"
            icon={<BookmarkIcon />}
            label="Saved sessions"
            value={savedActivities.length}
            hint={
              latestActivity
                ? `Last ${formatRelative(latestActivity.savedAt) || "recently"}`
                : "Nothing saved yet"
            }
          />
          <SummaryTile
            to="/plans"
            icon={<RouteIcon />}
            label="Interval plans"
            value={plans.length}
            accent
            hint={
              recentPlans[0]
                ? `Newest ${formatDate(recentPlans[0].createdAt)}`
                : "None generated yet"
            }
          />
          <SummaryTile
            to="/strava"
            icon={<SiStrava />}
            label="Strava"
            value={isConnected ? "Linked" : "Off"}
            hint={stravaStatus?.message ?? "Connection unknown"}
          />
          <SummaryTile
            to="/settings"
            icon={<ZapIcon />}
            label="Tokens · 24h"
            value={tokens24h === null ? "-" : formatCompactNumber(tokens24h)}
            hint="AI coach usage"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
              Latest session
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/activities">
                All activities
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-[9.5rem] w-full rounded-xl" />
          ) : latestActivity ? (
            <ActivityCard
              activity={latestActivity.activity}
              eyebrow={`Saved ${formatRelative(latestActivity.savedAt) || "recently"}`}
            />
          ) : (
            <Card>
              <EmptyState
                icon={<BookmarkIcon />}
                title="No sessions yet"
                description="Connect Strava or import a FIT file to give the coach something to work with."
                action={
                  <Button variant="primary" asChild>
                    <Link to={isConnected ? "/activities" : "/strava"}>
                      {isConnected ? "Import a FIT file" : "Connect Strava"}
                    </Link>
                  </Button>
                }
              />
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Recent plans</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/plans">
                All plans
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>

          <Card className="gap-0 overflow-hidden p-0">
            {isLoading ? (
              <CardContent className="space-y-2.5 p-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </CardContent>
            ) : recentPlans.length === 0 ? (
              <EmptyState
                icon={<RouteIcon />}
                title="No plans yet"
                description="Generate one from Strava or from your imported files."
              />
            ) : (
              <div className="divide-y divide-border">
                {recentPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    to={`/plans/${plan.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-[120ms] first:rounded-t-xl last:rounded-b-xl hover:bg-surface-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{plan.title}</p>
                      <p className="tnum mt-0.5 text-[11.5px] text-muted-foreground">
                        {plan.durationMin} min · difficulty {plan.difficulty}/10 ·{" "}
                        {formatDate(plan.createdAt)}
                      </p>
                    </div>
                    <SportBadge type={plan.sport} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {!isConnected && !isLoading && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium">Strava is not connected</p>
                  <p className="text-[12.5px] text-muted-foreground">
                    Link it to pull rides and runs automatically.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/strava">
                    <SiStrava className="size-4" />
                    Connect
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
