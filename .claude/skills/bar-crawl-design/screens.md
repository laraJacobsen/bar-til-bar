# Screen Layouts

Structure and content for each screen in the "Bar Crawl" redesign. All screens are mobile single-column with a page-header block (eyebrow + title), stacked glass cards, and the floating tab bar (except overlays). Map to the existing routes under `src/app/`.

Shared: **status bar** feel at top, **page header** (`eyebrow` in pink + big Space Grotesk title), then cards with `12–16px` gaps, bottom padding `108px` to clear the tab bar.

## Home — `src/app/(tabs)/page.tsx`

- Eyebrow **LIVE EVENT** + title **"Saturday Night Crawl"**.
- Admin banner (gradient-soft): shield icon + "Control Center" button — only for admins.
- Live event glass card: group-code input + **Join group →** gradient CTA.
- "First Stop" teaser row (icon tile + stop name/meta).

## Challenges / Current Stop — `src/app/(tabs)/challenges/page.tsx`

- Eyebrow **CURRENT STOP** + title (lowercase bar name, e.g. "moonlight").
- Stop banner with progress dots + "STOP 1 OF 3".
- Challenges card: rows of challenge name + points badge (+50 PTS) + **Submit** button.
- "Just for fun" row with a **Camera** button.
- Admin-only gradient-soft **"Advance crawl"** card.

## Gallery — `src/app/(tabs)/gallery/page.tsx`

- Eyebrow **EVENT GALLERY**.
- Vertical list of photo cards: `180px` gradient image (placeholder), title + group name, **Approved** teal badge. Bottom scrim `linear-gradient(180deg, transparent 55%, rgba(10,7,17,.5))`.

## Leaderboard — `src/app/(tabs)/leaderboard/page.tsx`

- Eyebrow **LEADERBOARD** + subtitle "Saturday Night Crawl" + **LIVE** pill.
- Ranked rows with medal tiles (gold/silver/bronze gradients), lowercase names, points in pink. Rank 1 uses gradient-soft bg + pink border.

## Profile — `src/app/(tabs)/profile/page.tsx`

- Title **"Hey, Luka"**.
- Profile card: 60px gradient avatar + name/email + 2×2 stat grid (Challenges, Approved, **Group Score** as gradient text, Current Stop).
- Account card: **Admin Control Center** + **Log out** buttons.

## Admin Control Center — `src/app/admin/page.tsx` (overlay in mockup)

- Back pill + eyebrow **ADMIN** + title "Control center".
- Event card: name, date range, Edit / End Crawl buttons, crawl code display (`98KAKG`, tracking 5px in a dark well), stop chips.
- Approval Queue card (empty state when none).
- Photos by Group list.

## Onboarding / Login — `src/app/login/page.tsx` (4-step overlay in mockup)

Progress bars at top (active `w-[26px] bg-grad`). Steps:

1. **Welcome** — 88px gradient cocktail icon tile, hero title, **Continue with Google** (white button) + **Explore demo** (ghost).
2. **Name** — display-name input.
3. **Role** — three role-selector cards: Make group / Join group / Admin. Selected = gradient-soft bg + pink border + filled gradient check.
4. **Details** — crawl code input (+ conditional group-name field for "Make group").

> The current `login/page.tsx` implements all steps as one form with a slate/rose theme and white pill buttons. Restyle to these tokens: gradient CTAs, glass card (`rounded-[26px]`), pink accent, teal success box for the created group code, Space Grotesk/Manrope. Keep the existing auth flow logic (`useAuth`, modes create/join/admin) intact.

## Not in the mockup

Existing routes without a redesigned reference: `recap/`, `summary/`, `group/`, `groups/[groupId]/`. Apply the same primitives (glass cards, gradient CTAs, tokens) for consistency; flag to the user if a screen needs its own design pass.
