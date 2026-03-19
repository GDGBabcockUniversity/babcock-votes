import { cn } from "@/lib/utils";

export const SkeletonLoader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-secondary", className)}
      {...props}
    />
  );
};

export const ElectionCardSkeleton = () => {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <SkeletonLoader className="h-5 w-24 rounded-full" />
        <SkeletonLoader className="h-4 w-16" />
      </div>
      <div>
        <SkeletonLoader className="h-6 w-3/4 mb-2" />
        <SkeletonLoader className="h-4 w-1/2" />
      </div>
    </div>
  );
};

export const CandidateCardSkeleton = () => {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-white p-4 text-center">
      <SkeletonLoader className="size-20 rounded-full mb-3" />
      <SkeletonLoader className="h-5 w-3/4 mb-1" />
      <SkeletonLoader className="h-3 w-1/2" />
    </div>
  );
};
