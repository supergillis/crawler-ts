export type IHeaders = { [key: string]: string };

export interface IResponse {
  status: number;
  headers: IHeaders;
  body: string;
}

export type UrlFilter = (url: URL) => boolean;
export type ResponseFilter = (url: URL, response: IResponse) => boolean;

export function chain<A>(...fns: Array<(a: A) => boolean>): (a: A) => boolean;
export function chain<A, B>(
  ...fns: Array<(a: A, b: B) => boolean>
): (a: A, b: B) => boolean;
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

export function regex(regex: RegExp): UrlFilter {
  return (url: URL): boolean => {
    return regex.test(url.href);
  };
}

export function allowHttpOk(url: URL, response: IResponse): boolean {
  if (response.status !== 200) {
    console.debug(`Not allowing ${response.status}`);
    return false;
  }
  return true;
}

const htmlContentType = /text\/html;?.*/;
export function allowHtml<Res extends IResponse>(
  url: URL,
  response: Res
): boolean {
  const contentType = response.headers["content-type"];
  if (!contentType || !htmlContentType.test(contentType)) {
    console.debug(`Not allowing ${contentType}`);
    return false;
  }
  return true;
}

export function allowHosts(allowedHosts: string[]): UrlFilter {
  return (url: URL): boolean => {
    if (allowedHosts.indexOf(url.host) === -1) {
      console.debug(`Host not allowed ${url.host}`);
      return false;
    }
    return true;
  };
}

export function allowProtocols(allowedProtocols: string[]): UrlFilter {
  const transformedProtocols = allowedProtocols.map(
    (protocol) => `${protocol}:`
  );
  return (url: URL): boolean => {
    if (transformedProtocols.indexOf(url.protocol) === -1) {
      console.debug(`Protocol not allowed ${url.protocol}`);
      return false;
    }
    return true;
  };
}

export function allowExtensions(allowedExtensions: string[]): UrlFilter {
  return (url: URL): boolean => {
    const lastSlashIndex = Math.max(0, url.pathname.lastIndexOf("/"));
    const lastSlashPart = url.pathname.substr(lastSlashIndex);
    const lastDotIndex = lastSlashPart.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      const extension = lastSlashPart.substr(lastDotIndex + 1);
      if (allowedExtensions.indexOf(extension) === -1) {
        console.debug(`Extension not allowed ${url.href}`);
        return false;
      }
    }
    return true;
  };
}

export function allowUrls(allowUrls: RegExp[]): UrlFilter {
  return (url: URL): boolean => {
    for (const allowUrl of allowUrls) {
      if (allowUrl.test(url.href)) {
        console.debug(`Allowing ${url.href}`);
        return true;
      }
    }
    return false;
  };
}

export function ignoreUrls(ignoredUrls: RegExp[]): UrlFilter {
  return (url: URL): boolean => {
    for (const ignoredUrl of ignoredUrls) {
      if (ignoredUrl.test(url.href)) {
        console.debug(`Ignoring ${url.href}`);
        return false;
      }
    }
    return true;
  };
}

export function ignoreDoubles(
  keyFn: (url: URL) => string | null | undefined = (url) => url.href
): UrlFilter {
  const seen: string[] = [];
  return (url: URL): boolean => {
    const key = keyFn(url);
    if (!key || seen.includes(key)) {
      console.debug(`Skipping visited "${url.href}"`);
      return false;
    }
    seen.push(key);
    return true;
  };
}

export function cache(fn: UrlFilter): UrlFilter {
  const shouldFollowCache: { [key: string]: boolean } = {};
  return function cachedShouldFollow(url: URL): boolean {
    if (shouldFollowCache.hasOwnProperty(url.href)) {
      return shouldFollowCache[url.href];
    }
    const shouldFollow = fn(url);
    shouldFollowCache[url.href] = shouldFollow;
    return shouldFollow;
  };
}
