import {
  Logger,
  Filter,
  allowExtensions,
  allowRegex,
  ignoreDoubles,
  ignoreRegex,
} from "crawler-ts";

export interface Response {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type UrlFilter = Filter<URL>;

export const urlToString = (url: URL) => url.href;

export const allowUrlRegex = allowRegex(urlToString);
export const allowUrlExtensions = allowExtensions(urlToString);
export const ignoreUrlRegex = ignoreRegex(urlToString);
export const ignoreUrlDoubles = ignoreDoubles(urlToString);

export function allowHttpOk(logger?: Logger) {
  return function (url: URL, response: Response): boolean {
    if (response.status !== 200) {
      logger?.info(`Not allowing ${response.status}`);
      return false;
    }
    return true;
  };
}

const htmlContentType = /text\/html;?.*/;

export function allowHtml(logger?: Logger) {
  return function <Res extends Response>(url: URL, response: Res): boolean {
    const contentType = response.headers["content-type"];
    if (!contentType || !htmlContentType.test(contentType)) {
      logger?.info(`Not allowing ${contentType}`);
      return false;
    }
    return true;
  };
}

export function allowHosts(allowedHosts: string[], logger?: Logger): UrlFilter {
  return (url: URL): boolean => {
    if (allowedHosts.indexOf(url.host) === -1) {
      logger?.info(`Host not allowed ${url.host}`);
      return false;
    }
    return true;
  };
}

export function allowProtocols(
  allowedProtocols: string[],
  logger?: Logger
): UrlFilter {
  const transformedProtocols = allowedProtocols.map(
    (protocol) => `${protocol}:`
  );
  return (url: URL): boolean => {
    if (transformedProtocols.indexOf(url.protocol) === -1) {
      logger?.info(`Protocol not allowed ${url.protocol}`);
      return false;
    }
    return true;
  };
}
