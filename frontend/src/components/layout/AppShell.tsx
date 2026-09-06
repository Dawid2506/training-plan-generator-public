import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

import { ALL_NAV_ITEMS } from "./nav-items";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const COLLAPSE_KEY = "dt-sidebar-collapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* storage can be unavailable - the choice still applies this session */
      }
      return next;
    });
  }, []);

  // Navigating closes the mobile drawer and retitles the tab.
  useEffect(() => {
    setMobileOpen(false);

    const active = ALL_NAV_ITEMS.find(
      (item) =>
        location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    );
    document.title = active ? `${active.title} · ${APP_NAME}` : APP_NAME;
  }, [location.pathname]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            "flex min-h-screen flex-col transition-[padding] duration-200 ease-out-quint",
            collapsed ? "lg:pl-[60px]" : "lg:pl-[232px]",
          )}
        >
          <TopBar onOpenMobileNav={() => setMobileOpen(true)} />

          <main className="flex-1">
            {/*
              Keyed on the path so each section fades in on its own. Opacity only:
              sections get switched dozens of times a day and any movement would
              read as lag.
            */}
            <div
              key={location.pathname}
              className="mx-auto w-full max-w-[1400px] animate-enter-fade px-4 py-6 sm:px-6 sm:py-8"
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
