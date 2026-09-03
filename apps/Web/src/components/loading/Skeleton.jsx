export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />
);

export const PageSkeleton = ({ variant = 'list' }) => {
  if (variant === 'showcase') {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
        <Skeleton className="h-[58vh] max-h-[560px] rounded-2xl" />
        <div className="mt-10 flex gap-4">
          <Skeleton className="h-40 w-60 shrink-0 rounded-xl" />
          <Skeleton className="h-40 w-60 shrink-0 rounded-xl" />
          <Skeleton className="h-40 w-60 shrink-0 rounded-xl" />
        </div>
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-col items-center">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="mt-4 h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <div className="mt-10 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center p-4">
            <Skeleton className="h-40 w-40 rounded-full" />
            <Skeleton className="mt-3 h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'rows') {
    return (
      <div className="space-y-2 py-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
