export default function TabsLoading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-7 w-48 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="h-9 w-16 animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="h-32 animate-pulse rounded-[2rem] border border-white/5 bg-white/5" />
      <div className="h-40 animate-pulse rounded-[2rem] border border-white/5 bg-white/5" />
      <div className="h-24 animate-pulse rounded-[2rem] border border-white/5 bg-white/5" />
    </main>
  );
}
