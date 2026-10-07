// Zero-dependency type-level assertions, checked by `tsc --noEmit` (no separate
// runner). `Expect<Equal<A, B>>` fails to compile when A and B differ; a wrong
// `// @ts-expect-error` (an expression that type-checks fine) also fails to
// compile, since TS reports "Unused '@ts-expect-error' directive".
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;
