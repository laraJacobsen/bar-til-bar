import Link from 'next/link';

const adminSections = [
  { title: 'Create event', description: 'Set the event name, date, and status.' },
  { title: 'Create bars', description: 'Add bars, addresses, descriptions, and photos.' },
  { title: 'Create challenges', description: 'Assign points, difficulty, and photo requirements.' },
  { title: 'Assign routes', description: 'Create multiple routes and map teams to them.' },
  { title: 'Review submissions', description: 'Approve or reject team submissions live.' },
  { title: 'Announce winner', description: 'End the event and reveal the winner.' },
];

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Admin</p>
          <h1 className="text-2xl font-semibold">Control center</h1>
        </div>
        <Link href="/" className="rounded-full bg-white/10 px-3 py-2 text-sm">Back</Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand-500/30 to-accent/30 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Event overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Teams</p>
            <p className="mt-2 text-2xl font-semibold">8</p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Pending reviews</p>
            <p className="mt-2 text-2xl font-semibold">12</p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-4">
            <p className="text-sm text-slate-400">Active route</p>
            <p className="mt-2 text-2xl font-semibold">Route B</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {adminSections.map((section) => (
            <div key={section.title} className="rounded-2xl bg-slate-900/60 p-4">
              <h3 className="font-semibold">{section.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{section.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
