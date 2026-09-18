# Nocturne backend

Node.js / Express / TypeScript API for Nocturne, a dating app for the
alternative and goth community. MongoDB (Mongoose) for storage, Socket.io for
real-time chat/presence, Stripe for paid event tickets, RevenueCat for
subscriptions, Cloudinary for media, Firebase Admin for push notifications.

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your own values.
3. `npm run dev` — starts the server with hot-reload (`tsx watch`).

Push notifications need a Firebase service account: either set
`FIREBASE_SERVICE_ACCOUNT` (a raw JSON string) or, for local development only,
place the service account key file at the repo root and it will be picked up
automatically (see `src/infrastructure/config/firebase-admin.ts`). Never
commit that file — it's already gitignored.

## Dev vs production database

Local development and the deployed (Railway) backend should point at **two
separate MongoDB databases**, not the same one. Use a distinct database name
in `MONGO_URI` for each (e.g. a `nocturne` database for production and a
`nocturne_dev` one for local work on the same cluster). This keeps test/seed
data from ever mixing with real user data — nothing in the code enforces
this, it's purely a matter of what `MONGO_URI` each environment is
configured with.

`NODE_ENV=production` (set by the hosting platform) disables the `/api/dev`
routes (mock/seed/reset endpoints), so those are never reachable on the
production deployment regardless of database.

## Forced app update

Set `MIN_APP_BUILD` (a build number, the part after `+` in the Flutter
`pubspec.yaml` version) to require a minimum mobile app version. Requests
from older builds get an HTTP 426 `UPDATE_REQUIRED` response, and the app
shows a blocking "update required" screen. The app announces its build in
its `User-Agent` (`Nocturne/<version>+<build>`); builds that predate this
report a plain `Dart/...` agent and are treated as outdated. Requests that
are not from the mobile app (web admin panel, webhooks, curl) are never
blocked by this check.

The check is disabled while `MIN_APP_BUILD` is unset. When releasing, set it
only once the new build is available to users, otherwise you lock out
everyone who cannot update yet. `GET /api/app/version` returns the current
minimum and stays reachable for outdated apps.

## Available scripts

- `npm run dev` — run locally with hot-reload.
- `npm run build` / `npm start` — compile to `dist/` and run the compiled build.
- `npm run create-admin -- admin@example.com aPassword <linkedUserId>` —
  create an admin login. `linkedUserId` is the Mongo `_id` of an existing
  mobile account: that account receives the push notification used to
  approve admin web logins and to review events/reports from the phone.
- `npm run change-admin-password -- admin@example.com newPassword` — reset an
  admin's password.
- `npm run lint` / `npm run format` / `npm test`

## Testing the Flutter app against your local backend

The app's `ApiService.baseUrl` always points at production in a release
build. In debug (`flutter run`), it defaults to `10.0.2.2` (Android emulator)
or `localhost` (iOS Simulator). To test from a **real phone** on the same
network as your dev machine, pass your machine's local IP explicitly:

```
flutter run --dart-define=API_BASE_URL=http://<your-local-ip>:3000/api
```
