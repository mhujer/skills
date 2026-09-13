# Phase 2

You are inside the project's own container. Phase 1 wrote every file **blind** — there was no
`node_modules`, so not one line of it has been executed. Treat the tree as unverified: a file that
looks plausible has not been checked, and the harness in `tests/` has never run.

Your job is to install what is missing, make the whole thing actually work, and only then commit.

## 1. Install the added dependencies

The container already ran `npm install` on boot, which installed what `create-next-app` pinned.
These are the ones this scaffold adds:

```bash
npm install drizzle-orm postgres server-only zod
npm install -D drizzle-kit @electric-sql/pglite vitest prettier prettier-plugin-tailwindcss eslint-config-prettier tsx playwright-core
```

Install **by name only**. npm resolves the current version and writes the range itself, which is
why this skill carries no version numbers to go stale. The single exception is a `@types/*`
package, which tracks the major of the runtime it describes rather than the newest published — this
is why phase 1 sets `@types/node` from the `Dockerfile`.

If npm reports an `ERESOLVE` peer conflict, read which package the peer range rejects and align
that package with the runtime, then install again. Resolve the conflict rather than overriding it:
`--force` and `--legacy-peer-deps` both produce a tree that installs here and breaks later.

## 2. Initialise shadcn

Run `npx shadcn@latest init --help` and read the flags — this CLI's options have changed more than
once. Then initialise non-interactively into the existing Next.js app with three choices: the
**base** component base (Base UI, which is what shadcn defaults new projects to), the **nova**
preset, and CSS variables for theming.

Pass the preset as its own flag. `--yes` does not answer the preset prompt, so omitting it hangs
the CLI on a menu and then kills it for want of a TTY; `--defaults` answers that prompt but carries
a component base of its own, overriding the one you asked for.

This is what writes `components.json`, patches `globals.css`, creates `src/lib/utils.ts` with `cn`,
and pulls its own dependencies. The skill records the choices, not the file, so whatever shadcn
considers current is what you get.

## 3. Generate the first migration

```bash
npm run db:generate
```

`src/db/schema.ts` holds one throwaway table, `scaffold_check`, and this turns it into a real
migration in `drizzle/`. That migration is what the test harness replays into its PGlite snapshot —
without it, `tests/global-setup.ts` has nothing to migrate and the whole harness fails.

Leave `npm run db:migrate` alone. `.env.local` holds a placeholder connection string, so migrating
would either fail or hit whatever real database the placeholder was replaced with.

## 4. Make it green

Fix what phase 1 got wrong. Every one of these must pass:

- [ ] `npm run format`
- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm test` — including both `tests/scaffold-check.test.ts` cases. They are order-dependent by
      design: the second passes only because the first inserted a row and the `afterEach`
      truncation removed it. If it fails, the harness is broken, not the test.
- [ ] `npm run build` — the only check that exercises the code path you deploy. A scaffold that has
      only ever run `next dev` leaves its first production build for the first deploy to discover.
- [ ] The dev server answers on `http://localhost:3000`. Restart it first, since it booted before
      the new dependencies existed:
      `supervisorctl -c supervisord.conf restart next-dev`, then curl the port. Check
      `/tmp/next-dev.err.log` if it does not come up.
- [ ] The headless browser works:
      `npm run browser -- http://localhost:3000 --screenshot browser-output/check.png` exits 0 and
      writes the screenshot. Delete `browser-output/` afterwards.
- [ ] `agent-dev` fails **the intended way**: `supervisorctl -c supervisord.conf start agent-dev`
      reports a start error, and `/tmp/agent-next-dev.err.log` contains `Not implemented`. Any
      other error — a guard, a missing module — means the wiring is broken.

## 5. Finish

Only once every box above is ticked:

1. Delete `SCAFFOLD.md`.
2. `git add -A` and make one commit — the first in the repository.

**If you cannot get something green:** leave `SCAFFOLD.md` in place, write what failed and what you
tried into its Status section, make no commit, and tell the human. Re-invoking `/scaffold-nextjs`
then resumes here rather than starting over. The missing commit and the surviving `SCAFFOLD.md` are
what keep a half-built scaffold from being mistaken for a finished one — so never commit around a
failure, and never delete `SCAFFOLD.md` to tidy up.

## What this scaffold deliberately omits

Say so if the human asks where they are: no authentication, no `docs/`, no `tests/fixtures/`, no
backup scripts, no agent database seeding — `scripts/prepare-agent-database.ts` throws until the
project implements it — and no vendored shadcn components — `npx shadcn@latest add <component>` fetches
those on demand.
