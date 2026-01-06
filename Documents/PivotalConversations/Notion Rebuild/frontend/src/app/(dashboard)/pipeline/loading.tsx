export default function PipelineLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with tabs skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-32 h-8 bg-zinc-800 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-24 h-9 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-28 h-9 bg-zinc-800 rounded animate-pulse" />
          <div className="w-28 h-9 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Pipeline columns skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((col) => (
          <div key={col} className="space-y-3">
            {/* Column header */}
            <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="w-6 h-6 bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Cards in column */}
            {[1, 2, 3].map((card) => (
              <div key={card} className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-800 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-zinc-800 rounded animate-pulse" />
                    <div className="w-1/2 h-3 bg-zinc-800/50 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-5 bg-zinc-800 rounded animate-pulse" />
                  <div className="w-16 h-5 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
