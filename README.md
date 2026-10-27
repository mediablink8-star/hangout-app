# Hangout Map

Hangout Map helps people ages 18–29 discover spontaneous local gatherings. Hosts approve join requests, exact addresses stay hidden until approval, and members can use group chat. The app also includes blocking and reporting tools.

## Project layout

- `mobile/` — Expo app for iOS, Android, and web
- `backend/` — Express API using Node's built-in SQLite database
- `render.yaml` — Render service blueprint with a persistent disk and generated signing secret

## Local development

Use Node.js 22.13 or newer for both the backend and Expo SDK 58 mobile app.

```sh
cd backend
npm ci
npm test
npm start
```

The API listens on port 4000 by default. Set `DB_PATH` to choose the SQLite file. In production, set `TOKEN_SECRET` to a long random secret; the service refuses to start in production without it.

```sh
cd mobile
npm ci
npx tsc --noEmit
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to the API URL when using a physical device. The default is `http://10.0.2.2:4000` on the Android emulator and `http://localhost:4000` in the iOS simulator or web. Production builds require the deployed HTTPS API URL in the EAS environment. Native sessions are saved with Expo SecureStore; web sessions stay in memory.

## Deploy the API to Render

The repository's `render.yaml` configures a paid single-instance service with a 1 GB persistent disk mounted at `/var/data`. The disk keeps the SQLite database across restarts and deploys. Review the blueprint in Render before creating the service, then set its generated `TOKEN_SECRET` value and confirm the health check at `/health`.

This SQLite deployment is intended for a single API instance. Do not scale it horizontally. Before launch, configure and verify database backups and a restore procedure. For multi-instance scaling, move data and uploaded media to managed services such as PostgreSQL and object storage.

## Mobile release builds

Configure `EXPO_PUBLIC_API_URL` in the EAS production environment with the deployed HTTPS API URL, then run `eas build --platform all --profile production`. The app's iOS and Android store accounts, signing credentials, privacy disclosures, and store listings must be configured separately.

## Security and launch notes

- Passwords are stored with salted scrypt hashes. Existing SHA-256 hashes upgrade after a successful sign-in; require a password reset for accounts that have not signed in before launch.
- Session tokens expire after 30 days and are signed with `TOKEN_SECRET`. Changing this secret logs out existing users.
- Keep production on HTTPS and set restrictive CORS origins if browser clients are enabled.
- Complete the platform privacy forms, moderation and incident response process, database backup verification, and end-to-end release checks before public launch.
