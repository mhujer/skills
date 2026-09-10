# Config intents

`create-next-app` **owns** these files: it writes them, and it improves them between releases.
Replacing them wholesale would silently discard whatever upstream added this month. So each one
gets an _intent_ — a change plus the end state that proves it landed — applied to whatever is
actually there. Everything upstream put in a file that no intent mentions stays.

Apply every intent, then check every end state. When a file's shape has moved far enough that the
intent is ambiguous, ask rather than guess.

## `package.json`

Set `name` to the project name. Merge in these scripts, keeping the ones `create-next-app` wrote
(`dev`, `build`, `start`, `lint`):

```json
"lint:fix": "eslint --fix",
"test": "vitest run",
"test:watch": "vitest",
"format": "prettier --write . --list-different",
"format:check": "prettier --check .",
"db:generate": "node --env-file=.env.local ./node_modules/.bin/drizzle-kit generate",
"db:migrate": "node --env-file=.env.local ./node_modules/.bin/drizzle-kit migrate",
"db:studio": "node --env-file=.env.local ./node_modules/.bin/drizzle-kit studio",
"browser": "tsx scripts/open-page.ts"
```

The `db:*` scripts call the binary through `node --env-file` rather than through npx, so
drizzle-kit sees `.env.local` without anything else loading it.

Then set `@types/node` to the major the `Dockerfile` pins in its `FROM node:<major>` line.
`create-next-app` pins an older major than the container runs, and vitest's peer range rejects it —
leaving it alone makes phase 2's very first install die on `ERESOLVE`.

**End state:** `npm run` lists all of the above plus the four upstream scripts, and `@types/node`
names the same major as the `Dockerfile`.

## `tsconfig.json`

Add `"**/*.mts"` to `include`, so `vitest.config.mts` is typechecked. Then add
`".next-agent/types/**/*.ts"` and `".next-agent/dev/types/**/*.ts"` beside upstream's `.next`
entries, so the route types the `agent-dev` server generates into its own `distDir` are typechecked
too.

**End state:** `include` contains `**/*.mts` and both `.next-agent` entries, and `paths` maps `@/*`
to `./src/*`.

## `eslint.config.mjs`

Three changes:

1. Import `eslint-config-prettier/flat` and append it as the **last** element of the exported
   config array, so it disables formatting rules the earlier configs turned on.
2. Add a rules block banning errors swallowed into a `catch`:

```js
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CatchClause > BlockStatement > ReturnStatement > ArrayExpression[elements.length=0]',
        message: 'Do not swallow an error into an empty array — let it throw.',
      },
      {
        selector: "CatchClause > BlockStatement > ReturnStatement > Literal[value=null][raw='null']",
        message: 'Do not swallow an error into null — let it throw.',
      },
    ],
  },
}
```

