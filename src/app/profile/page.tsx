export default function ProfilePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Profile</p>
        <h1 className="text-2xl font-semibold">Ari, you&apos;re on fire</h1>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-xl font-semibold">A</div>
          <div>
            <p className="text-lg font-semibold">Ari</p>
            <p className="text-sm text-slate-400">Neon Crew • 4 streak days</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ['Challenges done', '12'],
            ['Photos submitted', '8'],
            ['Badges', '3'],
            ['Favorite challenge', 'Team selfie'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
