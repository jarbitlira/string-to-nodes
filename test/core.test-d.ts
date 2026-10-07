// Type-only tests for the core engine. No runtime assertions here — this file
// is validated by `npm run typecheck`, not by the test runner (the `test`
// script's glob only matches `*.test.ts`, not `*.test-d.ts`).
import {stringReplacer, type ReplacerOutput, type ReplacerRules} from '../src/index';
import type {Equal, Expect} from './type-test-utils';

type Node = {tag: string; key: string; children: ReplacerOutput<Node>};

// ReplacerRules<T> infers matcherFn's `processed` param as ReplacerOutput<T> for
// the given T, not `unknown` or `any`.
const good: ReplacerRules<Node> = {
  a: {
    pattern: /x/,
    matcherFn: (raw, processed, key) => {
      type _check = Expect<Equal<typeof raw, string>>;
      type _check2 = Expect<Equal<typeof processed, ReplacerOutput<Node>>>;
      type _check3 = Expect<Equal<typeof key, string>>;
      return {tag: 'a', key, children: processed};
    },
  },
};

// matcherFn must return T; a mismatched return type is a compile error.
const bad: ReplacerRules<Node> = {
  // @ts-expect-error — matcherFn returns a string, but T is Node.
  bad: {pattern: /x/, matcherFn: () => 'not a Node'},
};

// stringReplacer<T> rejects a rules object whose matcherFn doesn't return T.
// @ts-expect-error — matcherFn returns a number, not Node.
stringReplacer<Node>('x', {a: {pattern: /x/, matcherFn: () => 42}});
