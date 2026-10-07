# string-to-nodes

[![CI](https://github.com/jarbitlira/string-to-nodes/actions/workflows/ci.yml/badge.svg)](https://github.com/jarbitlira/string-to-nodes/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/string-to-nodes.svg)](https://www.npmjs.com/package/string-to-nodes)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Framework-agnostic, recursive string replacement. Turn a string into an array of text and **nodes of any type**: React elements, Vue VNodes, Solid/Preact JSX, DOM nodes, or safe HTML strings. Zero dependencies, no DOM required, ~1 kB.

```ts
import {stringReplacer} from 'string-to-nodes';

stringReplacer('Visit https://example.com today', {
  url: {pattern: /https?:\/\/\S+/g, matcherFn: (raw, _p, key) => ({type: 'link', href: raw, key})},
});
// => ['Visit ', {type: 'link', href: 'https://example.com', key: '0-1'}, ' today']
```

**Features**

- Works with any output type; thin adapters for React, DOM and HTML
- Named rules applied in definition order
- Recursive matching (patterns within patterns), guaranteed to terminate
- `pattern` as string (matched literally) or RegExp (**no capturing group required**)
- `textFn` to pre-process matched text, `ignore` to suppress inner rules, `count` to cap replacements
- Match metadata: index, offset, capture groups, named groups
- Stable unique keys for keyed renderers
- Chaining: pass a previous result back in as input

## Install

```sh
npm install string-to-nodes
```

| Entry point | Use for | Runtime deps |
| --- | --- | --- |
| `string-to-nodes` | Core: any output type | none |
| `string-to-nodes/react` | React and React Native typed helpers | none (`@types/react` optional peer) |
| `string-to-nodes/dom` | Vanilla JS / Web Components / jQuery-era code | none (uses the `document` you pass) |
| `string-to-nodes/html` | SSR, emails, any string templating | none |

Vue, Svelte, Solid, Preact, Angular and Lit don't need an adapter: use the core with their node type (see [Framework recipes](#framework-recipes)).

## Core API

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

## Adapters

### React / React Native — `/react`

```tsx
import {reactReplacer, type ReactRules} from 'string-to-nodes/react';

const LINK_RULES: ReactRules = {
  url: {
    pattern: /https?:\/\/\S+|www\.\S+/gi,
    matcherFn: (raw, _p, key) => <MessageContentLink key={key} url={raw} text={raw} />,
  },
};

<Text>{reactReplacer(message.body, LINK_RULES)}</Text>
```

React is a type-only import, so the adapter adds nothing at runtime. In React Native, `<Text>` renders nested `<Text>` inline; inside a `<View>`, every text segment must still be wrapped in `<Text>`.

### Vanilla DOM — `/dom`

```ts
import {domReplacer, appendOutput} from 'string-to-nodes/dom';

const frag = domReplacer(text, {
  bold: {
    pattern: /\*\*[^*]+\*\*/g,
    textFn: t => t.slice(2, -2),
    matcherFn: (_raw, children) => appendOutput(document.createElement('strong'), children),
  },
  url: {
    pattern: /https?:\/\/\S+/g,
    matcherFn: raw => Object.assign(document.createElement('a'), {href: raw, textContent: raw}),
  },
});
el.replaceChildren(frag);
```

Text becomes `Text` nodes via `createTextNode`, never parsed as HTML. Pass a `document` (jsdom, happy-dom, linkedom) as the last argument outside the browser.

### HTML strings — `/html`

```ts
import {htmlReplacer, safe, escapeHtml, toHtml} from 'string-to-nodes/html';

htmlReplacer('<b>hi</b> https://x.com', {
  url: {
    pattern: /https?:\/\/\S+/g,
    matcherFn: raw => safe(`<a href="${escapeHtml(raw)}">${escapeHtml(raw)}</a>`),
  },
});
// '&lt;b&gt;hi&lt;/b&gt; <a href="https://x.com">https://x.com</a>'
```

Plain text is always escaped; only `SafeHtml` you build with `safe()` is inserted verbatim. Use `toHtml(processed)` inside a `matcherFn` to render nested children. Escape every interpolated value yourself.

## Framework recipes

No adapter needed; `T` is the framework's node type.

**Vue 3**

```ts
import {h, type VNode} from 'vue';
const rules = defineRules<VNode>({
  url: {pattern: /https?:\/\/\S+/g, matcherFn: (raw, _p, key) => h('a', {key, href: raw}, raw)},
});
// render: () => h('p', stringReplacer(text, rules))
```

**Solid / Preact**: identical to React, using their JSX element type.

**Svelte**: return plain data and render it with a snippet:

```svelte
{#each stringReplacer(text, rules) as part}
  {#if typeof part === 'string'}{part}{:else}<a href={part.href}>{part.text}</a>{/if}
{/each}
```

**Angular / Lit / templating engines**: return plain data objects the same way, or use `/html` for string templates.

---

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the matching/recursion engine works internally.

