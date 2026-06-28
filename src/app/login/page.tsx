'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdGroupCode, setCreatedGroupCode] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError('');

    try {
      if (mode === 'create' && !groupName.trim()) {
        throw new Error('Please name your group.');
      }
      if (mode === 'join' && !code.trim()) {
        throw new Error('Please enter the group code.');
      }

      const result = await signIn(displayName.trim() || undefined, mode, mode === 'create' ? groupName.trim() : undefined, mode === 'join' ? code.trim() : undefined);
      if (mode === 'create' && result?.createdGroupCode) {
        setCreatedGroupCode(result.createdGroupCode);
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-6 text-center shadow-glow backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.35em] text-pink-200">Welcome</p>
        <h1 className="mt-2 text-3xl font-semibold">Join the crawl</h1>
        <p className="mt-3 text-sm text-slate-400">Sign in with Google, then create your own group or join an existing one.</p>

        <div className="mt-6 space-y-3 text-left">
          <label className="block text-sm text-slate-300">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ari"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm outline-none"
            />
          </label>

          <div className="flex gap-2">
            <button onClick={() => setMode('create')} className={`flex-1 rounded-full px-3 py-2 text-sm ${mode === 'create' ? 'bg-white text-slate-900' : 'bg-slate-900/70'}`}>
              Make a group
            </button>
            <button onClick={() => setMode('join')} className={`flex-1 rounded-full px-3 py-2 text-sm ${mode === 'join' ? 'bg-white text-slate-900' : 'bg-slate-900/70'}`}>
              Join group
            </button>
          </div>

          {mode === 'create' ? (
            <>
              <label className="block text-sm text-slate-300">
                Group name
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Neon Crew"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm outline-none"
                />
              </label>
              {createdGroupCode ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  <p className="font-semibold">Your group code</p>
                  <p className="mt-1 text-lg font-mono tracking-[0.35em]">{createdGroupCode}</p>
                  <p className="mt-1 text-xs">Share this with friends so they can join.</p>
                </div>
              ) : null}
            </>
          ) : (
            <label className="block text-sm text-slate-300">
              Group code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ABC123"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm outline-none"
              />
            </label>
          )}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full rounded-full bg-white px-4 py-3 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? 'Signing in…' : 'Continue with Google'}
          </button>

          <Link href="/" className="block w-full rounded-full border border-white/10 px-4 py-3 text-center font-semibold">
            Explore demo
          </Link>
        </div>
      </div>
    </main>
  );
}
