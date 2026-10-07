/**
 * HTML-string adapter (SSR, emails, non-VDOM templating). Rules return
 * SafeHtml values; plain text segments are escaped when serialized, so
 * user input can never inject markup.
 *
 *   const html = htmlReplacer('Visit https://x.com', {
 *     url: { pattern: /https?:\/\/\S+/g,
 *            matcherFn: raw => safe(`<a href="${escapeHtml(raw)}">${escapeHtml(raw)}</a>`) },
 *   });
 *   // 'Visit <a href="https://x.com">https://x.com</a>'
 */
import {
  stringReplacer,
  type ReplacerInput,
  type ReplacerOptions,
  type ReplacerOutput,
  type ReplacerRules,
} from './index';

declare const SAFE: unique symbol;

/**
 * Trusted HTML. Kept as an object (not a bare string) so it can't be confused
 * with plain text segments, which are always escaped.
 */
export type SafeHtml = {readonly __html: string; readonly [SAFE]?: true};

export type HtmlRules = ReplacerRules<SafeHtml>;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, c => ESCAPES[c]);

/** Mark a string as trusted HTML. Only pass markup you built yourself. */
export const safe = (html: string): SafeHtml => ({__html: html});

/** Serialize an output array: text escaped, SafeHtml inserted verbatim. */
export function toHtml(output: ReplacerOutput<SafeHtml>): string {
  return output.map(p => (typeof p === 'string' ? escapeHtml(p) : p.__html)).join('');
}

export function htmlReplacer(
  input: ReplacerInput<SafeHtml>,
  rules: HtmlRules,
  options?: ReplacerOptions | string,
): string {
  return toHtml(stringReplacer<SafeHtml>(input, rules, options));
}
