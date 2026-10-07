import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement, Fragment} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {reactReplacer, type ReactRules} from '../src/react';

test('react adapter renders through a real React renderer, not a mock', () => {
  const rules: ReactRules = {
    url: {
      pattern: /https?:\/\/\S+/g,
      matcherFn: (raw, _p, key) => createElement('a', {key, href: raw}, raw),
    },
    mention: {
      pattern: /@\w+/g,
      matcherFn: (raw, _p, key) => createElement('b', {key}, raw),
    },
  };

  const parts = reactReplacer('Visit https://example.com and say hi to @ann', rules);
  const html = renderToStaticMarkup(createElement(Fragment, null, ...parts));

  assert.equal(
    html,
    'Visit <a href="https://example.com">https://example.com</a> and say hi to <b>@ann</b>',
  );
});
