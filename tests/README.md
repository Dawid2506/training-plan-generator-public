# End-to-end tests

Playwright regression suite for the Training Plan Generator UI. 82 tests across
every screen the app has, in about 22 seconds.

```bash
npm install
npx playwright install chromium
cp .env.example .env      # fill in, see below
npm test
```

## Before you run

The suite connects to an app that is **already running** — it does not start one.

```bash
cd ../backend  && docker compose up -d   # API on :3000, Postgres on :5434
cd ../frontend && npm run dev            # SPA on :5173
```

## Configuration — `tests/.env`

| Variable | Needed for | Notes |
| --- | --- | --- |
| `BASE_URL` | everything | Defaults to `http://localhost:5173` |
| `API_URL` | everything | Defaults to `http://localhost:3000` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the four `@admin` tests | An existing account with the ADMIN role. Leave blank and those tests skip themselves rather than fail. |
| `DATABASE_URL` | cleanup | Optional. Left blank, the teardown reads `POSTGRES_*` out of `../backend/.env` and reaches the same database on `localhost:5434`. |

`.env` is gitignored. Never commit real credentials.

## Test data

`trainings/` holds the `.fit` files the import tests upload. Supply your own —
any file a bike computer or watch exports will do.

> **These are real ride files.** FIT records GPS traces, so a file usually
> contains the coordinates the ride started from. Think before committing them to
> a public repository.

The suite registers a fresh account for almost every test and deletes them all
afterwards, so a run leaves the database exactly as it found it.

## Commands

| | |
| --- | --- |
| `npm test` | the whole suite |
| `npm run test:headed` | with a visible browser |
| `npm run test:ui` | Playwright's interactive runner |
| `npm run report` | open the last HTML report |
| `npm run typecheck` | type-check the suite itself |
| `npx playwright test --grep @import` | only the FIT-import tests |
| `npx playwright test --grep-invert @admin` | skip the tests needing an admin |

## Layout

```
fixtures/test.ts     the extended `test` every spec imports
pom/                 one page object per screen, locators and actions only
helpers/             user factory, API sign-in, toast matching, database cleanup
specs/               the tests
docs/STRATEGY.md     what is covered, what is not, and why
docs/defects/        the bugs this suite found
```

Specs never type a password or navigate to `/login`: asking for a `page` gives you
a signed-in one. See [`docs/STRATEGY.md`](docs/STRATEGY.md).

## What it found

Three defects, each with a reproduction in `docs/defects/`, plus a fourth pinned
in `specs/auth.spec.ts`:

- [DEF-001](docs/defects/DEF-001.md) — an imported FIT ride can never be deleted
- [DEF-002](docs/defects/DEF-002.md) — the plans table reports "0 plans" while showing plans
- [DEF-003](docs/defects/DEF-003.md) — the Strava status message is in Polish
- the field labelled "Username" only accepts an email address

Four assertions are marked `test.fail()` so the suite stays green while these
stand, and goes red the moment one is fixed.
