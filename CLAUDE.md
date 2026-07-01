# CLAUDE.md

Guidance for Claude/agents working in this repo. Keep it accurate — update it when structure or conventions change.

## What this is

**Bar Til Bar** — a mobile-first PWA companion for a bar crawl event: teams join via a code, complete challenges at each stop, submit photos, and climb a live leaderboard. Admins run events, routes, and approvals.

## Tech stack

- Next.js App Router + TypeScript
- Tailwind CSS (`clsx` + `tailwind-merge` for class merging, `class-variance-authority` available)
- `lucide-react` icons, `framer-motion` animations
- Firebase Auth + Firestore; Cloudflare R2 for photo uploads (presigned PUT)
- PWA via `next-pwa`; tests via Vitest

## Layout

- `src/app/` — routes. `(tabs)/` group = the 5 member tabs (home, challenges, gallery, leaderboard, profile) with a shared floating tab bar in `(tabs)/layout.tsx`. `login/`, `admin/`, plus `recap/`, `summary/`, `group/`, `groups/[groupId]/`.
- `src/components/` — shared components (`AuthProvider`, `GroupJoinCreate`, `UploadPanel`, `PageSkeleton`).
- `src/lib/` — Firebase, Firestore access, schema (`zod`), types, group logic, R2 upload.

## 🎨 Design system — REQUIRED reading for any UI work

The app follows the **"Bar Crawl" redesign**: dark magenta-violet nightlife theme, pink→violet gradient CTAs, frosted-glass cards, Space Grotesk + Manrope fonts, teal for success.

**Before touching any frontend (pages, components, Tailwind, `globals.css`, `tailwind.config.ts`), use the `bar-crawl-design` skill** (`.claude/skills/bar-crawl-design/`). It is the single source of truth:

- `SKILL.md` — the 8 core rules + migration table (old slate/rose theme → new).
- `tokens.md` — every color, font, spacing, radius, shadow, animation + recommended Tailwind config.
- `components.md` — copy-paste recipes for buttons, cards, inputs, badges, nav, etc.
- `screens.md` — per-screen layout and content.

The codebase is **mid-migration** from an older slate/rose theme. When the skill and existing code disagree, the skill wins — migrate the file you're touching.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm test` — Vitest
- `npm run emulators` / `npm run test:emulators` — Firebase emulators

## Conventions

- Client components need `'use client'`. Keep auth flow logic (`useAuth`, modes create/join/admin) intact when restyling.
- Match the surrounding file's style; merge Tailwind classes with `clsx`/`tailwind-merge`.
- Environment variables: see `README.md`. Never prefix R2 secrets with `NEXT_PUBLIC`.
