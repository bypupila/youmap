# Security: Secret Management

## Incident remediated (2026-04-20)

An environment file with production credentials (`.env.vercel.prod`) had been committed to git history.

Actions completed:

1. Removed `.env.vercel.prod` from current repository state.
2. Rewrote git history to purge `.env.vercel.prod` from all commits.
3. Hardened `.gitignore` to block all `.env*` files except `.env.example`.
4. Added a repository secret scan (`npm run security:secrets`).
5. Added a pre-push git hook to block pushes when secrets are detected.

## Mandatory credential rotation

Any credential that was present in the committed file must be treated as compromised and rotated in its provider:

1. `DATABASE_URL` (Neon Postgres user/password or connection string)
2. `AUTH_SESSION_SECRET`
3. `YOUTUBE_API_KEY`
4. `GOOGLE_GENAI_API_KEY` (or equivalent Gemini key in use)
5. `POLAR_ACCESS_TOKEN`
6. `POLAR_WEBHOOK_SECRET`
7. `VERCEL_OIDC_TOKEN` (if still valid in your environment)

After rotating:

1. Update Vercel Project Environment Variables (`Production` and `Preview`).
2. Update local `.env.local`.
3. Invalidate/revoke old credentials in each provider dashboard.
4. Run `npm run security:secrets` before pushing.

## Team workflow (required)

1. Run once per clone:

```bash
npm run security:install-hooks
```

2. On every push, pre-push hook runs:

```bash
npm run security:secrets
```

3. Never commit any `.env*` file except `.env.example`.
