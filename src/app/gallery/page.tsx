export default function GalleryPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Event gallery</p>
        <h1 className="text-2xl font-semibold">Your group's best moments</h1>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-[2rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
            <div className="h-36 rounded-2xl bg-gradient-to-br from-pink-500/40 to-violet-500/40" />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Group selfie</h2>
                <p className="text-sm text-slate-400">North Star</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-sm text-emerald-200">Approved</span>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
