// Type-only tests for the React adapter. See core.test-d.ts for how this is checked.
import type {ReactElement} from 'react';
import {reactReplacer, type ReactRules, type ReactReplacerOutput} from '../src/react';
import type {ReplacerRule} from '../src/index';
import type {Equal, Expect} from './type-test-utils';

// ReactRules is exactly ReplacerRules<ReactElement>, and ReactReplacerOutput
// is exactly its output type.
type _reactRule = Expect<Equal<ReactRules['x'], ReplacerRule<ReactElement>>>;
type _reactOutput = Expect<Equal<ReactReplacerOutput, Array<string | ReactElement>>>;

declare const anyElement: ReactElement;

const rules: ReactRules = {
  a: {pattern: /x/, matcherFn: (_raw, _processed, _key) => anyElement},
};

const out = reactReplacer('hello', rules);
type _outType = Expect<Equal<typeof out, ReactReplacerOutput>>;

const bad: ReactRules = {
  // @ts-expect-error — matcherFn must return a ReactElement, not a string.
  a: {pattern: /x/, matcherFn: () => 'not an element'},
};
