# GanApp

Event management for web and Android: registration, QR check-in, evaluations, and certificates.

## Apps

```
ganapp/
├── apps/Web/          # React + Vite (organizers, admin, participants)
├── apps/Mobile/       # Expo / React Native
├── android/           # Native Android project for Expo
├── schemas/           # SQL reference, migrations, and patches
├── supabase/          # Edge functions and local Supabase config
├── packages/shared/   # Small isomorphic helpers (SpeakerService factory)
├── docs/              # User manuals and setup notes
└── scripts/           # Utility scripts
```

Web and Mobile still have their own app dependencies. Event, user, and survey services stay platform-specific. Speaker CRUD is shared via `packages/shared`.

## Requirements

- Node.js >= 20.19
- npm >= 10

## Setup

```bash
npm run install:all
```

Copy env files for each app (see `apps/Web/ENVIRONMENT_VARIABLES.md`). Do not commit `.env` files.

```bash
npm run dev:web      # web at the Vite URL
npm run dev:mobile   # Expo
```

## Useful docs

- Web deploy: `apps/Web/DEPLOYMENT.md`
- Vercel env: `VERCEL_ENV_SETUP.md`
- Job queue: `JOB_QUEUE_SETUP_GUIDE.md`
- Push notifications: `PUSH_NOTIFICATIONS_SETUP.md`
- User manuals: `docs/`

## License

MIT
