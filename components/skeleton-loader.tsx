import { cn } from "@/lib/utils";

export const SkeletonLoader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-secondary", className)}
      {...props}
    />
  );
};

/**
 * These mirror the real cards' structure (same padding, same blocks in the same
 * places), so content lands where the placeholder was instead of the layout
 * jumping when the query resolves.
 */
export const ElectionCardSkeleton = () => {
  return (
    <div
      className="flex h-full flex-col rounded-sm border border-border bg-card p-5"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <SkeletonLoader className="h-[18px] w-20 rounded-full" />
        <SkeletonLoader className="size-10 shrink-0" />
      </div>
      <div className="my-4 flex flex-col gap-2">
        <SkeletonLoader className="h-6 w-3/4" />
        <SkeletonLoader className="h-6 w-1/2" />
      </div>
      <div className="mt-auto flex items-center gap-3">
        <SkeletonLoader className="h-4 w-20" />
        <SkeletonLoader className="h-4 w-24" />
      </div>
    </div>
  );
};

export const CandidateCardSkeleton = () => {
  return (
    <div
      className="overflow-hidden rounded-sm border border-border bg-card"
      aria-hidden="true"
    >
      <SkeletonLoader className="aspect-4/5 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <SkeletonLoader className="h-5 w-3/4" />
        <SkeletonLoader className="h-3 w-full" />
      </div>
    </div>
  );
};
