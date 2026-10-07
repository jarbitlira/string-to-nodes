import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stringReplacer, type ReplacerRules} from '../src/index';

type N = {tag: string; key: string; raw: string};
const tag =
  (name: string) =>
  (raw: string, _p: Array<string | N>, key: string): N => ({tag: name, key, raw});

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildChatLog(targetBytes: number): string {
  const rand = mulberry32(0x1337);
  const words = ['hello', 'world', 'thanks', 'see', 'you', 'later', '**great**', 'https://example.com/x', '@user', '#topic', '*note*', '`code`'];
  const lines: string[] = [];
  let size = 0;
  while (size < targetBytes) {
    const n = 5 + Math.floor(rand() * 10);
    const words_: string[] = [];
    for (let i = 0; i < n; i++) words_.push(words[Math.floor(rand() * words.length)]);
    const line = words_.join(' ');
    lines.push(line);
    size += line.length + 1;
  }
  return lines.join('\n');
}

// 5 rules, deliberately ordered so bold/italic can wrap the others.
const RULES: ReplacerRules<N> = {
  bold: {pattern: /\*\*[^*]+\*\*/g, matcherFn: tag('bold')},
  italic: {pattern: /(?<!\*)\*[^*]+\*(?!\*)/g, matcherFn: tag('italic')},
  code: {pattern: /`[^`]+`/g, matcherFn: tag('code')},
  url: {pattern: /https?:\/\/\S+/g, matcherFn: tag('url')},
  mention: {pattern: /@\w+/g, matcherFn: tag('mention')},
};

test('large input (~100KB, 5 rules) completes quickly and round-trips correctly', () => {
  const input = buildChatLog(100_000);
  assert.ok(input.length >= 100_000, 'fixture should be at least 100KB');

  const start = performance.now();
  const out = stringReplacer<N>(input, RULES);
  const elapsedMs = performance.now() - start;

  // Generous bound: catches an accidental O(n^2) blow-up without being flaky on a loaded CI box.
  assert.ok(elapsedMs < 2000, `expected < 2000ms, took ${elapsedMs.toFixed(1)}ms`);

  const reassembled = out.map(p => (typeof p === 'string' ? p : p.raw)).join('');
  assert.equal(reassembled, input);
});
