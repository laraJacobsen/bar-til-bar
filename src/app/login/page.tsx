'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Space_Grotesk, Manrope } from 'next/font/google';
import { ChevronLeft, Check, UserPlus, Link2, Shield, GlassWater } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// Bar Crawl redesign typefaces, scoped to the onboarding screen.
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

type Role = 'make' | 'join' | 'admin';
type Step = 1 | 2 | 3 | 4;

const ROLE_META: Record<Role, { title: string; desc: string; Icon: typeof UserPlus }> = {
  make: { title: 'Make a group', desc: 'Start a new crew and invite your friends.', Icon: UserPlus },
  join: { title: 'Join a group', desc: 'Hop into an existing crew with a code.', Icon: Link2 },
  admin: { title: 'Admin', desc: 'Run the crawl and manage every stop.', Icon: Shield },
};

const DETAIL_COPY: Record<Role, { title: string; sub: string }> = {
  make: { title: 'Set up your group', sub: 'Name your crew and drop in the crawl code to get started.' },
  join: { title: 'Enter the crawl', sub: 'Pop in the code your organiser shared to join the fun.' },
  admin: { title: 'Admin access', sub: 'Enter the crawl code you want to manage tonight.' },
};

// Google "G" mark (the sign-in button is the one non-gradient primary).
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, dbUser, loading, authenticate, completeOnboarding } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role>('make');
  const [screenName, setScreenName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [crawlCode, setCrawlCode] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdGroupCode, setCreatedGroupCode] = useState('');

  // Resume guard: an authed-but-incomplete user (closed the app mid-flow) is routed
  // back into the flow at the right step rather than restarting or dropping into the tabs.
  const [resolvedResume, setResolvedResume] = useState(false);
  useEffect(() => {
    if (loading || resolvedResume) return;
    if (!user) {
      setResolvedResume(true);
      return;
    }
    // Wait for the user doc to load before deciding where to resume.
    if (dbUser === null) return;
    if (dbUser.onboardingComplete) {
      router.replace(dbUser.role === 'admin' ? '/admin' : '/');
      return;
    }
    // Authenticated but unfinished — jump past the Google step, prefill the screen name.
    setScreenName((prev) => prev || dbUser.displayName || '');
    if (dbUser.role) {
      setRole(dbUser.role === 'admin' ? 'admin' : role);
    }
    setStep((prev) => (prev < 2 ? 2 : prev));
    setResolvedResume(true);
  }, [loading, user, dbUser, resolvedResume, role, router]);

  const prog = useMemo(
    () =>
      [1, 2, 3, 4].map((n) => ({
        width: n === step ? 'w-[26px]' : 'w-[7px]',
        filled: n <= step,
      })),
    [step],
  );

  const goNext = () => setStep((s) => (Math.min(4, s + 1) as Step));
  const goPrev = () => setStep((s) => (Math.max(1, s - 1) as Step));

  const handleAuthenticate = async () => {
    setBusy(true);
    setError('');
    try {
      const { suggestedName } = await authenticate();
      setScreenName((prev) => prev || suggestedName);
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  // Turns the final step's inputs into a group create/join (or admin) and completes onboarding.
  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      if (role === 'make' && !groupName.trim()) throw new Error('Please name your group.');
      if (role === 'join' && !code.trim()) throw new Error('Please enter the group code.');
      if (role !== 'admin' && !crawlCode.trim()) {
        throw new Error('Please enter the crawl code from your organiser.');
      }

      const result = await completeOnboarding({
        displayName: screenName.trim(),
        role: role === 'admin' ? 'admin' : 'group',
        mode: role === 'make' ? 'create' : role === 'join' ? 'join' : undefined,
        groupName: role === 'make' ? groupName.trim() : undefined,
        code: role === 'join' ? code.trim() : undefined,
        crawlCode: role !== 'admin' ? crawlCode.trim() : undefined,
      });

      if (role === 'make' && result.createdGroupCode) {
        setCreatedGroupCode(result.createdGroupCode);
      }
      router.replace(role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  // Admin is self-serve and skips the crawl-code/group step — Step 3 finishes for them.
  const roleContinue = () => {
    setError('');
    if (role === 'admin') {
      void finish();
      return;
    }
    goNext();
  };

  const primaryBtn =
    'flex-1 rounded-2xl bg-[linear-gradient(135deg,#ff5aa8_0%,#c42ad6_52%,#7c3aed_100%)] px-5 py-[17px] text-[15.5px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] transition active:scale-[.98] disabled:opacity-60';
  const backBtn =
    'grid w-14 flex-none place-items-center rounded-2xl border border-white/[.085] bg-white/[.05] text-[#9b95ad] transition hover:bg-white/[.1] hover:text-[#f4f2f8]';
  const inputCls =
    'w-full rounded-2xl border border-white/[.055] bg-white/[.028] px-[18px] py-[18px] text-[18px] font-semibold text-[#f4f2f8] outline-none placeholder:text-[#6a637f] focus:border-[#ff5aa8]';
  const labelCls = 'mb-[9px] block text-[12px] font-bold tracking-[1px] text-[#6a637f]';
  const eyebrow = 'font-[family-name:var(--font-display)] text-[11px] font-semibold tracking-[3px] text-[#ff5aa8]';
  const heading = 'font-[family-name:var(--font-display)] text-[29px] font-bold leading-[1.1] text-[#f4f2f8]';

  return (
    <main
      className={`${spaceGrotesk.variable} ${manrope.variable} fixed inset-0 z-30 flex flex-col bg-[#0a0711] font-[family-name:var(--font-body)] text-[#f4f2f8]`}
    >
      {/* top magenta glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(680px 420px at 50% 0%, rgba(196,42,214,.12), transparent 62%)' }}
      />

      <div className="relative z-[2] mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 pb-8 pt-6">
        {/* progress bars */}
        <div className="mb-1 mt-3 flex items-center gap-[7px]">
          {prog.map((p, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${p.width} ${
                p.filled
                  ? 'bg-[linear-gradient(135deg,#ff5aa8_0%,#c42ad6_52%,#7c3aed_100%)]'
                  : 'bg-white/[.12]'
              }`}
            />
          ))}
        </div>

        {error ? (
          <p className="mt-3 rounded-2xl border border-[rgba(255,90,168,.25)] bg-[rgba(255,90,168,.1)] px-4 py-3 text-[13px] font-semibold text-[#ff5aa8]">
            {error}
          </p>
        ) : null}

        {/* STEP 1 · welcome */}
        {step === 1 && (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-[26px] grid h-[88px] w-[88px] place-items-center rounded-[28px] bg-[linear-gradient(135deg,#ff5aa8_0%,#c42ad6_52%,#7c3aed_100%)] shadow-[0_12px_34px_rgba(0,0,0,.4)]">
                <GlassWater className="h-[42px] w-[42px] text-white" strokeWidth={1.8} />
              </div>
              <p className="mb-[10px] font-[family-name:var(--font-display)] text-[12px] font-semibold tracking-[4px] text-[#ff5aa8]">
                WELCOME
              </p>
              <h1 className="mb-[14px] font-[family-name:var(--font-display)] text-[34px] font-bold leading-[1.05] text-[#f4f2f8]">
                Join the crawl
              </h1>
              <p className="max-w-[280px] text-[15px] leading-[1.5] text-[#9b95ad]">
                Sign in to create your own crew or hop into an existing group.
              </p>
            </div>
            <div>
              <button
                onClick={handleAuthenticate}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-[17px] text-[15.5px] font-extrabold text-[#1a1622] shadow-[0_10px_26px_rgba(0,0,0,.35)] transition active:scale-[.98] disabled:opacity-60"
              >
                <GoogleG className="h-[19px] w-[19px]" />
                {busy ? 'Signing in…' : 'Continue with Google'}
              </button>
              <button
                onClick={() => router.replace('/')}
                className="mt-3 w-full rounded-2xl border border-white/[.085] bg-white/[.04] px-5 py-4 text-[14.5px] font-bold text-[#9b95ad] transition hover:bg-white/[.09] hover:text-[#f4f2f8]"
              >
                Explore demo
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 · screen name */}
        {step === 2 && (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 pt-[34px]">
              <p className={`mb-2 ${eyebrow}`}>YOUR NAME</p>
              <h1 className={`mb-[10px] ${heading}`}>What should we call you?</h1>
              <p className="mb-[30px] text-[14.5px] leading-[1.5] text-[#9b95ad]">
                This is how your crew will see you on the leaderboard.
              </p>
              <label className={labelCls}>DISPLAY NAME</label>
              <input
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                placeholder="Ari"
                className={`font-[family-name:var(--font-display)] ${inputCls}`}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={goPrev} className={backBtn} aria-label="Back">
                <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </button>
              <button onClick={goNext} disabled={!screenName.trim()} className={primaryBtn}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 · role */}
        {step === 3 && (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 pt-7">
              <p className={`mb-2 ${eyebrow}`}>YOUR ROLE</p>
              <h1 className={`mb-6 ${heading}`}>How are you joining?</h1>
              <div className="flex flex-col gap-3">
                {(Object.keys(ROLE_META) as Role[]).map((key) => {
                  const { title, desc, Icon } = ROLE_META[key];
                  const on = role === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setRole(key)}
                      className={`flex w-full items-center gap-[15px] rounded-[20px] border px-[18px] py-[17px] text-left transition ${
                        on
                          ? 'border-[rgba(255,90,168,.5)] bg-[linear-gradient(135deg,rgba(255,90,168,.16),rgba(124,58,237,.16))]'
                          : 'border-white/[.055] bg-white/[.028]'
                      }`}
                    >
                      <div
                        className={`grid h-[46px] w-[46px] flex-none place-items-center rounded-[14px] ${
                          on ? 'bg-[rgba(255,90,168,.18)] text-[#ff5aa8]' : 'bg-white/[.06] text-[#9b95ad]'
                        }`}
                      >
                        <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <div className="font-[family-name:var(--font-display)] text-[16.5px] font-bold text-[#f4f2f8]">
                          {title}
                        </div>
                        <div className="mt-[3px] text-[12.5px] leading-[1.35] text-[#9b95ad]">{desc}</div>
                      </div>
                      <div
                        className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-full border ${
                          on
                            ? 'border-transparent bg-[linear-gradient(135deg,#ff5aa8_0%,#c42ad6_52%,#7c3aed_100%)]'
                            : 'border-white/[.085] bg-transparent'
                        }`}
                      >
                        {on ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              {role === 'admin' ? (
                <div className="mt-5 rounded-2xl border border-[rgba(255,90,168,.2)] bg-[rgba(255,90,168,.1)] p-3.5 text-[12.5px] text-[#ff5aa8]">
                  ⚡ Continuing will register or sign you in with <strong>Administrator</strong> privileges.
                </div>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button onClick={goPrev} className={backBtn} aria-label="Back">
                <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </button>
              <button onClick={roleContinue} disabled={busy} className={primaryBtn}>
                {role === 'admin' ? (busy ? 'Setting up…' : 'Continue as Admin') : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 · details (group role only — admin skips this) */}
        {step === 4 && (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 pt-7">
              <p className={`mb-2 ${eyebrow}`}>ALMOST THERE</p>
              <h1 className={`mb-[10px] ${heading}`}>{DETAIL_COPY[role].title}</h1>
              <p className="mb-7 text-[14.5px] leading-[1.5] text-[#9b95ad]">{DETAIL_COPY[role].sub}</p>

              <label className={labelCls}>CRAWL CODE</label>
              <input
                value={crawlCode}
                onChange={(e) => setCrawlCode(e.target.value)}
                placeholder="NIGHT7"
                className={`font-[family-name:var(--font-display)] uppercase tracking-[4px] ${inputCls}`}
              />
              <p className="mt-[9px] text-[12.5px] text-[#6a637f]">Get this from your event organiser.</p>

              {role === 'make' && (
                <div className="mt-[22px]">
                  <label className={labelCls}>GROUP NAME</label>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Neon Crew"
                    className={`font-[family-name:var(--font-display)] ${inputCls}`}
                  />
                </div>
              )}

              {role === 'join' && (
                <div className="mt-[22px]">
                  <label className={labelCls}>GROUP CODE</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ABC123"
                    className={`font-[family-name:var(--font-display)] uppercase tracking-[4px] ${inputCls}`}
                  />
                </div>
              )}

              {createdGroupCode ? (
                <div className="mt-5 rounded-2xl border border-[rgba(45,212,191,.25)] bg-[rgba(45,212,191,.1)] p-4 text-[#2dd4bf]">
                  <p className="text-[13px] font-bold">Your group code</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-[20px] font-bold tracking-[4px]">
                    {createdGroupCode}
                  </p>
                  <p className="mt-1 text-[12px]">Share this with friends so they can join.</p>
                </div>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button onClick={goPrev} className={backBtn} aria-label="Back">
                <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </button>
              <button onClick={finish} disabled={busy} className={primaryBtn}>
                {busy ? 'Entering…' : 'Enter the crawl →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
