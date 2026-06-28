import Link from 'next/link';
import { UploadPanel } from '@/components/UploadPanel';

const challenges = [
  { title: 'Team selfie', points: 50, difficulty: 'easy' },
  { title: 'Human pyramid', points: 80, difficulty: 'medium' },
  { title: 'Find someone wearing red', points: 60, difficulty: 'easy' },
];

export default function ChallengesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Current bar</p>
          <h1 className="text-2xl font-semibold">North Star</h1>
        </div>
        <Link href="/" className="rounded-full bg-white/10 px-3 py-2 text-sm">Back</Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Unlockable challenges</h2>
        <div className="mt-4 space-y-3">
          {challenges.map((challenge) => (
            <div key={challenge.title} className="rounded-2xl bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{challenge.title}</h3>
                <span className="rounded-full bg-brand-500/20 px-2 py-1 text-sm text-pink-100">+{challenge.points} pts</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Snap a photo and submit for review.</p>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                <span>{challenge.difficulty}</span>
                <span>Photo required</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <UploadPanel />
    </main>
  );
}
