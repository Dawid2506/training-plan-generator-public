import { cn } from "@/lib/utils";

const initialsOf = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

interface AvatarProps extends React.ComponentProps<"span"> {
  name?: string;
  size?: "sm" | "default" | "lg";
}

function Avatar({ name, size = "default", className, ...props }: AvatarProps) {
  return (
    <span
      data-slot="avatar"
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-muted font-medium tracking-[0.02em] text-foreground",
        size === "sm" && "size-7 text-[11px]",
        size === "default" && "size-9 text-[12.5px]",
        size === "lg" && "size-14 text-[17px]",
        className,
      )}
      {...props}
    >
      {initialsOf(name)}
    </span>
  );
}

export { Avatar };
