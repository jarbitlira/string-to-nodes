import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react.ts', 'src/dom.ts', 'src/html.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2020',
});
