---
name: bar-crawl-design
description: The Bar Til Bar design system — colors, typography, spacing, glassmorphism components, and screen layouts for the bar crawl companion app. Use whenever building, restyling, or reviewing ANY frontend/UI in this repo (pages under src/app, components under src/components, Tailwind classes, globals.css, tailwind.config.ts). Ensures every screen matches the "Bar Crawl" redesign (dark magenta-violet nightlife theme, pink→violet gradient CTAs, glass cards).
---

# Bar Til Bar — Design System

The app is a **mobile-first bar crawl companion**. The visual language is a **dark nightlife aesthetic**: near-black magenta-tinted background, frosted-glass panels, a signature **pink → magenta → violet gradient** on primary actions, teal for success, and two display/body typefaces (Space Grotesk + Manrope).

This skill is the single source of truth. When it disagrees with existing code, the skill wins — the codebase is mid-migration from an older slate/rose theme (see [Migration](#migration-from-the-old-theme)).

## When to use

Load this skill before any UI work: new pages/components, restyling, Tailwind edits, `globals.css`, `tailwind.config.ts`, or design reviews. Match these tokens exactly rather than inventing values.

## The 8 rules (read these first)

1. **Background is `#0a0711`** (near-black with a magenta tint) — never plain black or slate-950. Screens get subtle radial magenta/violet glows on top.
2. **Primary actions use the gradient** `linear-gradient(135deg,#ff5aa8 0%,#c42ad6 52%,#7c3aed 100%)` with white text. This is the ONE gradient — reuse it, don't improvise new ones.
3. **Pink `#ff5aa8` is the accent** — active nav, eyebrow labels, points, focus rings. Not rose/red.
4. **Surfaces are glass**: translucent white panels (`rgba(255,255,255,.045)`) + `1px` translucent border + `backdrop-blur`. Never opaque gray cards.
5. **Teal `#2dd4bf` = success/live/approved.** Never emerald/green.
6. **Two fonts**: Space Grotesk for headings/numbers/labels/buttons; Manrope for body copy.
7. **Generous rounding**: cards `26px` (`rounded-[26px]`), buttons/inputs `16px` (`rounded-2xl`), rows/banners `22px`, pills `999px`.
8. **Mobile-first, single column.** Content max-width ~`404px` phone; comfortable padding (`20px` sides), bottom padding clears the floating tab bar.

## Reference files (read as needed)

- **[tokens.md](tokens.md)** — every color, gradient, font size, spacing, radius, shadow, and animation value. Includes the recommended `tailwind.config.ts` and `globals.css` (documented, not yet applied).
- **[components.md](components.md)** — copy-paste Tailwind/React recipes for buttons, glass cards, inputs, badges/pills, avatars, icon tiles, the bottom tab bar, leaderboard rows, progress bars, empty states.
- **[screens.md](screens.md)** — layout and content structure for each screen (Home, Challenges/Current Stop, Gallery, Leaderboard, Profile, Admin Control Center, Onboarding).

## Icons

**Lucide** (`lucide-react`, already installed), stroke style, `stroke-width:2`, rounded caps. Examples used: `Home`, `Target`, `Images`, `Trophy`, `User`, `MapPin`, `Camera`, `Shield`, `LogOut`, `Users`, `Link`, `Check`, chevrons.

## Migration from the old theme

The repo still contains the pre-redesign palette. When you touch a file, migrate it:

| Old | New |
| --- | --- |
| bg `#020617` / `slate-950` | `#0a0711` (`bg-base`) |
| brand rose `#f43f5e` / `pink-500` | pink `#ff5aa8` |
| emerald/green success `#22c55e` | teal `#2dd4bf` |
| solid white pill buttons | gradient CTA (except "Continue with Google", which stays white) |
| default system font | Space Grotesk (display) + Manrope (body) |
| `shadow-glow` (rose) | card shadow `0 20px 50px rgba(0,0,0,.4)` |

Source of truth: the Claude Design project **"Bar app redesign refresh"** → file `Bar Crawl.dc.html`.
