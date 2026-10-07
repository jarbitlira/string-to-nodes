// Type-only tests for the HTML adapter. See core.test-d.ts for how this is checked.
import {htmlReplacer, safe, escapeHtml, toHtml, type HtmlRules, type SafeHtml} from '../src/html';
import type {ReplacerRule} from '../src/index';
import type {Equal, Expect} from './type-test-utils';

type _htmlRule = Expect<Equal<HtmlRules['x'], ReplacerRule<SafeHtml>>>;

const rules: HtmlRules = {
  a: {pattern: /x/, matcherFn: raw => safe(`<a>${escapeHtml(raw)}</a>`)},
};

// htmlReplacer returns a plain string, not an array of parts like the core does.
const out = htmlReplacer('hello', rules);
type _outType = Expect<Equal<typeof out, string>>;

// escapeHtml takes and returns a plain string; toHtml serializes an output array to one.
type _escapeType = Expect<Equal<typeof escapeHtml, (s: string) => string>>;
type _toHtmlType = Expect<Equal<ReturnType<typeof toHtml>, string>>;

const bad: HtmlRules = {
  // @ts-expect-error — matcherFn must return SafeHtml, not a plain string.
  a: {pattern: /x/, matcherFn: () => 'not SafeHtml'},
};
