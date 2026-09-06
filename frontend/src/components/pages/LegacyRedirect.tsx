import { Navigate, useParams, useSearchParams } from "react-router-dom";

/** Old links used /main?tab=… - keep them working. */
const TAB_ROUTES: Record<string, string> = {
  "Chat AI": "/coach",
  Statistics: "/settings",
  Strava: "/strava",
  Activities: "/activities",
  OCR: "/settings",
  Profile: "/settings",
};

export function LegacyMainRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  return <Navigate to={(tab && TAB_ROUTES[tab]) || "/dashboard"} replace />;
}

export function LegacyPlanRedirect() {
  const { planId } = useParams<{ planId: string }>();
  return <Navigate to={planId ? `/plans/${planId}` : "/plans"} replace />;
}
