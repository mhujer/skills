---
name: implement-spec
description: "Implement the result of /to-spec and /to-tickets in code."
disable-model-invocation: true
---

You have been provided a spec. This spec should have tickets associated with it, describing how to implement the spec.

The issue tracker should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`.

The goal is the entire spec implemented on a single **integration branch**, with every ticket resolved the way the issue tracker closes work.

The tickets are not a list of steps. They are a **task graph** with blocking relationships between them. This means there is always a **frontier** of tickets which are ready to be grabbed.

Start every subagent with a fresh context window.

Communication to and from subagents should be sparse. Communicate primarily through **context pointers**: to the spec, tickets, research notes, and previous commits. Don't duplicate information already available via pointers.

All work happens in the current workspace, on the integration branch. **Implementer subagents** therefore run one at a time: dispatch the next one only after the previous one has reported done.

## Steps

1. Read the spec and tickets to understand the task graph.

2. (optional) Use an **exploration subagent** to conduct any exploration required by the tickets - relevant codebase files or external documentation. Ensure the exploration subagent can save files - it should save its markdown notes in the current workspace, accessible by all future subagents. This lets **implementer subagents** focus on implementation rather than exploration.

3. Create the integration branch and check it out.

4. Pick one ticket from the **frontier** and dispatch a fresh **implementer subagent** for it. The implementer subagent:
   - calls the Skill tool with `tdd` to build the ticket;
   - runs typechecking regularly, single test files regularly, and the full test suite once at the end;
   - commits its work to the integration branch before reporting done.

5. Once the **implementer subagent** completes, resolve its ticket the way the issue tracker closes work. If resolving changes files (a local tracker's `Status:` line), amend the implementer's commit with that change.

6. Resolving a ticket moves the **frontier**. Repeat steps 4 and 5 until every ticket is resolved.

7. Call the Skill tool with `code-review` on the integration branch. Fix all issues raised by the code review in a single fresh **implementer subagent**.

8. Report the integration branch and offer to merge it into main with a merge commit.
