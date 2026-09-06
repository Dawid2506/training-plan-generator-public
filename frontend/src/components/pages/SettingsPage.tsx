import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileTextIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  RefreshCwIcon,
  SunIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { UsageChart, type UsagePoint } from "@/components/settings/UsageChart";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notify";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

function AppearanceCard() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          System follows your device setting. Anything else sticks until you change it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid max-w-md grid-cols-3 gap-1 rounded-lg border border-border bg-surface-muted p-1"
        >
          {THEME_OPTIONS.map((option) => {
            const selected = theme === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-md text-[13px] font-medium",
                  "transition-[background-color,color,transform] duration-[120ms] ease-out-quint active:scale-[0.98]",
                  "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function UsageCard() {
  const [chartData24h, setChartData24h] = useState<UsagePoint[]>([]);
  const [chartData30d, setChartData30d] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotifications();

  const loadUsage = useCallback(async () => {
    try {
      setLoading(true);

      const [response24h, response30d] = await Promise.all([
        fetch(buildApiUrl(API_CONFIG.endpoints.tokens.myUsageChart24h()), {
          credentials: "include",
        }),
        fetch(buildApiUrl(API_CONFIG.endpoints.tokens.myUsageChart(30)), {
          credentials: "include",
        }),
      ]);

      if (!response24h.ok || !response30d.ok) {
        throw new Error("Failed to fetch statistics");
      }

      setChartData24h((await response24h.json()).data ?? []);
      setChartData30d((await response30d.json()).data ?? []);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      notify("Cannot load usage statistics right now.", "Error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token usage</CardTitle>
        <CardDescription>How much the AI coach has been working for you.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={loadUsage} disabled={loading}>
            <RefreshCwIcon className={cn(loading && "animate-spin")} />
            Refresh
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-8 pt-0 xl:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            Last 24 hours
          </p>
          <UsageChart data={chartData24h} xKey="hour" isLoading={loading} />
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            Last 30 days
          </p>
          <UsageChart data={chartData30d} xKey="date" isLoading={loading} />
        </div>
      </CardContent>
    </Card>
  );
}

function OcrCard() {
  const { notify } = useNotifications();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = () => {
    if (!selectedFile) {
      notify("Select a PDF file first.", "Info");
      return;
    }

    setLoading(true);
    // TODO: wire up the OCR endpoint once the backend exposes it.
    window.setTimeout(() => {
      setLoading(false);
      notify("PDF recognition is not wired up yet.", "Info");
    }, 800);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          PDF recognition
          <Badge variant="warning">Preview</Badge>
        </CardTitle>
        <CardDescription>
          Upload a training PDF and pull the text out of it. Not connected to the backend yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor="pdf-upload"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-muted/40 px-6 py-8 text-center transition-[border-color,background-color] duration-[160ms] ease-out-quint hover:border-primary/50 hover:bg-surface-muted"
        >
          <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
            <FileTextIcon className="size-5" />
          </span>
          <span className="text-[13.5px] font-medium">Choose a PDF file</span>
          <input
            ref={inputRef}
            id="pdf-upload"
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setExtractedText("");
            }}
          />
        </label>

        {selectedFile && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
            <FileTextIcon className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-[13px]">
              {selectedFile.name}
            </span>
            <Button variant="primary" size="sm" onClick={handleUpload} disabled={loading}>
              <UploadIcon />
              {loading ? "Processing…" : "Extract text"}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear selected PDF"
              onClick={() => {
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <XIcon />
            </Button>
          </div>
        )}

        <div className="max-h-72 min-h-32 overflow-y-auto rounded-lg border border-border bg-surface-muted/40 p-4">
          {extractedText ? (
            <pre className="font-mono text-[12.5px] whitespace-pre-wrap">
              {extractedText}
            </pre>
          ) : (
            <p className="py-8 text-center text-[13px] text-muted-foreground">
              Extracted text will appear here.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your account, how the app looks, and what it has been using."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={user?.username} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold tracking-[-0.01em]">
                {user?.username ?? "-"}
              </p>
              <p className="truncate text-[13px] text-muted-foreground">
                {user?.email ?? "-"}
              </p>
              <Badge variant="muted" className="mt-2">
                {user?.role ?? "user"}
              </Badge>
            </div>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            <LogOutIcon />
            Log out
          </Button>
        </CardContent>
      </Card>

      <AppearanceCard />
      <UsageCard />
      <OcrCard />
    </div>
  );
}
