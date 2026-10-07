/**
 * React / React Native adapter. React is only a type import, so this entry
 * adds no runtime dependency on React.
 *
 *   import {reactReplacer, type ReactRules} from 'string-replacer/react';
 *   <Text>{reactReplacer(body, RULES)}</Text>
 */
import type {ReactElement} from 'react';
import {
  stringReplacer,
  type ReplacerInput,
  type ReplacerOptions,
  type ReplacerOutput,
  type ReplacerRule,
  type ReplacerRules,
} from './index';

export type ReactRule = ReplacerRule<ReactElement>;
export type ReactRules = ReplacerRules<ReactElement>;
export type ReactReplacerOutput = ReplacerOutput<ReactElement>;

export function reactReplacer(
  input: ReplacerInput<ReactElement>,
  rules: ReactRules,
  options?: ReplacerOptions | string,
): ReactReplacerOutput {
  return stringReplacer<ReactElement>(input, rules, options);
}
