---
name: scaffold-nextjs
description: Scaffold a new Next.js project with Docker, supervisord, drizzle and a PGlite test harness.
disable-model-invocation: true
---

# scaffold-nextjs

Scaffolds a Next.js project that Claude Code then works on from **inside** its own container.

The work is split across a container boundary, because npm belongs in the container and not on the
host. **Phase 1** runs in a throwaway `node:24` container and writes files without ever running
them. The human then builds and starts the real container. **Phase 2** runs inside that container,
installs everything, and proves it works.

## Which phase

Look for `SCAFFOLD.md` in the working directory.

- **It exists** → you are in phase 2. Read [`PHASE-2.md`](PHASE-2.md) and follow it instead of
  this file.
- **It does not exist** → you are in phase 1. Continue below.

## Phase 1

You have node but no docker, so you can write and scaffold but you cannot build, install or run
anything. That is the point: phase 1 writes **blind**, and phase 2 is where it first gets executed.

Do not run `npm install`, `tsc`, `eslint`, `prettier` or `vitest` here. There is no `node_modules`
and there will not be one until the real container boots.

The project name is the working directory's basename, lowercased with spaces and underscores
turned into hyphens. Nothing is prompted for: the timezone is always `Europe/Prague` and the ports
are always 3000 and 9001.

### 1. Guards

Stop, with a message naming what is wrong, unless both hold:

- The working directory is empty (ignoring `.` entries).
- All of these exist: `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, `~/.claude/skills`,
  `~/.claude/hooks`, `~/.claude/plugins`, `~/.claude/claude-code-status-line.py`, `~/.gitconfig`,
  `~/.npm`.

The second guard matters because `docker-compose.yml` bind-mounts every one of those paths. A
missing one makes docker silently create a root-owned directory in its place, and that surfaces at
`docker compose up` — after the human has already exited this session. You are checking them as
mounted into _this_ container, so if one is reported missing, the launch command in
[`README.md`](README.md) is the first thing to check.

### 2. Scaffold with create-next-app

Run `npx create-next-app@latest --help` first and read the flags — this CLI changes, and flags
named here may have moved. Then scaffold into the current directory with:

- TypeScript, Tailwind, ESLint, App Router, `src/` directory, import alias `@/*`, npm
- an empty starter page rather than the demo page
- **skip install** — this is the flag the whole phase split exists for

Passing any flag puts the CLI in non-interactive mode, so it will not prompt.

### 3. Copy the templates

Copy everything in `templates/` into the project, applying three renames and one substitution:

- `dot-<name>` → `.<name>`
- `<name>.tmpl` → `<name>`
- `templates/dot-env.local.example` → **both** `.env.local` and `.env.local.example`
- `{{PROJECT_NAME}}` → the project name, everywhere it appears

Then write `.env` — which docker compose reads automatically — with the current user's ids:

```
UID=<id -u>
GID=<id -g>
```

Leave `templates/SCAFFOLD.md.tmpl` for step 5; it is not part of this copy.

### 4. Apply the config intents

`create-next-app` owns `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`,
`CLAUDE.md` and `README.md`, so those are patched rather than replaced. Follow
[`CONFIG-INTENTS.md`](CONFIG-INTENTS.md) and check every end state it names.

### 5. Hand off

1. `create-next-app` has already run `git init` **and** made a commit of its own. Discard both and
   start clean: `rm -rf .git && git init`. Make no commit here — phase 2 makes the only one in the
   repository, once the scaffold is proven.
2. Write `SCAFFOLD.md` from `templates/SCAFFOLD.md.tmpl`.
3. Print to the terminal, so the human can act on it without opening a file:

   ```
   Phase 1 done. From the host, in this directory:

     docker compose up -d --build
     docker compose exec app claude

   Then in that session: /scaffold-nextjs
   ```

**Phase 1 is done when `SCAFFOLD.md` exists and those commands have been printed.** Nothing here
has been executed or verified, and saying otherwise would be false — say plainly that phase 2 is
where it gets checked.
