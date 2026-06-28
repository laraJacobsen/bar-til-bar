import Link from 'next/link';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Challenges', href: '/challenges' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Profile', href: '/profile' },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-glow backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Saturday Night</p>
            <h1 className="text-3xl font-semibold">Bar Til Bar</h1>
          </div>
          <div className="rounded-full bg-brand-500/20 px-3 py-1 text-sm text-pink-100">Live</div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Current score</p>
            <p className="mt-2 text-3xl font-semibold">840</p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Current challenge</p>
            <p className="mt-2 text-lg font-semibold">Team selfie</p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Next bar</p>
            <p className="mt-2 text-lg font-semibold">North Star</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/30 to-accent/30 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-pink-100">Route progress</p>
            <h2 className="text-xl font-semibold">Bar 2 of 6</h2>
          </div>
          <div className="text-right text-sm text-pink-100">
            <p>Ends in</p>
            <p className="font-semibold">01:24:09</p>
          </div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-900/70">
          <div className="h-3 w-1/3 rounded-full bg-gradient-to-r from-pink-500 to-violet-500" />
        </div>
        <Link href="/challenges" className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-4 py-3 font-semibold text-slate-900">
          Go to Current Challenge
        </Link>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h3 className="text-lg font-semibold">Tonight&apos;s flow</h3>
        <ul className="mt-4 space-y-3">
          {['Arrive at North Star', 'Complete the selfie challenge', 'Unlock the next route'].map((item) => (
            <li key={item} className="flex items-center gap-3 rounded-2xl bg-slate-900/60 p-3">
              <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl justify-between px-4 py-3">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="rounded-full px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
