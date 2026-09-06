import { useEffect, useState } from "react";
import { MenuIcon } from "lucide-react";
import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

import { ALL_NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  // The page already carries its own heading. The bar only repeats it once that
  // heading has scrolled away, so the two are never on screen at the same time.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 44);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  const active = ALL_NAV_ITEMS.find(
    (item) =>
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );
  const title = active?.title ?? "Plan details";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="-ml-1 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color,transform] duration-[120ms] ease-out-quint hover:bg-accent hover:text-foreground active:scale-[0.94] lg:hidden"
      >
        <MenuIcon className="size-[18px]" />
      </button>

      <p
        className={cn(
          "min-w-0 flex-1 truncate text-[14.5px] font-semibold tracking-[-0.01em]",
          "transition-opacity duration-150 ease-out-quint",
          isScrolled ? "opacity-100" : "opacity-100 lg:opacity-0",
        )}
      >
        {title}
      </p>

      <ThemeToggle />
    </header>
  );
}
