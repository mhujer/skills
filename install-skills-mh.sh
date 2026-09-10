#!/usr/bin/env bash
set -euo pipefail

# Copies skills from this repo into the local skill directories used by each
# agent harness:
#   - ~/.claude/skills: Claude Code
#   - ~/.codex/skills:  Codex
#
# Two sources: a hand-picked selection from the upstream skills/ tree, plus
# everything in skills-mh/ (my own skills, all of them, no list to maintain).
#
# Real copies, not symlinks: those directories are shared with every project
# container, where this repo is not mounted and $HOME has a different name, so
# a link into the repo would dangle there. The price is that a copy does not
# follow the repo: re-run after a `git pull`, after editing a skill, and after
# adding, removing, or renaming one.

REPO="$(cd "$(dirname "$0")" && pwd)"
DESTS=("$HOME/.claude/skills" "$HOME/.codex/skills")

# Selected upstream skills, looked up under skills/ whichever bucket folder
# they happen to live in.
UPSTREAM_SKILLS=(
  code-review
  codebase-design
  diagnosing-bugs
  domain-modeling
  grill-me
  grill-with-docs
  grilling
  handoff
  implement
  improve-codebase-architecture
  prototype
  setup-matt-pocock-skills
  tdd
  teach
  to-spec
  to-tickets
  wait-what
  writing-for-agents
)

# Index the upstream tree once: name -> path.
declare -A upstream=()
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  if [ -n "${upstream[$name]:-}" ]; then
    echo "error: two upstream skills named '$name': ${upstream[$name]} and $src" >&2
    exit 1
  fi
  upstream["$name"]="$src"
done < <(find "$REPO/skills" -maxdepth 3 -name SKILL.md -not -path '*/node_modules/*' -print0)

# Resolve the selection before touching any destination, so a typo fails the
# whole run instead of half-installing.
names=()
srcs=()
missing=()
for name in "${UPSTREAM_SKILLS[@]}"; do
  if [ -z "${upstream[$name]:-}" ]; then
    missing+=("$name")
  else
    names+=("$name")
    srcs+=("${upstream[$name]}")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "error: no SKILL.md found under $REPO/skills for: ${missing[*]}" >&2
  exit 1
fi

# Everything under skills-mh/, unconditionally. A name here shadows the
# upstream skill of the same name.
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  replaced=0
  for i in "${!names[@]}"; do
    if [ "${names[$i]}" = "$name" ]; then
      echo "note: skills-mh/$name shadows ${srcs[$i]#$REPO/}" >&2
      srcs[$i]="$src"
      replaced=1
      break
    fi
  done
  if [ "$replaced" -eq 0 ]; then
    names+=("$name")
    srcs+=("$src")
  fi
done < <(find "$REPO/skills-mh" -maxdepth 2 -name SKILL.md -not -path '*/node_modules/*' -print0)

for DEST in "${DESTS[@]}"; do
  mkdir -p "$DEST"

  # Project containers mount these directories read-only, so the install runs
  # on the host. Say that plainly instead of failing halfway through a copy.
  if [ ! -w "$DEST" ]; then
    echo "error: $DEST is not writable (read-only inside a container?)." >&2
    echo "Run this script on the host." >&2
    exit 1
  fi

  for i in "${!names[@]}"; do
    name="${names[$i]}"
    src="${srcs[$i]}"
    target="$DEST/$name"

    rm -rf "$target"
    cp -a "$src" "$target"
    echo "copied ${src#$REPO/} -> $target"
  done
done
