import { Logger } from './crawl';

export type Filter<T> = ({ location }: { location: T }) => boolean;
export type ToString<T> = (location: T) => string;

export const toString: ToString<any> = (value) => `${value}`;

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
export const allowExtensions = <T>(strFn: ToString<T> = toString) => (
  allowedExtensions: string[],
  logger?: Logger,
): Filter<T> => {
  return ({ location }): boolean => {
    const converted = strFn(location);
    const lastSlashIndex = Math.max(0, converted.lastIndexOf('/'));
    const lastSlashPart = converted.substr(lastSlashIndex);
    const lastDotIndex = lastSlashPart.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const extension = lastSlashPart.substr(lastDotIndex + 1);
      if (allowedExtensions.indexOf(extension) === -1) {
        logger?.info(`Extension not allowed ${converted}`);
        return false;
      }
    }
    return true;
  };
};

/**
 * Create a filter that allows values matching the given regexes.
 */
export const allowRegex = <T>(strFn: ToString<T> = toString) => (allowUrls: RegExp[], logger?: Logger): Filter<T> => {
  return ({ location }: { location: T }): boolean => {
    for (const allowUrl of allowUrls) {
      const converted = strFn(location);
      if (allowUrl.test(converted)) {
        logger?.info(`Allowing ${converted}`);
        return true;
      }
    }
    return false;
  };
};

/**
 * Create a filter that ignores values matching the given regexes.
 */
export const ignoreRegex = <T>(strFn: ToString<T> = toString) => (
  ignoredUrls: RegExp[],
  logger?: Logger,
): Filter<T> => {
  return ({ location }: { location: T }): boolean => {
    for (const ignoredUrl of ignoredUrls) {
      const converted = strFn(location);
      if (ignoredUrl.test(converted)) {
        logger?.info(`Ignoring ${converted}`);
        return false;
      }
    }
    return true;
  };
};

/**
 * Create a filter that ignores doubles.
 */
export const ignoreDoubles = <T>(strFn: ToString<T> = toString) => (logger?: Logger): Filter<T> => {
  const seen: string[] = [];
  return ({ location }: { location: T }): boolean => {
    const key = strFn(location);
    if (!key || seen.includes(key)) {
      logger?.info(`Skipping visited "${location}"`);
      return false;
    }
    seen.push(key);
    return true;
  };
};

export const cache = <T>(strFn: ToString<T> = toString) => (fn: Filter<T>): Filter<T> => {
  const shouldFollowCache: { [key: string]: boolean } = {};
  return function cachedShouldFollow({ location }: { location: T }): boolean {
    const string = strFn(location);
    if (shouldFollowCache.hasOwnProperty(string)) {
      return shouldFollowCache[string];
    }
    const shouldFollow = fn({ location });
    shouldFollowCache[string] = shouldFollow;
    return shouldFollow;
  };
};
