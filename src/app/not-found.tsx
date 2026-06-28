import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-semibold">This page drifted away</h1>
      <p className="mt-3 text-sm text-slate-400">The route you tried to reach doesn’t exist in this crawl.</p>
      <Link href="/" className="mt-6 rounded-full bg-white px-4 py-3 font-semibold text-slate-900">
        Head back home
      </Link>
    </main>
  );
}