3. Add `'.next-agent/**'` to upstream's `globalIgnores` list, next to `'.next/**'`.

**End state:** the prettier config is the final array element, `.next-agent/**` is ignored, and
`npm run lint` passes.

## `.gitignore`

Upstream ignores `.env*`, which swallows two files that must be committed: `.env` (the compose
`UID`/`GID`) and `.env.local.example`. Add negations for both after the `.env*` line.

Then ignore the agent server's build output and the browser's screenshots: add `/.next-agent/` next
to upstream's `/.next/`, and `/browser-output/`.

**End state:** `git check-ignore .env .env.local.example` reports neither as ignored, and
`git check-ignore .env.local .next-agent browser-output` reports all three as ignored.

## `AGENTS.md`

`AGENTS.md` is the one instruction file every coding agent reads; `create-next-app`'s `CLAUDE.md`
is just `@AGENTS.md`, which is how Claude reaches it. `create-next-app` writes `AGENTS.md` with
current Next.js guidance — keep all of it. Append this project's commands to the end:

````markdown
## Git

Commit to `main`, do not create branches.

## Automated checks

Run these before each commit:

```bash
npm run format         # Prettier
npx tsc --noEmit       # TypeScript
npm run lint           # ESLint (npm run lint:fix to auto-fix)
npm test               # Vitest
```

## Packages

Install inside this container. Never on the host.

## Dev server

Runs under supervisord — do not start it yourself. Restarting the container would kill this
session; restart just the server instead.

```bash
supervisorctl -c supervisord.conf restart next-dev
tail -f /tmp/next-dev.log /tmp/next-dev.err.log
```

After changing a Client Component, read `/tmp/client-errors.log`; it holds one JSON line for each
browser-side error. The isolated server below writes its own to `/tmp/agent-client-errors.log`.

## Agent browser

Check the app in a browser against the isolated server, `agent-dev`: it runs on
`AGENT_DATABASE_URL` instead of the live database and does not run until asked.

```bash
supervisorctl -c supervisord.conf start agent-dev
supervisorctl -c supervisord.conf status agent-dev
supervisorctl -c supervisord.conf stop agent-dev
tail -f /tmp/agent-next-dev.log /tmp/agent-next-dev.err.log
```

It fails to start with `Not implemented` until `scripts/prepare-agent-database.ts` seeds its
database. Until then, ask before browsing the main server on port 3000, which runs on the live
database.

Open a page in the headless browser with `npm run browser -- URL`. Pass `--width 768` to set the
viewport width and `--screenshot browser-output/page.png` to save a full-page screenshot.

## Database

`$DATABASE_URL` points at the real database. Read-only by default, so a stray write fails
instead of landing. Use the writable connection only when explicitly told to.

```bash
# Read-only (default)
PGOPTIONS='-c default_transaction_read_only=on' psql "$DATABASE_URL_UNPOOLED"

# Writable — immediate and irreversible
psql "$DATABASE_URL"
```
````

**End state:** `AGENTS.md` holds both the upstream guidance and all six sections above, and
`CLAUDE.md` still imports `@AGENTS.md`.

## `README.md`

Replace wholesale with `templates/README.md.tmpl`. This is the one file where overwriting is
right: upstream's README tells you to run `npm run dev` on the host, which is exactly what this
project's workflow does not do.

**End state:** the README describes the docker workflow and points at `AGENTS.md`.

## `src/app/layout.tsx`

Upstream ships `title: "Create Next App"` and `description: "Generated by create next app"`, and
both survive into the production HTML of every project built from this scaffold. Set `title` to the
project name and delete the `description` line — a project that describes itself as nothing says
less than one that describes itself wrongly.

Then import `ClientErrorBoundary` from `@/components/client-error-boundary` and wrap `{children}`
inside `<body>` in it, so a Client Component that throws is reported to the client-error log rather
than only to the browser console.

Touch those three things only. The rest of the file is upstream's, and shadcn edits it again in
phase 2 to wire up its font.

**End state:** `metadata.title` is the project name, the file has no `description`, and `<body>`
renders `<ClientErrorBoundary>{children}</ClientErrorBoundary>`.

## `next.config.ts`

Add two options to upstream's config object:

```ts
// `agent-dev` sets NEXT_DIST_DIR so its build output never collides with next-dev's `.next`.
distDir: process.env.NEXT_DIST_DIR ?? '.next',
// The container publishes the dev server on 127.0.0.1, but Next only trusts the hostname it
// was started with (`localhost`). Without this, browsing at 127.0.0.1 makes every request to
// a dev resource cross-origin, and Next blocks them — including the HMR socket.
allowedDevOrigins: ['127.0.0.1'],
```

**End state:** the config sets `distDir` from `NEXT_DIST_DIR` with `.next` as the fallback, and
`allowedDevOrigins` contains `127.0.0.1`.

## Left alone

`CLAUDE.md`, `postcss.config.mjs`, `src/app/globals.css`, and the rest of `src/app/`. Upstream owns
them and this scaffold has no opinion.
