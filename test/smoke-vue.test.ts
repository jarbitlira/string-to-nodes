import {test} from 'node:test';
import assert from 'node:assert/strict';
import {h, createSSRApp, type VNode} from 'vue';
import {renderToString} from '@vue/server-renderer';
import {stringReplacer, defineRules} from '../src/index';

test('core output renders through a real Vue renderer, not a mock', async () => {
  const rules = defineRules<VNode>({
    url: {pattern: /https?:\/\/\S+/g, matcherFn: raw => h('a', {href: raw}, raw)},
    mention: {pattern: /@\w+/g, matcherFn: raw => h('b', null, raw)},
  });

  const parts = stringReplacer<VNode>('Visit https://example.com and say hi to @ann', rules);
  const app = createSSRApp({render: () => h('div', parts)});
  const html = await renderToString(app);

  assert.equal(
    html,
    '<div>Visit <a href="https://example.com">https://example.com</a> and say hi to <b>@ann</b></div>',
  );
});
