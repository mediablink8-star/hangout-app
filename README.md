# Hangout Map MVP

Mobile (React Native / Expo) app implementing the hangout-map spec: people 18-29 post spontaneous hangouts, others request to join, hosts approve, exact address hidden until approved. Group chat for members. Safety tools (block/report).

## Layout

- `mobile/` — Expo app (Android + iOS)
- `backend/` — Node/Express + SQLite API (deployable to Render)

## Backend

```
cd backend
npm install
node server.js          # PORT env (default 4000), DB_PATH env
npm test                # age rule + address-hiding rule tests
```

Endpoints: /auth/signup, /auth/signin, /me, /u/:id, /gatherings, /gatherings/:id, /gatherings/:id/requests, /gatherings/:id/messages, /blocks, /reports, /me/gatherings.

## Mobile

```
cd mobile
npm install
npx tsc --noEmit       # type check
npx expo start         # dev server
```

Set `EXPO_PUBLIC_API_URL` to your backend URL (defaults to http://10.0.2.2:4000 for Android emulator).

## Deploy (Render)

Create a Render Web Service from `backend/`, set PORT (Render provides) and DB_PATH. Add a Render Postgres and swap node:sqlite for pg in a follow-up. Mobile: build with EAS (`eas build`).
