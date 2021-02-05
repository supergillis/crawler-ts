export type AsyncIter<T> = AsyncIterator<T> | AsyncIterable<T>;

export function createParallelIterator<I extends AsyncIter<any>>(concurrency: number) {
  const promises = new Map();
  const iterators: I[] = [];

  const addPromise = (iter: AsyncIter<any>) => {
    const iterator = Symbol.asyncIterator in iter ? (iter as any)[Symbol.asyncIterator]() : iter;
    promises.set(iterator, next(iterator));
  };

  return {
    push(iterator: I) {
      if (promises.size < concurrency) {
        addPromise(iterator);
      } else {
        iterators.push(iterator);
      }
    },
    generator: async function* () {
      try {
        while (promises.size > 0) {
          const reply = await Promise.race(promises.values());

          if (reply.length === 3) {
            const [, iterator, err] = reply;
            // Since this iterator threw, it's already ended, so we remove it.
            promises.delete(iterator);
            throw err;
          }

          const [res, iterator] = reply;
          if (res.done) {
            promises.delete(iterator);

            const nextIterator = iterators.shift();
            if (nextIterator) {
              addPromise(nextIterator);
            }
          } else {
            yield res.value;
            promises.set(iterator, next(iterator));
          }
        }
      } finally {
        promises.forEach((_, iterator) => void iterator.return?.());
      }
    },
  };
}

async function next<T>(iterator: AsyncIterator<T>) {
  return iterator
    .next()
    .then((res) => [res, iterator] as const)
    .catch((err) => [undefined, iterator, err] as const);
}
