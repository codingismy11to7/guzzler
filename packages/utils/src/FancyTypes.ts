type Explode<T> = keyof T extends infer K
  ? K extends unknown
    ? { [I in keyof T]: I extends K ? T[I] : never }
    : never
  : never;

export type AtMostOne<T> = Explode<Partial<T>>;
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];
export type ExactlyOne<T> = AtMostOne<T> & AtLeastOne<T>;
