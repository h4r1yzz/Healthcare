import { cn } from "@/lib/utils"

type Props = {
  color?: "green" | "red" | "yellow" | "gray"
  label?: string
  className?: string
}

export default function StatusDot({ color = "gray", label, className }: Props) {
  const colorClass =
    color === "green"
      ? "bg-emerald-500"
      : color === "red"
      ? "bg-red-500"
      : color === "yellow"
      ? "bg-amber-400"
      : "bg-muted-foreground/40"

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("h-3 w-3 rounded-full", colorClass)} />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  )
}


