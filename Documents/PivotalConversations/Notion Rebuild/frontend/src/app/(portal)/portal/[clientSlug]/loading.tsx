export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="w-24 h-6 bg-zinc-800 rounded animate-pulse" />
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-24 h-9 bg-zinc-800 rounded animate-pulse" />
              ))}
            </nav>
          </div>
          <div className="w-20 h-8 bg-zinc-800 rounded animate-pulse hidden md:block" />
        </div>
      </header>

      {/* Content skeleton */}
      <main className="container px-4 py-6 mx-auto max-w-6xl">
        <div className="space-y-6">
          {/* Title skeleton */}
          <div className="space-y-2">
            <div className="w-48 h-8 bg-zinc-800 rounded animate-pulse" />
            <div className="w-64 h-4 bg-zinc-800/50 rounded animate-pulse" />
          </div>

          {/* Cards skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="space-y-3">
                  <div className="w-16 h-4 bg-zinc-800 rounded animate-pulse" />
                  <div className="w-full h-6 bg-zinc-800 rounded animate-pulse" />
                  <div className="w-3/4 h-4 bg-zinc-800/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* List skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-zinc-800 rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-zinc-800/50 rounded animate-pulse" />
                </div>
                <div className="w-20 h-6 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
