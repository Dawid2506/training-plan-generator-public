import { ChevronsLeftIcon, LogOutIcon, SettingsIcon, XIcon } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav-items";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile only - the sidebar renders as a slide-over. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

// Labels arrive once the rail has finished widening, so nothing is read
// mid-slide. Fade only - the text is already in its final position.
const LABEL_ENTER = "animate-enter-fade";
const LABEL_ENTER_STYLE: React.CSSProperties = { animationDelay: "120ms" };

const Mark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={cn("size-7 shrink-0", className)} aria-hidden="true">
    <rect width="32" height="32" rx="8" className="fill-primary/12" />
    <path
      d="M6 22.5 12.5 12l4.5 6 3-4 6 8.5"
      fill="none"
      stroke="currentColor"
      className="text-primary"
      strokeWidth="2.4"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <circle cx="23" cy="9.5" r="2.6" className="fill-primary" />
  </svg>
);

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium",
          // Sections are switched dozens of times a day, so the state change is
          // instant - only colour eases, never position.
          "transition-[background-color,color] duration-[120ms]",
          "active:scale-[0.985]",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
          collapsed && "justify-center px-0",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1/2 left-0 h-4 w-[2.5px] -translate-y-1/2 rounded-r-full bg-primary",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          <Icon
            className={cn(
              "size-[17px] shrink-0",
              isActive ? "text-primary" : "text-current",
            )}
          />
          {!collapsed && (
            <span className={cn("truncate", LABEL_ENTER)} style={LABEL_ENTER_STYLE}>
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={onCloseMobile}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ease-out-quint lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar",
          "transition-[width,transform] duration-200 ease-out-quint",
          collapsed ? "w-[60px]" : "w-[232px]",
          // Off-canvas on mobile; percentage translate adapts to whatever width it has.
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3",
            collapsed && "justify-center px-0",
          )}
        >
          <Mark />
          {!collapsed && (
            <span
              className={cn(
                "truncate text-[14.5px] font-semibold tracking-[-0.01em]",
                LABEL_ENTER,
              )}
              style={LABEL_ENTER_STYLE}
            >
              {APP_NAME}
            </span>
          )}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-[120ms] hover:bg-accent hover:text-foreground lg:hidden"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => (
            <NavRow key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-2">
          <NavRow item={SETTINGS_ITEM} collapsed={collapsed} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left",
                  "transition-[background-color,transform] duration-[120ms] ease-out-quint",
                  "hover:bg-sidebar-accent active:scale-[0.985]",
                  "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  collapsed && "justify-center",
                )}
              >
                <Avatar name={user?.username} size="sm" />
                {!collapsed && (
                  <span className={cn("min-w-0 flex-1", LABEL_ENTER)} style={LABEL_ENTER_STYLE}>
                    <span className="block truncate text-[13px] font-medium">
                      {user?.username ?? "Account"}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {user?.email ?? ""}
                    </span>
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>{user?.role ?? "Signed in"}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => navigate("/settings")}>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden h-8 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] text-muted-foreground lg:flex",
              "transition-[background-color,color,transform] duration-[120ms] ease-out-quint",
              "hover:bg-sidebar-accent hover:text-foreground active:scale-[0.985]",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronsLeftIcon
              className={cn(
                "size-4 shrink-0 transition-transform duration-200 ease-out-quint",
                collapsed && "rotate-180",
              )}
            />
            {!collapsed && (
              <span className={LABEL_ENTER} style={LABEL_ENTER_STYLE}>
                Collapse
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
