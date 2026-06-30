'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { user, dbUser, signOutUser } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.error('Sign out failed', e);
    }
    router.replace('/login');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 bg-slate-950 px-4 py-6 pb-24 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Profile</p>
          <h1 className="text-2xl font-semibold">Ari, you&apos;re on fire</h1>
        </div>
        <Link href="/" className="shrink-0 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100">Back</Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
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
            ['Favorite challenge', 'Group selfie'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Account</h2>
        <div className="mt-4 flex flex-col gap-3">
          {dbUser?.role === 'admin' ? (
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 rounded-full bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-600"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Admin Control Center
            </Link>
          ) : null}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
