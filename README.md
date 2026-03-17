# Movie Recommender

Nuxt-based movie browsing app built on TMDB data and Supabase authentication.

## Current State

- `frontend/` contains the Nuxt application, TMDB proxy, auth flows, and watched-history UI.
- `docs/` contains the developer documentation site.
- The previous in-house similarity model and recommendation endpoints have been removed.

This repository is now a clean foundation for a future external-provider recommendation flow.

## Setup

### Environment Variables

1. Copy `.env.example` to `.env` in the `frontend/` directory:
```bash
cd frontend
cp .env.example .env
```

2. Fill in the required API keys and configuration:

| Variable | Source | Required |
|---|---|---|
| `NUXT_TMDB_API_KEY` | [TMDB API](https://www.themoviedb.org/settings/api) | Yes |
| `NUXT_GEMINI_API_KEY` | [Google AI Studio](https://ai.google.dev) | Yes |
| `NUXT_LIBSQL_URL` | Local: `file:../database/local.db` or Turso | Yes |
| `NUXT_LIBSQL_AUTH_TOKEN` | Turso (if using remote) | No (local dev) |
| `NUXT_PUBLIC_SUPABASE_URL` | [Supabase Project Settings](https://supabase.com) | Yes |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings | Yes |
| `ADMIN_API_TOKEN` | Create a secure token (e.g., `openssl rand -hex 32`) | Yes |

### Running the App

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`.
