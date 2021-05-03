import * as crawler from './crawl';
import { FilterFn, FlatMapFn, iter, ValueOrPromise } from './iterators';

export type RequestFilter<L> = FilterFn<crawler.RequesterOptions<L>>;
export type ParseFilter<L, R, P> = FilterFn<crawler.FollowerOptions<L, R, P>>;
export type YieldFilter<L, R, P> = FilterFn<crawler.FollowerOptions<L, R, P>>;
export type FollowFilter<L> = FilterFn<{ location: L }>;

export interface FilteredCrawlerOptions<L, R, P> extends crawler.CrawlerOptions<L, R, P> {
  requestFilter?: RequestFilter<L>;
  parseFilter?: ParseFilter<L, R, P>;
  yieldFilter?: YieldFilter<L, R, P>;
  followFilter?: FollowFilter<L>;
}

export function filterFlatMap<A, B>(fn: FlatMapFn<A, B | undefined>, filter: (value: B) => ValueOrPromise<boolean>) {
  return async function* (a: A): AsyncIterableIterator<B> {
    yield* iter(fn(a)).is(crawler.isDefined).filter(filter);
  };
}

export function createFilteredOptions<L, R, P>(
  options: FilteredCrawlerOptions<L, R, P>,
): crawler.CrawlerOptions<L, R, P> {
  const {
    requester: defaultRequester,
    requestFilter,
    parser: defaultParser,
    parseFilter,
    yielder: defaultYielder,
    yieldFilter,
    follower: defaultFollower,
    followFilter,
    logger,
  } = options;

  let requester = defaultRequester;
  let parser = defaultParser;
  let yielder = defaultYielder;
  let follower = defaultFollower;

  if (requestFilter) {
    requester = async function* (value) {
      // prettier-ignore
      yield* iter(defaultRequester(value))
        .is(crawler.isDefined)
        .filter(requestFilter, (opts) => logger?.debug(`Not allowing request for ${opts?.location}`));
    };
  }
  if (parseFilter) {
    parser = async function* (value) {
      // prettier-ignore
      yield* iter(defaultParser(value))
        .is(crawler.isDefined)
        .filter(parseFilter, (opts) => logger?.debug(`Not allowing parsing for ${opts?.location}`));
    };
  }

  if (followFilter) {
    follower = async function* (value) {
      // prettier-ignore
      yield* iter(defaultFollower(value))
        .is(crawler.isDefined)
        .map(location => ({ location }))
        .filter(followFilter, (opts) => logger?.debug(`Not allowing filter for ${opts?.location}`))
        .map(opts => opts.location);
    };
  }

  if (yieldFilter) {
    yielder = async function* (value) {
      // prettier-ignore
      yield* iter((defaultYielder ?? crawler.defaultYielder)(value))
        .is(crawler.isDefined)
        .filter(yieldFilter, (opts) => logger?.debug(`Not allowing yield for ${opts?.location}`))
    };
  }

  return {
    ...options,
    requester,
    parser,
    yielder,
    follower,
  };
}

export function createFilteredCrawler<L, R, P>(options: FilteredCrawlerOptions<L, R, P>): crawler.Crawler<L, R, P> {
  return crawler.createCrawler(createFilteredOptions(options));
}

export type WithLocation<L> = { location: L };

export type LocationFilter<L> = (value: WithLocation<L>) => boolean;

export type ToString<L> = (location: L) => string;

export function chain<A>(...fns: Array<(a: A) => boolean>): (a: A) => boolean;
export function chain<A, B>(...fns: Array<(a: A, b: B) => boolean>): (a: A, b: B) => boolean;

/**
 * Chain multiple filter functions together.
 */
export function chain(...fns: Array<Function>): () => boolean {
  return function (this: unknown): boolean {
    for (const fn of fns) {
      if (!fn.apply(this, arguments)) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Create a filter that allows specific extensions.
 */
export const allowExtensions = <L>(toString: ToString<L>) => (
  allowedExtensions: string[],
  logger?: crawler.Logger,
): LocationFilter<L> =>
  function allowExtensions(value) {
    const string = toString(value.location);
    const lastSlashIndex = Math.max(0, string.lastIndexOf('/'));
    const lastSlashPart = string.substr(lastSlashIndex);
    const lastDotIndex = lastSlashPart.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const extension = lastSlashPart.substr(lastDotIndex + 1);
      if (allowedExtensions.indexOf(extension) === -1) {
        logger?.info(`Extension not allowed ${string}`);
        return false;
      }
      return true;
    }
    return false;
  };

/**
 * Create a filter that allows values matching the given regexes.
 */
export const allowRegex = <L>(toString: ToString<L>) => (
  allowUrls: RegExp[],
  logger?: crawler.Logger,
): LocationFilter<L> =>
  function allowRegex(value) {
    const string = toString(value.location);
    for (const allowUrl of allowUrls) {
      if (allowUrl.test(string)) {
        return true;
      }
    }
    logger?.info(`Not allowing unmatched ${string}`);
    return false;
  };

/**
 * Create a filter that ignores values matching the given regexes.
 */
export const ignoreRegex = <L>(toString: ToString<L>) => (
  ignoredUrls: RegExp[],
  logger?: crawler.Logger,
): LocationFilter<L> =>
  function ignoreRegex(value) {
    const string = toString(value.location);
    for (const ignoredUrl of ignoredUrls) {
      logger?.info(`${ignoredUrl}.test(${string})`, ignoredUrl.test(string));
      if (ignoredUrl.test(string)) {
        logger?.info(`Not allowing ignored ${string}`);
        return false;
      }
    }
    return true;
  };

/**
 * Create a filter that ignores doubles.
 */
export const ignoreDoubles = <L>(toString: ToString<L>) => (logger?: crawler.Logger): LocationFilter<L> => {
  const seen: string[] = [];
  return function ignoreDoubles(value) {
    const string = toString(value.location);
    if (!string || seen.includes(string)) {
      logger?.info(`Skipping visited "${string}"`);
      return false;
    }
    seen.push(string);
    return true;
  };
};

export const cache = <L>(toString: ToString<L>) => (fn: LocationFilter<L>): LocationFilter<L> => {
  const shouldFollowCache: { [key: string]: boolean } = {};
  return function cachedShouldFollow(value) {
    const string = toString(value.location);
    if (shouldFollowCache.hasOwnProperty(string)) {
      return shouldFollowCache[string];
    }
    const shouldFollow = fn(value);
    shouldFollowCache[string] = shouldFollow;
    return shouldFollow;
  };
};
