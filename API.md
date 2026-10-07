# API reference

```ts
type ReplacerOutput<T> = Array<string | T>;
type ReplacerInput<T> = string | ReadonlyArray<string | T | null | undefined>;

type ReplacerMatch = {
  ruleName: string;
  index: number;      // 0-based match index within the scanned segment
  offset: number;     // char offset of the match within the scanned string
  text: string;       // matched text after textFn
  captures: Array<string | undefined>; // match[1..]
  groups?: Record<string, string>;      // named groups
};

type ReplacerRule<T> = {
  pattern: string | RegExp;
  matcherFn: (
    rawText: string,              // full match (match[0])
    processed: ReplacerOutput<T>, // inner content with later rules applied
    key: string,                  // unique key
    match: ReplacerMatch,
  ) => T;
  textFn?: (rawText: string, match: Omit<ReplacerMatch, 'text'>) => string;
  ignore?: string[];
  caseSensitive?: boolean; // string patterns only; default true
  count?: number;          // max replacements for this rule, whole call
};

type ReplacerRules<T> = Record<string, ReplacerRule<T>>;

function stringReplacer<T>(
  input: ReplacerInput<T>,
  rules: ReplacerRules<T>,
  options?: {parentKey?: string}, // default parentKey '0'
): ReplacerOutput<T>;

function defineRules<T>(rules: ReplacerRules<T>): ReplacerRules<T>; // typing helper
function createReplacer<T>(rules: ReplacerRules<T>): (input, options?) => ReplacerOutput<T>;
```

`T` is whatever your `matcherFn` returns. Declare rules with `defineRules<T>()` when they live outside the call, so the callback parameters are typed.

### The one rule about `T`

`T` must not be a bare `string`. Output arrays mix plain text with nodes, and the library (and you) tell them apart with `typeof part === 'string'`. If you need string output, return a wrapper object, which is exactly what the `/html` adapter's `SafeHtml` does.

### Edge cases

- Empty string input → `[]`.
- Zero-length matches (`/(?:)/g`, `/\b/g`) are skipped, never looped on.
- Empty text segments are not emitted.
- String patterns are regex-escaped, so `'.'` matches a literal dot.
- In array input, strings are scanned, `null`/`undefined` are dropped, everything else passes through untouched.

## Keys

Keys are hyphen-separated paths: `"0-1"`, `"0-1-0"`, `"0-2-0-1"`. Each recursion level appends the segment position, so keys are unique within a call. For sibling calls in the same parent (or chained calls) pass a distinct `parentKey`. Renderers that don't use keys can ignore the argument.

## Rule priority and overlapping matches

- If rule A's match **contains** a later rule B's match → both fire, A wraps B, unless A lists B in `ignore`.
- If A's match **partially overlaps** B's → A wins; B only sees text outside A's match.
- Within one rule, matches never overlap (standard global RegExp behavior).

Order matters: put wrapping rules (bold, templates) before the rules that should run inside them (links).

## Examples (framework-free)

Examples use a plain object as `T` to show that nothing here depends on a renderer.

```ts
type Node = {tag: string; key: string; children: Array<string | Node>};
const el = (tag: string) => (_raw: string, children: Array<string | Node>, key: string): Node =>
  ({tag, key, children});
```

**Nested patterns with `textFn`**

```ts
stringReplacer<Node>('Check **https://example.com** out', {
  bold: {pattern: /\*\*([^*]+)\*\*/g, textFn: t => t.slice(2, -2), matcherFn: el('b')},
  url:  {pattern: /https?:\/\/[^\s*]+/gi, matcherFn: el('a')},
});
// ['Check ', {tag:'b', key:'0-1', children:[{tag:'a', key:'0-1-0', children:['https://example.com']}]}, ' out']
```

**Capture groups instead of `textFn`**

```ts
mention: {pattern: /@(\w+)/g, matcherFn: (_raw, _p, key, m) => ({tag: 'mention', key, children: [m.captures[0]!]})}
```

**`ignore`**

```ts
{
  url:     {pattern: /https?:\/\/\S+/g, matcherFn: el('a'), ignore: ['hashtag']}, // keep "#section" inside URLs
  hashtag: {pattern: /#[a-z\d][\w-]*/gi, matcherFn: el('tag')},
}
```

**`count`** (shared across nested segments and array items)

```ts
stringReplacer<Node>('hey hey you', {hey: {pattern: 'hey', count: 1, matcherFn: el('i')}});
// [{tag:'i', key:'0-0', children:['hey']}, ' hey you']
```

Literal strings are case-sensitive by default; pass `caseSensitive: false` to opt in to case-insensitive matching.

**Chaining**

```ts
let out = stringReplacer(text, {url: URL_RULE});
out = stringReplacer(out, {mention: MENTION_RULE}, {parentKey: '1'}); // existing nodes pass through
```

Prefer one rules object; chaining is mainly for incremental migration.
## Adapter notes

- **`/react`**: React is a type-only import, so the adapter adds nothing at runtime. In React Native, nested `<Text>` renders inline; inside a `<View>`, every text segment must still be wrapped in `<Text>`.
- **`/dom`**: text becomes `Text` nodes via `createTextNode`, never parsed as HTML. Use `appendOutput(parent, children)` to render nested children. Pass a `document` (jsdom, happy-dom, linkedom) as the last argument outside the browser.
- **`/html`**: only `SafeHtml` built with `safe()` is inserted verbatim. Use `toHtml(processed)` inside a `matcherFn` to render nested children. Escape every interpolated value yourself.
- **Svelte / Angular / Lit**: return plain data objects from `matcherFn` and render them with the framework's own templating (or use `/html` for string templates).

## How matching works

Rules are applied in definition order. For each rule:

1. Find every match with `String.prototype.matchAll` (the `g` flag is added if missing).
2. Text **between** matches → processed by the rules defined *after* this one.
3. Each **match** → `textFn` is applied, the result is processed by the later rules (minus any in `ignore`), then `matcherFn(rawText, processed, key, match)` builds the node.

A rule never re-applies inside its own match, and inner content only ever sees later rules — so recursion always terminates.

### Why `matchAll` instead of `split`?

Splitting a string on a regex requires a capturing group, and patterns with several or optional groups produce `undefined` entries and misaligned output. `matchAll` gives the full match as `rawText` regardless of groups, and exposes groups separately via `match.captures` / `match.groups` — so any RegExp works, with or without groups.

Back to the [README](README.md).
