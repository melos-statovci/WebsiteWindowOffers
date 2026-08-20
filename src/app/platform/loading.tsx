// Route-level loading fallback for the platform area (theme-aware skeleton).
export default function PlatformLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-md bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
      <div className="h-48 rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}
