import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  RouteIcon,
} from "lucide-react";
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SportBadge } from "@/components/ui/sport-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_CONFIG, buildApiUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useNotifications } from "@/lib/notify";
import { cn } from "@/lib/utils";

export type IntervalPlanRow = {
  id: string;
  title: string;
  sport: string;
  category: string;
  difficulty: number;
  durationMin: number;
  createdAt: string;
};

type IntervalPlanApiItem = {
  id: string;
  plan?: {
    workout_header?: {
      title?: string;
      sport?: string;
      category?: string;
      difficulty_score?: number;
      estimated_total_duration_min?: number;
    };
  };
  createdAt?: string;
};

export const mapIntervalPlans = (payload: unknown): IntervalPlanRow[] => {
  const items: IntervalPlanApiItem[] = Array.isArray(
    (payload as { data?: { items?: unknown } })?.data?.items,
  )
    ? ((payload as { data: { items: IntervalPlanApiItem[] } }).data.items)
    : [];

  return items.map((item) => {
    const header = item.plan?.workout_header;
    return {
      id: item.id,
      title: header?.title ?? "Untitled plan",
      sport: header?.sport ?? "-",
      category: header?.category ?? "-",
      difficulty: header?.difficulty_score ?? 0,
      durationMin: header?.estimated_total_duration_min ?? 0,
      createdAt: item.createdAt ?? "",
    };
  });
};

/** 1-10 difficulty as a small five-segment meter - faster to scan than a digit. */
function DifficultyMeter({ score }: { score: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(score / 2)));
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-3.5 w-[3px] rounded-full",
              index < filled ? "bg-primary" : "bg-border-strong",
            )}
          />
        ))}
      </div>
      <span className="tnum text-[12.5px] text-muted-foreground">{score}/10</span>
    </div>
  );
}

const columns: ColumnDef<IntervalPlanRow>[] = [
  {
    header: "Plan",
    accessorKey: "title",
    cell: ({ row }) => (
      <div className="max-w-[22rem] truncate font-medium">{row.getValue("title")}</div>
    ),
  },
  {
    header: "Sport",
    accessorKey: "sport",
    cell: ({ row }) => <SportBadge type={row.getValue("sport")} />,
  },
  {
    header: "Category",
    accessorKey: "category",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("category")}</span>
    ),
  },
  {
    header: "Difficulty",
    accessorKey: "difficulty",
    cell: ({ row }) => <DifficultyMeter score={row.getValue("difficulty")} />,
  },
  {
    header: "Duration",
    accessorKey: "durationMin",
    cell: ({ row }) => (
      <span className="tnum">
        {row.getValue("durationMin")}
        <span className="ml-1 text-muted-foreground">min</span>
      </span>
    ),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    cell: ({ row }) => (
      <span className="tnum text-muted-foreground">
        {formatDate(row.getValue("createdAt"))}
      </span>
    ),
  },
];

interface IntervalPlansTableProps {
  refreshKey?: number;
}

export function IntervalPlansTable({ refreshKey = 0 }: IntervalPlansTableProps) {
  const id = useId();
  const navigate = useNavigate();
  const { notify } = useNotifications();

  const [data, setData] = useState<IntervalPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  useEffect(() => {
    let cancelled = false;

    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          buildApiUrl(API_CONFIG.endpoints.intervalPlans.paginated({ page: 1, limit: 10 })),
          { credentials: API_CONFIG.defaultOptions.credentials },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch interval plans");
        }

        const payload = await response.json();
        if (!cancelled) setData(mapIntervalPlans(payload));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (!cancelled) notify(`Cannot load interval plans: ${message}`, "Error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchPlans();
    return () => {
      cancelled = true;
    };
  }, [notify, refreshKey]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: { sorting, pagination },
  });

  const rangeLabel = useMemo(() => {
    const total = table.getRowCount();
    if (total === 0) return "0 plans";
    const start = pagination.pageIndex * pagination.pageSize + 1;
    const end = Math.min(start + pagination.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  }, [pagination.pageIndex, pagination.pageSize, table]);

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<RouteIcon />}
        title="No interval plans yet"
        description="Generate one from your saved activities or straight from Strava, and it will show up here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-surface-muted/50 hover:bg-surface-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1.5 rounded-sm uppercase transition-colors duration-[120ms] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUpIcon className="size-3.5 shrink-0 text-primary" />,
                          desc: <ChevronDownIcon className="size-3.5 shrink-0 text-primary" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ChevronDownIcon className="size-3.5 shrink-0 opacity-0" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
                <TableHead className="w-0" />
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => navigate(`/plans/${row.original.id}`)}
                className="cursor-pointer bg-card"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell className="pr-3 text-right">
                  <ChevronRightIcon className="inline size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Label htmlFor={id} className="text-muted-foreground max-sm:sr-only">
            Rows
          </Label>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger id={id} size="sm" className="w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="tnum text-[12.5px] text-muted-foreground" aria-live="polite">
          {rangeLabel}
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <ChevronFirstIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            <ChevronLastIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IntervalPlansTable;
