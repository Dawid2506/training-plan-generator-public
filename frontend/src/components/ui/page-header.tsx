import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.ComponentProps<"div"> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-[13.5px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
