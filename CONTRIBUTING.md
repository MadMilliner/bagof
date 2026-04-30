# Contributing

Thanks for contributing to Bag of.

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy env file:

```bash
cp .env.example .env.local
```

3. Set a local database URL in `.env.local`:

- `LOCAL_POSTGRES_URL=postgres://...`

4. Start dev server:

```bash
pnpm dev
```

## Before opening a PR

Run:

```bash
pnpm test
pnpm build
```

If either fails, include context in your PR.

## Local git hook (recommended)

This repo includes a pre-commit hook script at `.githooks/pre-commit` that:

- runs `pnpm lint -- --fix`
- runs `pnpm test`
- re-stages updated files with `git add -A`

Enable it once locally:

```bash
git config core.hooksPath .githooks
```

## Code style

- Use TypeScript and keep changes type-safe.
- Prefer shared 8-bit UI components from `components/ui/8bit`.
- Keep feature behavior in feature components; keep DB logic in `db/*`.
- Avoid adding one-off inline styles when reusable class-based styles are possible.
- Preserve accessibility primitives (dialog titles, labels, button semantics).

## PR guidelines

- Keep PRs small and focused.
- Include:
  - what changed
  - why it changed
  - how it was tested
- Add or update tests when behavior changes.

## Open source templates

This repo includes contributor templates in `.github/`:

- Issue templates:
  - `.github/ISSUE_TEMPLATE/bug_report.md`
  - `.github/ISSUE_TEMPLATE/feature_request.md`
- PR template:
  - `.github/pull_request_template.md`

Please use these templates when opening issues and pull requests. They help maintainers reproduce bugs and review changes faster.

## CI expectations

GitHub Actions workflow: `.github/workflows/ci.yml`

- Runs on pull requests and manual dispatch.
- Executes:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

PRs should be green in CI before merge.

## Issue triage labels (suggested)

- `bug`
- `enhancement`
- `docs`
- `good first issue`
- `help wanted`
