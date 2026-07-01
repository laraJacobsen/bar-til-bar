'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Images, Target, Trophy, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { InstallPromptSheet } from '@/components/InstallPromptSheet';

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
      <InstallPromptSheet />
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href as any}
                className={`relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-colors ${
                  isActive ? 'text-pink-400' : 'text-slate-300'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-2xl bg-white/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <motion.span
                  className="relative z-10"
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </motion.span>
                <span className="relative z-10 text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
