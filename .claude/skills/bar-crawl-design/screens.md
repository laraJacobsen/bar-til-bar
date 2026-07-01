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

## Onboarding / Login — `src/app/login/page.tsx` (4-step flow)

Progress bars at top (active `w-[26px] bg-grad`, inactive `w-[7px] bg-white/[.12]`). This is the **reconciled flow** — it follows the mockup's visuals but adjusts the sequence to fit the app (decisions confirmed with the product owner; see notes after the steps). Do NOT implement the raw mockup order literally.

**Architecture: authenticate first, set up group last.**

1. **Welcome** — 88px gradient cocktail icon tile, hero title, **Continue with Google** (white button, see `components.md`) + **Explore demo** (ghost → guest browse at `/`, no auth/event). Clicking Continue runs the Google popup *here* and writes a minimal user doc. The user is now authenticated but **onboarding is incomplete** — they have no role/group yet.
2. **Screen name** — text input for the **screen name** (the handle shown on the leaderboard, gallery, and profile). This is intentionally distinct from the Google account name: prefill the input with the Google `displayName` as a starting suggestion, but the user edits it here and the edited value is what gets stored as `displayName`. Keep this step even though Google provides a name.
3. **Role** — three role-selector cards, kept as **peer options**: Make group / Join group / Admin. Selected = gradient-soft bg + pink border + filled gradient check; unselected = `panel2` bg + `border2` + empty check.
4. **Details** — crawl code input (+ conditional group-name field when role = Make group). **Admin skips this step** (no crawl code / no group). The final button performs the group create/join (`createGroup`/`joinGroup`) and completes onboarding.

**Implementation notes (for whoever builds this — flag these, don't silently skip):**

- **Split `AuthProvider.signIn`.** Today it's one atomic call (Google popup → user doc → resolve crawl code → create/join group) fired from a single form. The new flow needs it split: **(a)** authenticate + write minimal user doc at step 1; **(b)** a separate "complete onboarding" action at step 4 that resolves the crawl code and creates/joins the group. Preserve the existing helpers (`getEventByJoinCode`, `createGroup`, `joinGroup`) and the "one group per participant per crawl" enforcement.
- **Incomplete-onboarding state + route guard.** Because auth now completes before group setup, a user can close the app mid-flow and return authenticated with no group. Add a guard: if the user is signed in but hasn't finished onboarding (no role chosen / no group for a `group` user), route them back into the flow at the right step instead of into the tabs. Resume rather than restart.
- **Screen name vs account name.** Store the edited screen name as `displayName`. If you later need the real Google name too, keep it in a separate field — don't overwrite the screen name with it.
- **Admin is self-serve (unchanged).** Selecting Admin writes `role: 'admin'`; keep the warning/confirmation copy. Admin bypasses steps needing a crawl code/group.

**Restyle:** gradient CTAs, glass card (`rounded-[26px]`), pink accent, teal success box for a created group code, Space Grotesk / Manrope. Keep auth logic and the create/join/admin modes intact.

## Not in the mockup

Existing routes without a redesigned reference: `recap/`, `summary/`, `group/`, `groups/[groupId]/`. Apply the same primitives (glass cards, gradient CTAs, tokens) for consistency; flag to the user if a screen needs its own design pass.
