export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </div>
  )
}
