# Architecture

How the matching/recursion engine in `src/index.ts` actually works, and why it's built this way. Not needed to use the package — see [README.md](README.md) for that.

## The algorithm

Rules are applied in definition order. For each rule:

1. Find every match with `String.prototype.matchAll` (the `g` flag is added if missing).
2. Text **between** matches → processed by the rules defined *after* this one.
3. Each **match** → `textFn` is applied, the result is processed by the later rules (minus any in `ignore`), then `matcherFn(rawText, processed, key, match)` builds the node.

A rule never re-applies inside its own match, and inner content only ever sees later rules — so recursion always terminates.

## Why `matchAll` instead of `split`?

Splitting a string on a regex requires a capturing group, and patterns with several or optional groups produce `undefined` entries and misaligned output. `matchAll` gives the full match as `rawText` regardless of groups, and exposes groups separately via `match.captures` / `match.groups` — so any RegExp works, with or without groups.
