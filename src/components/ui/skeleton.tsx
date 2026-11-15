import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg motion-reduce:animate-none bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
