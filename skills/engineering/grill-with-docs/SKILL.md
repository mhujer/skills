---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
---

Call the Skill tool twice, for "grilling" and "domain-modeling".


## Preparatory refactoring

Your instinct is to fit the feature into the current structure. Weigh a **preparatory refactoring** against it: make the change easy, then make the easy change. Picture the shape the project would have in **hindsight**, built by someone who knew this feature was coming. Then find the refactoring that takes today's code there. It may be large and reshape code structure, the data model, or the defined domain language. A refactoring that ships no business value on its own is completely fine: the value lands with the feature that follows.

Suggest the refactoring whenever it would make the feature simpler; whether it is worth the cost is the user's call. Keep watching for it in later rounds: an answer can expose **friction**, where the way the user wants the feature built fights the current structure.

When you raise it, make it a numbered question that compares the two plans side by side: the user's plan, and the refactoring with the modules and files you read, what it costs, and what it makes easier. Recommend whichever plan is better, even if that's the user's own.

If the user picks the refactoring, pause the grilling. Ask them to run `/handoff` with a focus that has the next session work out the spec for that refactoring, then stop. The feature grilling restarts in a fresh session once the refactoring is done.
