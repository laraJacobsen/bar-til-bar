'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getUserCrawlArchives } from '@/lib/firestore';
import { PageSkeleton } from '@/components/PageSkeleton';
import type { CrawlArchive } from '@/lib/types';

export default function RecapPage() {
  const { user } = useAuth();
  const [archives, setArchives] = useState<CrawlArchive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserCrawlArchives(user.uid)
      .then(setArchives)
      .catch((err) => console.error('Failed to load crawl history', err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageSkeleton />;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ff5aa8]">Past crawls</p>
          <h1 className="mt-0.5 text-2xl font-semibold">Your crawl history</h1>
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[.085] bg-white/[.05] px-3 py-1.5 text-[13px] text-slate-300 transition hover:bg-white/[.12]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Back
        </Link>
      </div>

      {archives.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/[.055] p-6 text-center text-[13px] text-[#6a637f]">
          No past crawls yet — once a crawl ends, it&apos;ll show up here.
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {archives.map((archive) => {
            const myGroup = archive.groups.find((g) => g.members.includes(user?.uid ?? ''));
            const rank = myGroup
              ? [...archive.groups].sort((a, b) => b.score - a.score).findIndex((g) => g.id === myGroup.id) + 1
              : null;
            const photos = archive.submissions.filter((s) => s.photoUrl);
            return (
              <Link
                key={archive.id}
                href={`/summary?id=${archive.id}` as any}
                className="rounded-[24px] border border-white/[.08] bg-white/[.045] p-4 backdrop-blur-[20px] transition hover:bg-white/[.07]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#f4f2f8]">{archive.eventName}</p>
                    <p className="mt-0.5 text-xs text-[#9b95ad]">
                      {new Date(archive.endedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {myGroup ? ` · ${myGroup.name}${rank ? ` · #${rank}` : ''}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#6a637f]" aria-hidden />
                </div>
                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {photos.slice(0, 4).map((s) => (
                      <img
                        key={s.id}
                        src={s.photoUrl!}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
