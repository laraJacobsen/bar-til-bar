# Design Tokens

All values are extracted verbatim from `Bar Crawl.dc.html`. Treat these as canonical.

## Color palette

### Core variables

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0a0711` | Screen base background |
| body backdrop | `#08060d` | App shell behind screens |
| `--panel` | `rgba(255,255,255,.045)` | Primary glass card fill |
| `--panel2` | `rgba(255,255,255,.028)` | Sub-panels, list rows, stat tiles, inputs |
| `--border` | `rgba(255,255,255,.085)` | Card / nav borders |
| `--border2` | `rgba(255,255,255,.055)` | Inner well / row borders |
| `--txt` | `#f4f2f8` | Primary text |
| `--muted` | `#9b95ad` | Secondary text |
| `--faint` | `#6a637f` | Tertiary text, idle nav icons |
| inset well | `rgba(0,0,0,.28)` | Code box, chips, dark wells |
| nav bar bg | `rgba(20,16,28,.7)` | Floating bottom tab bar |

### Brand & accent

| Token | Value |
| --- | --- |
| `--pink` (accent) | `#ff5aa8` |
| magenta (gradient mid) | `#c42ad6` |
| `--violet` | `#8b5cf6` |
| violet (gradient end) | `#7c3aed` |
| `--teal` (success) | `#2dd4bf` |
| live/alert dot | `#ff3b6b` |

### Gradients

```
--grad:     linear-gradient(135deg,#ff5aa8 0%,#c42ad6 52%,#7c3aed 100%);
--gradsoft: linear-gradient(135deg,rgba(255,90,168,.16),rgba(124,58,237,.16));
```

- `--grad` — all primary CTAs, avatars, icon tiles, active progress fills.
- `--gradsoft` — highlight banners, selected role cards, rank-1 leaderboard row.

### Background glows (layer on top of `--bg`)

- App body: `radial-gradient(1000px 640px at 18% -5%, rgba(196,42,214,.06), transparent 58%)` and `radial-gradient(820px 560px at 92% 108%, rgba(124,58,237,.07), transparent 58%)`
- Screen atmosphere (top): `radial-gradient(620px 320px at 50% -8%, rgba(196,42,214,.09), transparent 62%)`

### Semantic

| State | Text | Background | Border |
| --- | --- | --- | --- |
| Success / Approved / LIVE | `#2dd4bf` | `rgba(45,212,191,.13)` | `rgba(45,212,191,.28)` |
| Points (+50 PTS) | `#ff5aa8` | `rgba(255,90,168,.14)` | `rgba(255,90,168,.25)` |

### Content gradients (photos, medals)

- Gallery placeholders: `linear-gradient(135deg,#7c3aed,#c42ad6 55%,#ff5aa8)`, `linear-gradient(135deg,#c42ad6,#ff5aa8 60%,#ff8a5a)`, `linear-gradient(135deg,#4f46e5,#7c3aed 55%,#c42ad6)`
- Rank medals: Gold `linear-gradient(135deg,#ffd76a,#f0a742)` (text `#3a2600`); Silver `linear-gradient(135deg,#d9dde6,#a7adba)` (text `#2b2f3a`); Bronze `linear-gradient(135deg,#d99a6a,#b26a3c)` (text `#3a1f0a`)

## Typography

Two Google Fonts:

- **Space Grotesk** (400/500/600/700) — headings, numbers, labels, buttons, eyebrows.
- **Manrope** (400/500/600/700/800) — body default, some button labels.

| Use | Font | Size | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Hero / onboarding title | Space Grotesk | 34px | 700 | — |
| Current stop title | Space Grotesk | 30px | 700 | — |
| Page title | Space Grotesk | 28px | 700 | — |
| Section / gallery title | Space Grotesk | 26px | 700 | — |
| Crawl code display | Space Grotesk | 26px | 700 | 5px |
| Big stat number | Space Grotesk | 28px | 700 | — |
| Leaderboard points | Space Grotesk | 24px | 700 | — |
| Banner heading | Space Grotesk | 20px | 700 | — |
| Card / profile name | Space Grotesk | 17–19px | 700 | — |
| List item name | Space Grotesk | 15–16.5px | 700 | — |
| Input text | Space Grotesk | 16–18px | 600 | 4px (code inputs) |
| Button label | Space Grotesk | 15–15.5px | 700 | — |
| Body copy | Manrope | 13–15px | 400–600 | — |
| Small meta | Manrope | 12.5px | — | — |
| Eyebrow label | Space Grotesk | 10–12px | 600 | 2–4px |
| Field label | Manrope | 12px | 700 | 1px |
| Stat label | Manrope | 10px | 700 | 1.5px |
| Nav label | Space Grotesk | 10px | 700 | — |

