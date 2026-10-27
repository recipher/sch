# Scheduler

A minimal Remix application starter with a home page.

## Starter Shape

- `app/actions/controller.tsx` owns the top-level route actions.
- `app/actions/home-page.tsx` and `app/actions/document.tsx` render the route-owned starter UI.
- `app/actions/public/` contains the browser runtime entry and interactive prompt button.
- `app/routes.ts` defines the shared route contract used by server and browser modules for type-safe hrefs.
- `app/router.ts` wires routes to handlers and installs the standard Remix component renderer used by actions.
- `app/assets.ts` owns the server-side asset pipeline used by the asset route and render middleware.
- Root `public/` contains static files served unchanged from the app root.

## Growing The App

- Put top-level route actions in `app/actions/controller.tsx`.
- Add `app/actions/<route-key>/controller.tsx` when a nested route map needs its own actions or middleware.
- Add directories like `app/data/` or `test/` when the app actually needs them.
- Move shared UI into `app/ui/` once more than one route needs it.

## Commands

```sh
npm i
npm run dev
npm run hmr
npm run start
npm test
npm run test:e2e
npm run test:coverage
npm run typecheck
npm run db:migrate
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs the server in development mode, restarting it when files change. |
| `npm run hmr` | Runs the server in development mode with live server and browser updates. |
| `npm run start` | Runs the server in production mode, with no separate build step. |
| `npm test` | Runs the unit tests. |
| `npm run test:e2e` | Runs the end-to-end browser tests with Playwright. |
| `npm run test:coverage` | Runs the tests with a coverage report for `app/`, excluding test files, and fails if coverage drops below the limits in `remix.json` (95% statements and lines, 90% branches and functions). |
| `npm run typecheck` | Type-checks the project with `tsc` without emitting files. |
| `npm run db:migrate` | Applies pending migrations from `db/migrations/` to `db/app.sqlite`, using the `db` settings in `remix.json`. |

The server also applies pending migrations at startup. Other database commands are available through the Remix CLI, for example `npx remix db status` and `npx remix db rollback`.
