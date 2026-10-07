/**
 * string-to-nodes — framework-agnostic recursive string replacement.
 *
 * Turns a string into an array of plain strings and "nodes" of any type T
 * (React elements, Vue VNodes, DOM nodes, safe-HTML objects, plain objects…).
 * Zero dependencies, no DOM or framework required.
 */

/** Result of a replacement: plain text segments interleaved with nodes. */
export type ReplacerOutput<T> = Array<string | T>;

/**
 * Input: a string, or a previous output (for chaining). Strings in an array are
 * scanned; every other non-null item is passed through untouched.
 */
export type ReplacerInput<T> = string | ReadonlyArray<string | T | null | undefined>;

export type ReplacerMatch = {
  /** Name of the rule that produced this match. */
  ruleName: string;
  /** Zero-based index of this match among the rule's matches in the scanned segment. */
  index: number;
  /** Character offset of the match start within the string being scanned. */
  offset: number;
  /** The matched text after `textFn` (equals rawText when no textFn). */
  text: string;
  /** Capture groups (match[1], match[2], …). Empty when the pattern has none. */
  captures: Array<string | undefined>;
  /** Named capture groups, if the RegExp defines any. */
  groups?: Record<string, string>;
};

export type ReplacerRule<T> = {
  /**
   * String literal or RegExp. Strings are escaped and matched literally.
   * RegExps need no capturing group; the `g` flag is added automatically.
   */
  pattern: string | RegExp;
  /** Builds the node for a match. */
  matcherFn: (
    rawText: string,
    processed: ReplacerOutput<T>,
    key: string,
    match: ReplacerMatch,
  ) => T;
  /** Transform the matched text before inner rules are applied. */
  textFn?: (rawText: string, match: Omit<ReplacerMatch, 'text'>) => string;
  /** Names of later rules to skip inside this rule's matches. */
  ignore?: string[];
  /** String patterns only. Default true; pass false for case-insensitive matching. */
  caseSensitive?: boolean;
  /** Max replacements for this rule across the whole call. */
  count?: number;
};

export type ReplacerRules<T> = Record<string, ReplacerRule<T>>;

export type ReplacerOptions = {
  /** Prefix for generated keys. Default '0'. Use distinct values for sibling calls. */
  parentKey?: string;
};

type Context<T> = {
  rules: ReplacerRules<T>;
  regexps: Record<string, RegExp>;
  remaining: Record<string, number>;
};

const REGEXP_CHARS = /[\\^$.*+?()[\]{}|]/g;
const escapeRegExp = (s: string) => s.replace(REGEXP_CHARS, '\\$&');

function toGlobalRegExp<T>({pattern, caseSensitive}: ReplacerRule<T>): RegExp {
  if (typeof pattern === 'string') {
    return new RegExp(escapeRegExp(pattern), caseSensitive === false ? 'gi' : 'g');
  }
  return new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
}

function apply<T>(
  str: string,
  ruleNames: string[],
  ctx: Context<T>,
  parentKey: string,
): ReplacerOutput<T> {
  if (str === '') return [];
  if (ruleNames.length === 0) return [str];

  const [name, ...rest] = ruleNames;
  const rule = ctx.rules[name];
  if (!rule) return apply(str, rest, ctx, parentKey);

  const out: ReplacerOutput<T> = [];
  let segment = 0;
  let cursor = 0;
  let matchIndex = 0;

  const pushNonMatch = (text: string) => {
    if (text === '') return;
    out.push(...apply(text, rest, ctx, `${parentKey}-${segment}`));
    segment += 1;
  };

  // matchAll iterates over a clone, so recursion never disturbs lastIndex.
  for (const m of str.matchAll(ctx.regexps[name])) {
    const rawText = m[0];
    if (rawText === '') continue; // skip zero-length matches

    const left = ctx.remaining[name];
    if (left !== undefined && left <= 0) break;

    const offset = m.index ?? 0;
    pushNonMatch(str.slice(cursor, offset));

    const key = `${parentKey}-${segment}`;
    segment += 1;

    const base = {
      ruleName: name,
      index: matchIndex,
      offset,
      captures: m.slice(1),
      groups: m.groups,
    };
    const text = rule.textFn ? rule.textFn(rawText, base) : rawText;
    const innerRules = rule.ignore?.length
      ? rest.filter(r => !rule.ignore!.includes(r))
      : rest;
    const processed = apply(text, innerRules, ctx, key);

    out.push(rule.matcherFn(rawText, processed, key, {...base, text}));

    matchIndex += 1;
    cursor = offset + rawText.length;
    if (left !== undefined) ctx.remaining[name] = left - 1;
  }

  pushNonMatch(str.slice(cursor));
  return out;
}

/**
 * Replace substrings of `input` matching `rules` with nodes built by each
 * rule's `matcherFn`.
 *
 * Rules run in definition order. Text between matches, and the content of each
 * match, is processed by the rules defined after the current one (minus
 * `ignore`d ones). A rule never re-applies inside its own match, so recursion
 * always terminates.
 */
export function stringReplacer<T>(
  input: ReplacerInput<T>,
  rules: ReplacerRules<T>,
  options: ReplacerOptions = {},
): ReplacerOutput<T> {
  const parentKey = options.parentKey ?? '0';
  const ruleNames = Object.keys(rules);
  const ctx: Context<T> = {rules, regexps: {}, remaining: {}};
  for (const name of ruleNames) {
    ctx.regexps[name] = toGlobalRegExp(rules[name]);
    if (Number.isInteger(rules[name].count)) ctx.remaining[name] = rules[name].count!;
  }

  if (typeof input === 'string') return apply(input, ruleNames, ctx, parentKey);

  const out: ReplacerOutput<T> = [];
  input.forEach((item, i) => {
    if (typeof item === 'string') {
      out.push(...apply(item, ruleNames, ctx, `${parentKey}-${i}`));
    } else if (item !== null && item !== undefined) {
      out.push(item);
    }
  });
  return out;
}
