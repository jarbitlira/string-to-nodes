import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react.ts', 'src/dom.ts', 'src/html.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2020',
  // Adapters import the core; keep it a shared chunk instead of inlining copies.
  splitting: true,
});
