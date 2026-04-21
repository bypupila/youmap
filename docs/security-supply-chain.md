# Supply Chain Hardening

This repo now enforces a stricter baseline against the class of CI and package supply-chain issues described by OpenAI in its April 10, 2026 Axios incident write-up.

## Controls in place

### 1. GitHub Actions pinned by commit SHA

- All third-party GitHub Actions in `.github/workflows` must use full 40-character commit SHAs.
- `npm run security:workflow-pinning` fails CI if a floating reference such as `@v4` or `@main` is introduced.

### 2. Safer dependency install in security CI

- The security workflow uses `npm ci --ignore-scripts`.
- This avoids executing package lifecycle scripts during jobs that only need repo scanning and policy checks.

### 3. Minimum package release age

- `npm run security:deps-age` checks every locked npm package version against the npm registry publish time.
- Default minimum age: `72` hours.
- Override in CI only if intentionally needed:

```bash
MIN_PACKAGE_RELEASE_AGE_HOURS=72 npm run security:deps-age
```

This is intended to reduce the risk from freshly published malicious packages in the lockfile.

### 4. Automated dependency maintenance

- Dependabot is enabled for both npm packages and GitHub Actions.
- Runtime/framework updates are grouped so framework upgrades can be reviewed intentionally.

### 5. Next.js 14 runtime mitigation

This project is currently on Next 14.2.x. `npm audit` still reports advisories that do not have a non-breaking fix in this major.

Mitigations applied now:

- `images.unoptimized = true` disables the built-in `next/image` optimizer attack surface for self-hosted deployments.
- `poweredByHeader = false`
- additional hardening headers in `next.config.mjs`

Residual risk:

- some framework-level advisories for Next 14 remain until the project is upgraded to a fixed major/version line.
- no `rewrites` are configured in this repo today, which narrows exposure for the rewrite-smuggling advisory.

## Operational guidance

- Do not use floating action refs in workflows.
- Prefer `npm ci` over `npm install` in CI.
- Keep `package-lock.json` committed and reviewed.
- Do not bypass the package-age policy without a conscious exception review.
- Upgrade Next.js to a fixed major/version line as a dedicated follow-up once compatibility is validated.
