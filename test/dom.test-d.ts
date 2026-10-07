// Type-only tests for the DOM adapter. See core.test-d.ts for how this is checked.
import {domReplacer, appendOutput, type DomRules} from '../src/dom';
import type {ReplacerRule} from '../src/index';
import type {Equal, Expect} from './type-test-utils';

type _domRule = Expect<Equal<DomRules['x'], ReplacerRule<Node>>>;

declare const anyNode: Node;
declare const anyElement: Element;

const rules: DomRules = {
  a: {pattern: /x/, matcherFn: () => anyNode},
};

const frag = domReplacer('hello', rules);
type _fragType = Expect<Equal<typeof frag, DocumentFragment>>;

// appendOutput accepts any Node, including a plain Element or Fragment.
appendOutput(anyElement, ['text', anyNode]);

const bad: DomRules = {
  // @ts-expect-error — matcherFn must return a Node, not a string.
  a: {pattern: /x/, matcherFn: () => 'not a node'},
};
