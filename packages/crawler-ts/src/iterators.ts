type AI<A> = AsyncIterable<A>;
type AII<A> = AsyncIterableIterator<A>;
type AG<A> = AsyncGenerator<A>;

export type ValueOrPromise<T> = T | Promise<T>;

export type ForEachFn<A> = (value: A) => ValueOrPromise<void>;
export type IsFn<A, B extends A> = (value: A) => value is B;
export type FilterFn<A> = (value: A) => ValueOrPromise<boolean>;
export type MapFn<A, B> = (value: A) => ValueOrPromise<B>;
export type FlatMapFn<A, B = A> = (value: A) => ValueOrPromise<B> | AI<B>;
export type CatchFn = (error: any) => ValueOrPromise<void>;

export interface Iter<A> extends AII<A> {
  forEach(fn: ForEachFn<A>): Promise<void>;
  is<B extends A>(fn: IsFn<A, B>, elseFn?: (a: A) => void): Iter<B>;
  filter(fn: FilterFn<A>, elseFn?: (a: A) => void): Iter<A>;
  map<B>(fn: MapFn<A, B>): Iter<B>;
  flatMap<B>(fn: FlatMapFn<A, B>): Iter<B>;
  catch(fn: CatchFn): Iter<A>;
}

export type IterLike<A> = undefined | A | Iterable<A> | Promise<A> | AI<A>;

/**
 * Creates an Iter from an IterLike.
 */
export function iter<A>(value: IterLike<A>): Iter<A> {
  const it = of(value);
  return Object.assign(it, {
    forEach: (fn: ForEachFn<A>) => forEach(fn)(it),
    is: <B extends A>(fn: IsFn<A, B>, elseFn?: (a: A) => void) => iter(is(fn, elseFn)(it)),
    filter: (fn: FilterFn<A>, elseFn?: (a: A) => void) => iter(filter(fn, elseFn)(it)),
    map: <B>(fn: MapFn<A, B>) => iter(map(fn)(it)),
    flatMap: <B>(fn: FlatMapFn<A, B>) => iter(flatMap(fn)(it)),
    catch: (fn: CatchFn) => iter(catcher<A>(fn)(it)),
  });
}

/**
 * Creates an AsyncIterableIterator from an IterLike.
 */
export async function* of<A>(value: IterLike<A>): AII<A> {
  if (isAsyncIterable(value)) {
    yield* value;
  } else if (isIterable(value)) {
    yield* value;
  } else if (value !== undefined) {
    yield value;
  }
}

export function forEach<A>(fn: ForEachFn<A>): (it: AI<A>) => Promise<void> {
  return async function forEach(it: AI<A>) {
    for await (const value of it) {
      await fn(value);
    }
  };
}

export function is<A, B extends A>(fn: IsFn<A, B>, elseFn?: (value: A) => void): (it: AI<A>) => AG<B> {
  return async function* filter(it: AI<A>): AG<B> {
    for await (const value of it) {
      if (fn(value)) {
        yield value;
      } else if (elseFn) {
        elseFn(value);
      }
    }
  };
}

export function filter<A>(fn: FilterFn<A>, elseFn?: (a: A) => void): (it: AI<A>) => AG<A> {
  return async function* filter(it: AI<A>): AG<A> {
    for await (const value of it) {
      if (await fn(value)) {
        yield value;
      } else if (elseFn) {
        elseFn(value);
      }
    }
  };
}

export function map<A, B>(fn: MapFn<A, B>): (it: AI<A>) => AG<B> {
  return async function* map(it: AI<A>): AG<B> {
    for await (const value of it) {
      yield await fn(value);
    }
  };
}

export function flatMap<A, B>(fn: FlatMapFn<A, B>): (it: AI<A>) => AII<B> {
  return async function* flatMap(it: AI<A>): AII<B> {
    for await (const value of it) {
      const result = fn(value);
      if (isPromise(result)) {
        yield result;
      } else if (isAsyncIterable(result)) {
        yield* result;
      } else {
        yield result;
      }
    }
  };
}

export function catcher<A>(fn: CatchFn): (it: AI<A>) => AG<A> {
  return async function* catcher(iterable: AI<A>): AG<A> {
    let it = iterable[Symbol.asyncIterator]();
    while (true) {
      try {
        const result = await it.next();
        if (result.done) break;
        yield result.value;
      } catch (e) {
        await fn(e);
      }
    }
  };
}

export function isPromise(value: any): value is Promise<any> {
  return value && value.hasOwnProperty('then');
}

export function isIterable(value: any): value is Iterable<any> {
  return value && value.hasOwnProperty(Symbol.iterator);
}

export function isAsyncIterable(value: any): value is AI<any> {
  return value && value.hasOwnProperty(Symbol.asyncIterator);
}

export async function* numberRange({
  start,
  exclusiveEnd,
  increment = 1,
}: {
  start: number;
  increment?: number;
  exclusiveEnd?: number;
}) {
  for (let value = start; !exclusiveEnd || value < exclusiveEnd; value = value + increment) {
    yield value;
  }
}
