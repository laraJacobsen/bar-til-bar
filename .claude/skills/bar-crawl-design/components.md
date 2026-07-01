# Component Recipes

Tailwind/React recipes for the Bar Crawl UI. These assume the recommended Tailwind tokens in [tokens.md](tokens.md) are applied (`bg-base`, `bg-grad`, `text-pink`, `shadow-card`, etc.). Until then, use the raw arbitrary values shown in comments.

Combine class strings with the existing `clsx` + `tailwind-merge` helpers (both installed).

## Primary button (gradient CTA)

The default action. White text on the signature gradient.

```tsx
<button className="w-full rounded-2xl bg-grad px-5 py-4 font-display text-[15px] font-bold text-white shadow-btn transition active:scale-[.98]">
  Join group →
</button>
// raw: bg-[linear-gradient(135deg,#ff5aa8_0%,#c42ad6_52%,#7c3aed_100%)] shadow-[0_8px_20px_rgba(0,0,0,.35)]
```

Compact variant: `rounded-[14px] px-5 py-3`.

## Secondary / ghost button

```tsx
<button className="rounded-2xl border border-white/[.085] bg-white/[.05] px-5 py-4 font-display text-[15px] font-bold text-txt transition hover:bg-white/[.12]">
  Cancel
</button>
```

## Google sign-in button (stays white)

The ONE non-gradient primary. White fill, dark text, multicolor Google "G".

```tsx
<button className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-body text-[15px] font-extrabold text-[#1a1622] shadow-[0_10px_26px_rgba(0,0,0,.35)]">
  <GoogleG className="h-5 w-5" /> Continue with Google
</button>
```

## Back button (pill)

```tsx
<button className="inline-flex items-center gap-1 rounded-full border border-white/[.085] bg-white/[.05] px-3 py-1.5 text-[13px] text-muted">
  <ChevronLeft className="h-4 w-4" /> Back
</button>
```

## Glass card (primary surface)

```tsx
<div className="rounded-[26px] border border-white/[.085] bg-white/[.045] p-5 shadow-card backdrop-blur-[20px]">
  {children}
</div>
```

Sub-panel / list row / stat tile (quieter): `rounded-[18px] border border-white/[.055] bg-white/[.028] p-4`.

## Highlight banner (gradient-soft)

```tsx
<div className="rounded-[22px] border border-[rgba(255,90,168,.2)] bg-gradsoft p-4">
  {children}
</div>
```

## Input

```tsx
<input
  className="w-full rounded-2xl border border-white/[.055] bg-white/[.028] px-4 py-4 font-display text-[16px] font-semibold text-txt outline-none placeholder:text-faint focus:border-pink"
/>
// code input: add tracking-[4px] text-center uppercase
```

Field label above it: `font-body text-[12px] font-bold tracking-[1px] text-muted`.

## Eyebrow label

```tsx
<p className="font-display text-[11px] font-semibold tracking-[2.5px] text-pink">LIVE EVENT</p>
```

## Pills & badges

```tsx
// LIVE pill
<span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(45,212,191,.14)] px-2.5 py-1 font-display text-[10px] font-bold text-teal">
  <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot" /> LIVE
</span>

// Points badge
<span className="rounded-full border border-[rgba(255,90,168,.25)] bg-[rgba(255,90,168,.14)] px-2.5 py-1 font-display text-[10px] font-bold text-pink">+50 PTS</span>

// Approved badge
<span className="inline-flex items-center gap-1 rounded-full bg-[rgba(45,212,191,.14)] px-2.5 py-1 text-[10px] font-bold text-teal"><Check className="h-3 w-3" /> Approved</span>
```

## Avatar

```tsx
<div className="flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-grad font-display text-[26px] font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,.3)]">
  L
</div>
```

## Icon tile

```tsx
// gradient tile
<div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-grad text-white"><Shield className="h-5 w-5" /></div>
// tinted tile
<div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[rgba(255,90,168,.2)] bg-[rgba(255,90,168,.12)] text-pink"><MapPin className="h-5 w-5" /></div>
```

## Bottom tab bar (floating glass)

Five items — Home, Challenges, Gallery, Leaderboard (Ranks), Profile. Active = pink, idle = faint. The current `src/app/(tabs)/layout.tsx` uses `framer-motion` for the active pill + tap scale — keep that pattern; restyle to these tokens.

```tsx
<nav className="fixed inset-x-4 bottom-4 z-20 flex justify-around rounded-[24px] border border-white/[.085] bg-[rgba(20,16,28,.7)] px-2 py-2 backdrop-blur-[24px]">
  {items.map((it) => (
    <Link key={it.href} href={it.href}
      className={clsx('flex flex-1 flex-col items-center gap-1 py-1', active ? 'text-pink' : 'text-faint')}>
      <it.icon className="h-5 w-5" />
      <span className="font-display text-[10px] font-bold">{it.label}</span>
    </Link>
  ))}
</nav>
```

## Leaderboard row

```tsx
<div className={clsx('flex items-center gap-3 rounded-[22px] p-4',
  rank === 1 ? 'border border-[rgba(255,90,168,.3)] bg-gradsoft shadow-card' : 'border border-white/[.085] bg-white/[.045]')}>
  <div className="flex h-10 w-10 items-center justify-center rounded-[13px] font-display font-bold"
       style={{ background: medalGradient(rank) }}>{rank}</div>
  <div className="min-w-0 flex-1">
    <p className="truncate font-display text-[16px] font-bold lowercase">{name}</p>
    <p className="font-body text-[12.5px] text-muted">{subtitle}</p>
  </div>
  <p className="font-display text-[24px] font-bold text-pink">{points}</p>
</div>
```

## Progress dots / bars

```tsx
// stop segments
<div className="flex gap-1.5">
  {stops.map((s, i) => (
    <span key={i} className={clsx('h-1 rounded-full transition-all', i <= current ? 'w-[22px] bg-pink' : 'w-2.5 bg-white/[.18]')} />
  ))}
</div>
// onboarding: h-1.5, active w-[26px] bg-grad, inactive w-[7px] bg-white/[.12]
```

## Empty state

```tsx
<div className="rounded-[18px] border border-dashed border-white/[.055] p-6 text-center font-body text-[13px] text-faint">
  No pending submissions.
</div>
```

## Do / Don't

- ✅ One gradient (`--grad`) for all primary actions. ❌ New per-button gradients.
- ✅ Glass surfaces (translucent + blur + hairline border). ❌ Opaque gray/slate cards.
- ✅ Teal for success. ❌ Emerald/green.
- ✅ Pink accent. ❌ Rose/red (`#f43f5e`).
- ✅ Space Grotesk for numbers/labels/titles; Manrope for prose.
- ✅ `active:scale-[.98]` / framer tap-scale for tactile feedback.
