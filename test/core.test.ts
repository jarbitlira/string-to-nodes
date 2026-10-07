import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stringReplacer} from '../src/index';
import {htmlReplacer, safe, escapeHtml, toHtml} from '../src/html';

// A framework-free node type: plain objects.
type N = {tag: string; key: string; children: Array<string | N>};
const el =
  (tag: string) =>
  (_raw: string, processed: Array<string | N>, key: string): N => ({tag, key, children: processed});

test('basic regex, no capturing group needed', () => {
  const out = stringReplacer<N>('Visit https://example.com today', {
    url: {pattern: /https?:\/\/\S+/, matcherFn: el('a')},
  });
  assert.deepEqual(out, [
    'Visit ',
    {tag: 'a', key: '0-1', children: ['https://example.com']},
    ' today',
  ]);
});

test('textFn + nesting with later rules, rawText is full match', () => {
  const seen: string[] = [];
  const out = stringReplacer<N>('Check **https://x.com** out', {
    bold: {
      pattern: /\*\*([^*]+)\*\*/g,
      textFn: t => t.slice(2, -2),
      matcherFn: (raw, p, key) => (seen.push(raw), {tag: 'b', key, children: p}),
    },
    url: {pattern: /https?:\/\/[^\s*]+/g, matcherFn: el('a')},
  });
  assert.equal(seen[0], '**https://x.com**');
  assert.deepEqual(out[1], {
    tag: 'b',
    key: '0-1',
    children: [{tag: 'a', key: '0-1-0', children: ['https://x.com']}],
  });
});

test('ignore suppresses later rule inside match', () => {
  const out = stringReplacer<N>('#yay https://x.com/#nope', {
    url: {pattern: /https?:\/\/\S+/g, matcherFn: el('a'), ignore: ['hashtag']},
    hashtag: {pattern: /#[a-z\d][\w-]*/gi, matcherFn: el('tag')},
  });
  assert.deepEqual(
    out.map(x => (typeof x === 'string' ? x : x.tag)),
    ['tag', ' ', 'a'],
  );
  assert.deepEqual((out[2] as N).children, ['https://x.com/#nope']);
});

test('string patterns: literal, case-sensitive default, caseSensitive: false opt-in', () => {
  const r = (caseSensitive?: boolean) =>
    stringReplacer<N>('a.b A.B', {d: {pattern: 'a.', caseSensitive, matcherFn: el('i')}});
  assert.equal(r().filter(x => typeof x !== 'string').length, 1);
  assert.equal(r(false).filter(x => typeof x !== 'string').length, 2);
});

test('count is global per call', () => {
  const out = stringReplacer<N>(['hey hey', 'hey'], {
    h: {pattern: 'hey', count: 2, matcherFn: el('i')},
  });
  assert.equal(out.filter(x => typeof x !== 'string').length, 2);
});

test('captures, groups, index, offset', () => {
  const meta: unknown[] = [];
  stringReplacer<N>('@ann and @bob', {
    m: {
      pattern: /@(?<user>\w+)/g,
      matcherFn: (raw, p, key, m) => (
        meta.push([m.captures[0], m.groups?.user, m.index, m.offset]), {tag: 'u', key, children: p}
      ),
    },
  });
  assert.deepEqual(meta, [
    ['ann', 'ann', 0, 0],
    ['bob', 'bob', 1, 9],
  ]);
});

test('chaining passes nodes through, drops null/undefined', () => {
  const first = stringReplacer<N>('hi @ian #tag', {m: {pattern: /@\w+/, matcherFn: el('u')}});
  const out = stringReplacer<N>([...first, null], {h: {pattern: /#\w+/, matcherFn: el('t')}}, {parentKey: '1'});
  assert.deepEqual(
    out.map(x => (typeof x === 'string' ? x : x.tag)),
    ['hi ', 'u', ' ', 't'],
  );
});

test('edge cases: empty input, zero-length matches, no rules', () => {
  assert.deepEqual(stringReplacer<N>('', {u: {pattern: /x/, matcherFn: el('a')}}), []);
  assert.deepEqual(stringReplacer<N>('ab', {z: {pattern: /(?:)/g, matcherFn: el('a')}}), ['ab']);
  assert.deepEqual(stringReplacer<N>('ab', {}), ['ab']);
});

test('html adapter escapes text, keeps safe html', () => {
  const html = htmlReplacer('<b>hi</b> https://x.com?a=1&b=2', {
    url: {
      pattern: /https?:\/\/\S+/g,
      matcherFn: raw => safe(`<a href="${escapeHtml(raw)}">${escapeHtml(raw)}</a>`),
    },
  });
  assert.equal(
    html,
    '&lt;b&gt;hi&lt;/b&gt; <a href="https://x.com?a=1&amp;b=2">https://x.com?a=1&amp;b=2</a>',
  );
  // nested children via toHtml(processed)
  const nested = htmlReplacer('**<x>**', {
    bold: {
      pattern: /\*\*[^*]+\*\*/,
      textFn: t => t.slice(2, -2),
      matcherFn: (_r, p) => safe(`<strong>${toHtml(p)}</strong>`),
    },
  });
  assert.equal(nested, '<strong>&lt;x&gt;</strong>');
});
