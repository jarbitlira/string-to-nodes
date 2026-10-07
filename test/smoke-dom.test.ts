import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {domReplacer, appendOutput} from '../src/dom';
import type {DomRules} from '../src/dom';

test('dom adapter builds a real DOM tree through happy-dom, not a mock', () => {
  const window = new Window();
  globalThis.document = window.document as unknown as Document;

  const rules: DomRules = {
    bold: {
      pattern: /\*\*[^*]+\*\*/g,
      textFn: t => t.slice(2, -2),
      matcherFn: (_raw, children) => appendOutput(document.createElement('strong'), children),
    },
    url: {
      pattern: /https?:\/\/\S+/g,
      matcherFn: raw => {
        const a = document.createElement('a');
        a.href = raw;
        a.textContent = raw;
        return a;
      },
    },
  };

  const frag = domReplacer('Check **this** out: https://example.com', rules);

  const container = document.createElement('div');
  container.appendChild(frag);

  assert.equal(container.childNodes.length, 4); // "Check ", <strong>, " out: ", <a>
  assert.equal((container.childNodes[1] as Element).tagName, 'STRONG');
  assert.equal(container.childNodes[1].textContent, 'this');
  assert.equal((container.childNodes[3] as Element).tagName, 'A');
  assert.equal((container.childNodes[3] as HTMLAnchorElement).href, 'https://example.com/');
  assert.equal(
    container.innerHTML,
    'Check <strong>this</strong> out: <a href="https://example.com">https://example.com</a>',
  );
});
