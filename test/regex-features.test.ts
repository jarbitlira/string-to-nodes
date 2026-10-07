import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stringReplacer} from '../src/index';

type N = {tag: string; key: string; text: string};
const el =
  (tagName: string) =>
  (raw: string, _p: unknown, key: string): N => ({tag: tagName, key, text: raw});

test('sticky (y) flag: matching stops at the first gap instead of scanning ahead', () => {
  // Sticky requires the next match to start exactly at lastIndex; once "," breaks
  // the run, iteration stops rather than skipping ahead to find "34" and "56".
  const out = stringReplacer<N>('12,34 56', {digits: {pattern: /\d+/y, matcherFn: el('d')}});
  const matches = out.filter((x): x is N => typeof x !== 'string');
  assert.deepEqual(matches.map(m => m.text), ['12']);
  assert.equal(out[out.length - 1], ',34 56');
});

test('unicode (u) flag: a surrogate-pair emoji matches as one character, not two', () => {
  const withU = stringReplacer<N>('say 😀 hi', {ch: {pattern: /./gu, matcherFn: el('c')}});
  const emojiMatch = withU.find((x): x is N => typeof x !== 'string' && x.text === '😀');
  assert.ok(emojiMatch, 'expected the whole emoji to be a single match under the u flag');
});

test('unicode sets (v) flag: set-subtraction syntax in a character class is preserved', () => {
  // [\d--[13579]] = digits minus the odd ones = even digits only. This syntax is
  // only valid with the v flag, so a correct match here proves flags survive untouched.
  const out = stringReplacer<N>('0123456789', {even: {pattern: /[\d--[13579]]/gv, matcherFn: el('e')}});
  const text = out
    .filter((x): x is N => typeof x !== 'string')
    .map(m => m.text)
    .join('');
  assert.equal(text, '02468');
});

test('lookbehind: zero-width assertion is not consumed, offset points at the real match', () => {
  const out = stringReplacer<N>('Price: $42 and 7 apples', {
    price: {pattern: /(?<=\$)\d+/g, matcherFn: el('price')},
  });
  const matches = out.filter((x): x is N => typeof x !== 'string');
  assert.deepEqual(matches.map(m => m.text), ['42']);
  // "7" has no leading "$", so it must stay as plain text, and "$" itself isn't swallowed.
  assert.ok(out.some(p => typeof p === 'string' && p.includes('$')));
  assert.ok(out.some(p => typeof p === 'string' && p.includes('7 apples')));
});

test('named groups combine correctly with lookbehind and offsets', () => {
  const meta: Array<{name: string | undefined; offset: number}> = [];
  stringReplacer<N>('to: @ann, cc: @bob', {
    m: {
      pattern: /(?<=[:,] )@(?<name>\w+)/g,
      matcherFn: (raw, _p, key, match) => (
        meta.push({name: match.groups?.name, offset: match.offset}), {tag: 'm', key, text: raw}
      ),
    },
  });
  assert.deepEqual(meta, [
    {name: 'ann', offset: 4},
    {name: 'bob', offset: 14},
  ]);
});
