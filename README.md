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

## Private Memories and photo sharing

Memories are created for a gathering when its host or an approved attendee opens the album. Current membership is checked on every Memory metadata, upload, download, delete, and publish request. Pending, declined, and revoked attendees cannot read an album. Public recaps contain only the selected image IDs, with a per-publication consent version and timestamp. Public images are served through authenticated API routes; feed responses do not contain storage keys, Memory IDs, or gathering locations.

Memory photo uploads require persistent S3-compatible object storage. No local or SQLite storage fallback is used. Set these backend environment variables before enabling uploads:

- `S3_BUCKET` — private bucket name.
- `S3_REGION` — bucket region.
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` — least-privilege bucket credentials.
- `S3_ENDPOINT` — optional S3-compatible endpoint (for example, an R2 or MinIO endpoint); omit for AWS S3.
- `FFMPEG_PATH` — required to publish videos; absolute path to a trusted FFmpeg executable installed with H.264/AAC support. Video sharing fails closed with a clear error if it is missing.

Keep bucket public access blocked and allow the API service only the object read/write/delete permissions it needs. The app serves private files through membership-checked API routes and does not hand clients permanent object URLs. `S3_ENDPOINT` uses path-style addressing. Configure these variables on the API deployment (for Render, in the service environment), not in the mobile app. Uploads return a clear 503 until storage is configured.

Uploads accept JPEG, PNG, WebP, MP4, and MOV up to 8 MB. The API inspects and re-encodes images before storage; stored JPEGs have EXIF/GPS and embedded metadata removed. Private videos remain in the private bucket and stream only to currently authorized attendees. **Public video sharing requires `FFMPEG_PATH`:** the API transcodes to MP4 while removing metadata and chapters, and refuses to publish if FFmpeg is absent or processing fails. This repo does not bundle FFmpeg; install and validate a trusted build on the API host before enabling public video sharing. The previous feed endpoint no longer accepts new base64 data-URL media. Existing legacy media URLs are omitted from feed responses; remove legacy base64 records using a reviewed backup-and-cleanup operation before launch if data minimization requires removing them from SQLite.

Sharing consent currently records the versioned in-app confirmation, publisher, post, and selected media relationships. The confirmation explains that identifiable people need permission and that removal requests are available. This is not a substitute for legal/privacy review or a richer consent workflow. Reports and photo removal requests enter the existing moderation reports queue; moderators still need an operational response SLA and removal policy before public launch.

The migration is additive and idempotent: startup creates `memories`, `memory_media`, `post_memory_media`, and `memory_share_consents` with foreign keys and indexes. It does not reset or rebuild the existing SQLite database. Back up production data before deployment and verify restoration as part of release operations.

## Reversible demo dataset

To test the app with sample users and activity against the database selected by `DB_PATH`, run these commands from `backend/`:

```sh
npm run demo:seed
npm run demo:reset
```

The seed creates five fictional accounts, Athens-area gatherings, a mix of approved and pending join requests, feed posts, follows, likes, and gathering chats. Seeding again replaces only the demo fixture records. Reset deletes only records with the `demo-` namespace or the `@demo.hangout.test` emails; it does not wipe real users or their content.

**Demo login:** `alex@demo.hangout.test`  
**Password:** `HangoutDemo2026!`

Other fictional accounts are `maya@demo.hangout.test`, `leo@demo.hangout.test`, `sofia@demo.hangout.test`, and `niko@demo.hangout.test`; they share the same demo password. These credentials are for local/staging testing only. Run the command against the intended database explicitly; the script does not automatically seed production on deployment.
