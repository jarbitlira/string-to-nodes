/**
 * Vanilla DOM adapter: rules return DOM Nodes; text segments become Text nodes.
 * Text is inserted with createTextNode, so it is never parsed as HTML.
 *
 *   const frag = domReplacer(text, {
 *     url: { pattern: /https?:\/\/\S+/g, matcherFn: raw => {
 *       const a = document.createElement('a'); a.href = raw; a.textContent = raw; return a;
 *     }},
 *   });
 *   el.replaceChildren(frag);
 */
import {
  stringReplacer,
  type ReplacerInput,
  type ReplacerOptions,
  type ReplacerOutput,
  type ReplacerRules,
} from './index';

/** Minimal document surface, so the adapter also works with jsdom/happy-dom/linkedom. */
export type DocumentLike = Pick<Document, 'createTextNode' | 'createDocumentFragment'>;

export type DomRules = ReplacerRules<Node>;

/** Append an output array to `parent` (e.g. inside a matcherFn for children). */
export function appendOutput(
  parent: Node,
  output: ReplacerOutput<Node>,
  doc: DocumentLike = globalThis.document,
): Node {
  for (const part of output) {
    parent.appendChild(typeof part === 'string' ? doc.createTextNode(part) : part);
  }
  return parent;
}

/** Convert an output array into a DocumentFragment. */
export function toFragment(
  output: ReplacerOutput<Node>,
  doc: DocumentLike = globalThis.document,
): DocumentFragment {
  return appendOutput(doc.createDocumentFragment(), output, doc) as DocumentFragment;
}

/** Replace and return a DocumentFragment ready to insert. */
export function domReplacer(
  input: ReplacerInput<Node>,
  rules: DomRules,
  options?: ReplacerOptions,
  doc: DocumentLike = globalThis.document,
): DocumentFragment {
  return toFragment(stringReplacer<Node>(input, rules, options), doc);
}
