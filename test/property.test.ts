import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stringReplacer, type ReplacerRules} from '../src/index';

// Nodes keep their rawText, so output can be reassembled back into the input.
type Raw = {tag: string; key: string; raw: string};
const tag =
  (name: string) =>
  (raw: string, _p: Array<string | Raw>, key: string): Raw => ({tag: name, key, raw});

// Deterministic PRNG (mulberry32) so failures are reproducible across runs.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ['hello', 'world', 'foo', 'bar', '#tag', '@ann', 'https://x.com', '**bold**', ' ', '\n', ', '];

function randomChatLine(rand: () => number, wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(WORDS[Math.floor(rand() * WORDS.length)]);
  }
  return words.join('');
}

const RULES: ReplacerRules<Raw> = {
  bold: {pattern: /\*\*[^*]+\*\*/g, matcherFn: tag('bold')},
  url: {pattern: /https?:\/\/\S+/g, matcherFn: tag('url')},
  mention: {pattern: /@\w+/g, matcherFn: tag('mention')},
  hashtag: {pattern: /#\w+/g, matcherFn: tag('hashtag')},
};

function reassemble(out: Array<string | Raw>): string {
  return out.map(p => (typeof p === 'string' ? p : p.raw)).join('');
}

test('property: reassembling rawText always reproduces the input (no textFn)', () => {
  const rand = mulberry32(0xc0ffee);
  for (let i = 0; i < 200; i++) {
    const input = randomChatLine(rand, 1 + Math.floor(rand() * 20));
    const out = stringReplacer<Raw>(input, RULES);
    assert.equal(reassemble(out), input, `mismatch for input: ${JSON.stringify(input)}`);
  }
});

test('property: reassembling holds across nested rules too', () => {
  const nested: ReplacerRules<Raw> = {
    bold: {pattern: /\*\*[^*]+\*\*/g, matcherFn: tag('bold')}, // wraps url/mention/hashtag matches
    ...RULES,
  };
  const rand = mulberry32(0x5eed);
  for (let i = 0; i < 200; i++) {
    const input = randomChatLine(rand, 1 + Math.floor(rand() * 20));
    const out = stringReplacer<Raw>(input, nested);
    assert.equal(reassemble(out), input);
  }
});

test('key uniqueness holds across deep nesting', () => {
  type K = {tag: string; key: string; children: Array<string | K>};
  const el =
    (name: string) =>
    (_r: string, children: Array<string | K>, key: string): K => ({tag: name, key, children});

  // Three levels: bold wraps url wraps mention.
  const out = stringReplacer<K>('**see https://x.com/@ann and https://y.com/@bob too**', {
    bold: {pattern: /\*\*.*\*\*/g, matcherFn: el('bold')},
    url: {pattern: /https?:\/\/\S+/g, matcherFn: el('url')},
    mention: {pattern: /@\w+/g, matcherFn: el('mention')},
  });

  const keys: string[] = [];
  const collect = (nodes: Array<string | K>) => {
    for (const n of nodes) {
      if (typeof n === 'string') continue;
      keys.push(n.key);
      collect(n.children);
    }
  };
  collect(out);

  assert.ok(keys.length > 0);
  assert.equal(new Set(keys).size, keys.length, `duplicate keys found: ${keys.join(', ')}`);
});

test('key uniqueness holds across chained calls with distinct parentKey', () => {
  type K = {tag: string; key: string};
  const el = (name: string) => (_r: string, _p: unknown, key: string): K => ({tag: name, key});

  const first = stringReplacer<K>('hi @ann and @bob', {m: {pattern: /@\w+/g, matcherFn: el('mention')}}, {parentKey: '0'});
  const second = stringReplacer<K>('hi #a and #b', {h: {pattern: /#\w+/g, matcherFn: el('hashtag')}}, {parentKey: '1'});

  const keys = [...first, ...second].filter((x): x is K => typeof x !== 'string').map(n => n.key);
  assert.equal(new Set(keys).size, keys.length, `duplicate keys across chained calls: ${keys.join(', ')}`);
});
