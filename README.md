# string-to-nodes

[![CI](https://github.com/jarbitlira/string-to-nodes/actions/workflows/ci.yml/badge.svg)](https://github.com/jarbitlira/string-to-nodes/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/string-to-nodes.svg)](https://www.npmjs.com/package/string-to-nodes)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Turn a string into text plus **nodes of any type**: React elements, Vue VNodes, DOM nodes, or safe HTML. Zero dependencies, ~1 kB.

## Install

```sh
npm install string-to-nodes
```

## Quick start

```tsx
import {reactReplacer} from 'string-to-nodes/react';

const rules = {
  url: {
    pattern: /https?:\/\/\S+/g,
    matcherFn: (raw, _processed, key) => <a key={key} href={raw}>{raw}</a>,
  },
};

function Message({text}) {
  return <p>{reactReplacer(text, rules)}</p>;
}

// <Message text="Visit https://example.com today" />
// renders: Visit <a href="https://example.com">https://example.com</a> today
```

A rule has a `pattern` (RegExp, or a string matched literally) and a `matcherFn` that returns the node for each match. Everything between matches stays plain text.

## Pick your import

| You use | Import from | Returns |
| --- | --- | --- |
| React / React Native | `string-to-nodes/react` | React elements |
| Plain JS / Web Components | `string-to-nodes/dom` | a `DocumentFragment` |
| SSR, emails, templates | `string-to-nodes/html` | an escaped HTML string |
| Vue, Svelte, Solid, anything else | `string-to-nodes` | an array of text and your own nodes |

## Examples

**Vanilla DOM**

```ts
import {domReplacer} from 'string-to-nodes/dom';

const frag = domReplacer('Visit https://example.com', {
  url: {
    pattern: /https?:\/\/\S+/g,
    matcherFn: raw => Object.assign(document.createElement('a'), {href: raw, textContent: raw}),
  },
});
element.replaceChildren(frag);
```

**HTML string** (plain text is always escaped)

```ts
import {htmlReplacer, safe, escapeHtml} from 'string-to-nodes/html';

htmlReplacer('<b>hi</b> https://x.com', {
  url: {
    pattern: /https?:\/\/\S+/g,
    matcherFn: raw => safe(`<a href="${escapeHtml(raw)}">${escapeHtml(raw)}</a>`),
  },
});
// '&lt;b&gt;hi&lt;/b&gt; <a href="https://x.com">https://x.com</a>'
```

**Vue 3** (core, no adapter needed)

```ts
import {h, type VNode} from 'vue';
import {stringReplacer, defineRules} from 'string-to-nodes';

const rules = defineRules<VNode>({
  url: {pattern: /https?:\/\/\S+/g, matcherFn: (raw, _p, key) => h('a', {key, href: raw}, raw)},
});
// render: () => h('p', stringReplacer(text, rules))
```

**Any other framework**: use the core and return whatever node type it renders.

```ts
import {stringReplacer} from 'string-to-nodes';

stringReplacer('Visit https://example.com today', {
  url: {pattern: /https?:\/\/\S+/g, matcherFn: (raw, _p, key) => ({type: 'link', href: raw, key})},
});
// ['Visit ', {type: 'link', href: 'https://example.com', key: '0-1'}, ' today']
```

## What else it does

Rules run in order and can nest (bold containing a link). You can rewrite the matched text with `textFn`, stop inner rules with `ignore`, cap replacements with `count`, and read capture groups from the match. See the [API reference](API.md) for every option and how matching works internally.
