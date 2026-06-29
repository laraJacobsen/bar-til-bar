'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'create' | 'join' | 'admin'>('create');
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

      const role = mode === 'admin' ? 'admin' : 'group';
      const result = await signIn(
        displayName.trim() || undefined,
        role,
        mode === 'admin' ? undefined : mode,
        mode === 'create' ? groupName.trim() : undefined,
        mode === 'join' ? code.trim() : undefined
      );

      if (mode === 'create' && result?.createdGroupCode) {
        setCreatedGroupCode(result.createdGroupCode);
      }
      router.replace(role === 'admin' ? '/admin' : '/');
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
        <h1 className="mt-2 text-3xl font-semibold">
          {mode === 'admin' ? 'Admin Center' : 'Join the crawl'}
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          {mode === 'admin' 
            ? 'Sign in as administrator to manage routes, bars, groups, and approve submissions.'
            : 'Sign in with Google, then create your own group or join an existing one.'}
        </p>

        <div className="mt-6 space-y-3 text-left">
          <label className="block text-sm text-slate-300">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={mode === 'admin' ? 'Admin' : 'Ari'}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm outline-none"
            />
          </label>

          <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-1 rounded-full border border-white/5">
            <button 
              onClick={() => setMode('create')} 
              className={`rounded-full py-2 text-xs font-semibold transition ${mode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Make group
            </button>
            <button 
              onClick={() => setMode('join')} 
              className={`rounded-full py-2 text-xs font-semibold transition ${mode === 'join' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Join group
            </button>
            <button 
              onClick={() => setMode('admin')} 
              className={`rounded-full py-2 text-xs font-semibold transition ${mode === 'admin' ? 'bg-pink-500 text-white shadow-sm' : 'text-pink-300 hover:text-pink-100'}`}
            >
              Admin
            </button>
          </div>

          {mode === 'create' && (
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
          )}

          {mode === 'join' && (
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

          {mode === 'admin' && (
            <div className="rounded-2xl bg-pink-500/10 border border-pink-500/20 p-3.5 text-xs text-pink-200">
              ⚡ Continuing will register or sign you in with <strong>Administrator</strong> privileges.
            </div>
          )}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            onClick={handleGoogleSignIn}
            disabled={busy}
            className={`w-full rounded-full px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-70 transition ${
              mode === 'admin' 
                ? 'bg-pink-500 text-white hover:bg-pink-600' 
                : 'bg-white text-slate-900 hover:bg-slate-200'
            }`}
          >
            {busy ? 'Signing in…' : mode === 'admin' ? 'Continue as Admin with Google' : 'Continue with Google'}
          </button>

          <Link href="/" className="block w-full rounded-full border border-white/10 px-4 py-3 text-center font-semibold hover:bg-white/5 transition">
            Explore demo
          </Link>
        </div>
      </div>
    </main>
  );
}
