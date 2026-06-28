# Bar Til Bar

A modern, mobile-first PWA for managing a bar crawl event with team routes, challenges, photo submissions, live leaderboard updates, and an admin dashboard.

## Features
- Google authentication and display name capture
- Team join flow with team code or admin assignment
- Admin dashboard for events, bars, challenges, routes, teams, submissions, scoring, and recap
- Mobile-first team experience with home, challenges, gallery, leaderboard, and profile views
- Firebase-backed data model and storage for photos
- PWA support for offline-friendly mobile use

## Tech stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Firebase Auth, Firestore, Storage
- PWA via next-pwa

## Local development
1. Install dependencies with `npm install`
2. Create a Firebase project and add environment variables
3. Run `npm run dev`

## Environment variables
Create a `.env.local` file with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Deployment
Deploy to Vercel after connecting the GitHub repository and adding the same environment variables.
