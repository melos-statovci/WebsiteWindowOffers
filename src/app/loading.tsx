export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
        <p className="font-heading text-sm font-semibold text-slate-400">
          Duke ngarkuar sistemin…
        </p>
      </div>
    </div>
  );
}
