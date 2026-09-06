import type { ComponentType } from "react";
import {
  BookmarkIcon,
  LayoutDashboardIcon,
  RouteIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react";
import { SiStrava } from "react-icons/si";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Title shown in the top bar and used for the document title. */
  title: string;
  description?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Home",
    icon: LayoutDashboardIcon,
    title: "Home",
    description: "Where your training stands right now.",
  },
  {
    to: "/coach",
    label: "Coach",
    icon: SparklesIcon,
    title: "Coach",
    description: "Ask the AI coach about your training.",
  },
  {
    to: "/activities",
    label: "Activities",
    icon: BookmarkIcon,
    title: "Activities",
    description: "Saved sessions and imported FIT files.",
  },
  {
    to: "/plans",
    label: "Plans",
    icon: RouteIcon,
    title: "Interval plans",
    description: "Every plan the coach has generated for you.",
  },
  {
    to: "/strava",
    label: "Strava",
    icon: SiStrava,
    title: "Strava",
    description: "Connection status and your latest Strava activities.",
  },
];

export const SETTINGS_ITEM: NavItem = {
  to: "/settings",
  label: "Settings",
  icon: SettingsIcon,
  title: "Settings",
  description: "Profile, appearance, usage and tools.",
};

export const ALL_NAV_ITEMS = [...NAV_ITEMS, SETTINGS_ITEM];
