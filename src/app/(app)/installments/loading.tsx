import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-11 w-64" />
      <Skeleton className="h-[84px] rounded-xl" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[110px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
