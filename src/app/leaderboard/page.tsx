const teams = [
  { name: 'Neon Crew', points: 1240, completed: 8 },
  { name: 'Midnight Mix', points: 1180, completed: 7 },
  { name: 'Velvet Vibes', points: 1020, completed: 6 },
];

export default function LeaderboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Live leaderboard</p>
        <h1 className="text-2xl font-semibold">Points update in real time</h1>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        {teams.map((team, index) => (
          <div key={team.name} className="mt-3 flex items-center justify-between rounded-2xl bg-slate-900/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 font-semibold">
                {index + 1}
              </div>
              <div>
                <p className="font-semibold">{team.name}</p>
                <p className="text-sm text-slate-400">{team.completed} challenges</p>
              </div>
            </div>
            <p className="text-lg font-semibold">{team.points}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
