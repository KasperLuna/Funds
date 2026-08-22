import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "destructive" | "outline";
type Size = "sm" | "default" | "lg";

const variantCls: Record<Variant, string> = {
  primary: "bg-(--accent) text-(--accent-foreground) hover:opacity-90",
  ghost: "bg-transparent text-inherit hover:bg-(--surface-2)",
  destructive: "bg-(--danger) text-white hover:opacity-90",
  outline: "bg-transparent border border-(--border) hover:bg-(--surface-2)",
};

const sizeCls: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-(--radius-sm)",
  default: "h-11 px-4 text-sm rounded-(--radius-md)",
  lg: "h-12 px-6 text-base rounded-(--radius-md)",
};

export function Button({
  variant = "primary",
  size = "default",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export type { Variant as ButtonVariant, Size as ButtonSize };
export type ButtonProps = ComponentProps<typeof Button>;