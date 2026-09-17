---
name: implement-issues
description: Implement every ready issue in a feature directory, one subagent at a time.
argument-hint: '<path to the feature directory>'
disable-model-invocation: true
---

I want you to run as the **orchestrator** and run subagents one after another to implement issues in the user provided directory. Conserve your precious context.

## Process

1. Read the header of every issue file under the directory the user named. `to-tickets` writes them as `<NN>-<slug>.md`, numbered in dependency order; each header carries a **Status** line and a **Blocked by** line, and those two fields are all you need.
2. Queue the `ready-for-agent` issues. Anything with another status stays out, and so does anything blocked by an issue you left out: its blocker will never resolve in this run.
3. Work the queue in dependency order, blockers first, one issue at a time. An issue is ready to dispatch once every issue it is blocked by is `resolved`. Dispatch it as a subagent (the Agent tool) whose prompt tells it to call the Skill tool with `implement`, passing the issue path but with extra instruction to not do code review using /code-review (will be done at the end)
4. When each subagent finishes, check that it committed something to git. A subagent that lands no commit has not finished. Halt there, and report what ran, what did not, and what you left out of the queue.
5. Unless the subagent did it itself, mark the issue as `resolved` and amend the subagent's commit.

After all tickets are implemented, use /code-review to review the work done in all the tickets and implement the fixes using another subagent.

**Done when every queued issue is `resolved` and carries a commit, or the run halted at the first subagent that landed none.** Report the queue either way.