**Transforms:** leaderboard/group/stop names are `lowercase`. Eyebrows are authored UPPERCASE with wide tracking. Gradient text (e.g. profile "Group Score") uses `--grad` + `background-clip:text` + transparent fill.

## Spacing & layout

- Screen scroll padding: `6px 20px 108px` (bottom clears the tab bar).
- Page header block: `14px 4px 20px`.
- Card padding: primary `20px`, profile `22px`, list rows `16–18px`, chips `5px 11px`.
- Gaps: card stacks `12–16px`, flex rows `6–16px`, stat grid `12px`.
- Stat grid: `grid-template-columns:1fr 1fr; gap:12px`.
- Copy max-width: `280px`.

## Border radius

| Radius | Applies to |
| --- | --- |
| `999px` / `99px` | pills, dots, back button |
| `26px` | large glass cards |
| `24px` | gallery card, floating nav bar |
| `22px` | banners, list rows, leaderboard rows |
| `20px` | avatar tile, role buttons |
| `18px` | inner wells, stat tiles |
| `16px` | inputs, primary buttons, small tiles |
| `14px` | icon tiles, secondary buttons |
| `12px` | small admin icon tiles |

## Shadows

| Element | Value |
| --- | --- |
| Large card | `0 20px 50px rgba(0,0,0,.4)` |
| Gallery card | `0 16px 40px rgba(0,0,0,.35)` |
| Primary button | `0 8px 20px rgba(0,0,0,.35)` (compact `0 6px 16px rgba(0,0,0,.32)`) |
| Google button | `0 10px 26px rgba(0,0,0,.35)` |
| Avatar / icon tile | `0 8px 20px rgba(0,0,0,.3)` |

**Backdrop blur:** cards `blur(20px)`; nav bar `blur(24px)`.

## Animations

```css
@keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.82)} } /* LIVE dots, 1.6s ease-in-out infinite */
@keyframes floatGlow { from{transform:translate(0,0)} to{transform:translate(14px,-18px)} } /* ambient glow */
@keyframes shimmer  { from{background-position:0% 50%} to{background-position:200% 50%} } /* gradient CTA slide on hover */
```

Progress bars transition `all .3s ease`. Global: `-webkit-tap-highlight-color:transparent`, hidden scrollbars.

---

## Recommended Tailwind config (NOT YET APPLIED)

Proposed `tailwind.config.ts` — apply during implementation, not now:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0711',
        shell: '#08060d',
        txt: '#f4f2f8',
        muted: '#9b95ad',
        faint: '#6a637f',
        pink: { DEFAULT: '#ff5aa8' },
        magenta: '#c42ad6',
        violet: { DEFAULT: '#8b5cf6', deep: '#7c3aed' },
        teal: { DEFAULT: '#2dd4bf' },
      },
      borderRadius: { card: '26px', row: '22px' },
      backgroundImage: {
        grad: 'linear-gradient(135deg,#ff5aa8 0%,#c42ad6 52%,#7c3aed 100%)',
        gradsoft: 'linear-gradient(135deg,rgba(255,90,168,.16),rgba(124,58,237,.16))',
      },
      boxShadow: {
        card: '0 20px 50px rgba(0,0,0,.4)',
        btn: '0 8px 20px rgba(0,0,0,.35)',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '.45', transform: 'scale(.82)' } },
      },
      animation: { pulseDot: 'pulseDot 1.6s ease-in-out infinite' },
    },
  },
  plugins: [],
} satisfies Config;
```

Load fonts via `next/font/google` in `src/app/layout.tsx` (Space Grotesk → `--font-space-grotesk`, Manrope → `--font-manrope`), and set the body background/glows in `globals.css`.
