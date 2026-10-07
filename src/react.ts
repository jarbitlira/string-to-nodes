/**
 * React / React Native adapter. React is only a type import, so this entry
 * adds no runtime dependency on React.
 *
 *   import {reactReplacer, type ReactRules} from 'string-to-nodes/react';
 *   <Text>{reactReplacer(body, RULES)}</Text>
 */
import type {ReactElement} from 'react';
import {
  stringReplacer,
  type ReplacerInput,
  type ReplacerOptions,
  type ReplacerOutput,
  type ReplacerRules,
} from './index';

export type ReactRules = ReplacerRules<ReactElement>;

export function reactReplacer(
  input: ReplacerInput<ReactElement>,
  rules: ReactRules,
  options?: ReplacerOptions,
): ReplacerOutput<ReactElement> {
  return stringReplacer<ReactElement>(input, rules, options);
}
