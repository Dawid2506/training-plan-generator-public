import { Link } from "react-router-dom";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const Mark = () => (
  <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="grid min-h-screen bg-background lg:grid-cols-2">
        {/* Form side */}
        <div className="flex flex-col px-6 py-8 sm:px-10">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <Mark />
              <span className="text-[15px] font-semibold tracking-[-0.01em]">
                {APP_NAME}
              </span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-sm animate-rise">{children}</div>
          </div>

          <p className="text-center text-[12px] text-muted-foreground">
            {APP_TAGLINE}
          </p>
        </div>

        {/* Visual side */}
        <div className="relative hidden overflow-hidden lg:block">
          <img
            src="/images/adventure-begins.avif"
            alt=""
            className="absolute inset-0 size-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-10">
            <p className="max-w-md text-[26px] leading-tight font-semibold tracking-[-0.02em] text-white">
              Your last ten sessions, turned into the next one.
            </p>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-white/70">
              Import from Strava or a FIT file, and the coach writes the intervals -
              warm-up, work, recovery, cool-down.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
