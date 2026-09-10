# scaffold-nextjs — how to start it

This skill runs in two phases and cannot launch the first one itself: phase 1 needs a container
that already has node and your `~/.claude`, and that is the one thing the scaffold cannot scaffold.

From an **empty directory** on the host:

```bash
docker run --rm -it \
  -u "$(id -u):$(id -g)" \
  -e HOME=/home/node \
  -e CLAUDE_CONFIG_DIR=/home/node/.claude \
  -v "$PWD:$PWD" -w "$PWD" \
  -v "$HOME/.claude:/home/node/.claude" \
  -v "$HOME/.gitconfig:/home/node/.gitconfig:ro" \
  -v "$HOME/.npm:/home/node/.npm" \
  node:24 bash -c 'curl -fsSL https://claude.ai/install.sh | bash && exec /home/node/.local/bin/claude'
```

Then type `/scaffold-nextjs`.

Worth an alias — `alias scaffoldclaude='...'` — since you will run it once per new project.

The mounts are deliberately the same set that the generated `docker-compose.yml` will mount, so
phase 1's guard checks the same paths the real container will need.

**If your uid is not 1000**, `/home/node` in the `node:24` image is not writable by you and the
Claude install will fail. Point `HOME` somewhere you own instead, and mount `~/.claude` under it.

## After phase 1

Phase 1 exits having written files but run nothing. From the host:

```bash
docker compose up -d --build
docker compose exec app claude
```

Then `/scaffold-nextjs` again — it finds `SCAFFOLD.md` and continues as phase 2.

## What's in here

| File                |                                                            |
| ------------------- | ---------------------------------------------------------- |
| `SKILL.md`          | Phase routing, and phase 1 in full                         |
| `PHASE-2.md`        | Phase 2 — loaded only inside the built container           |
| `CONFIG-INTENTS.md` | Patches for the files `create-next-app` owns               |
| `templates/`        | Files copied verbatim, with `{{PROJECT_NAME}}` substituted |
