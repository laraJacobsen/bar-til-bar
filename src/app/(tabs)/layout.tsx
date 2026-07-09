'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Images, Target, Trophy, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Challenges', href: '/challenges', icon: Target },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: User },
] as const;

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  return (
    <>
      {children}
      <nav className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-20 mx-auto flex max-w-md justify-around rounded-[24px] border border-white/[.085] bg-[rgba(20,16,28,.7)] px-2 py-2 shadow-[0_16px_40px_rgba(0,0,0,.4)] backdrop-blur-[24px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href as any}
              aria-label={item.label}
              className={`relative flex h-14 flex-1 flex-col items-center justify-center rounded-2xl px-1 transition-colors ${
                isActive ? 'text-[#ff5aa8]' : 'text-[#6a637f]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-2xl bg-white/[.06]"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              {/* Icon animates with transforms only (scale + fixed upward shift when
                  active) so nothing reflows — no scale-then-snap. */}
              <motion.span
                className="relative z-10"
                animate={{ scale: isActive ? 0.92 : 1.3, y: isActive ? -7 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                whileTap={{ scale: isActive ? 0.82 : 1.15 }}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </motion.span>
              {/* Absolutely positioned so it never pushes the icon around. */}
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="pointer-events-none absolute bottom-2 z-10 text-[10px] font-bold leading-none"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
