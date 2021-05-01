import { Response } from 'crawler-ts-fetch';
import {
  allowExtensions as allowExtensionsBase,
  allowRegex as allowRegexBase,
  ignoreRegex as ignoreRegexBase,
  LocationFilter,
  Logger,
  WithLocation,
} from 'crawler-ts';

export type WithResponse = { response: Response };

export type WithURL = WithLocation<URL>;

export type URLFilter = LocationFilter<URL>;

export const toString = (url: URL) => url.href;

export const allowRegex = allowRegexBase(toString);
export const allowExtensions = allowExtensionsBase(toString);
export const ignoreRegex = ignoreRegexBase(toString);

export function allowHttpOk(logger?: Logger) {
  return function allowHttpOk({ response }: WithResponse): boolean {
    if (!response.ok) {
      logger?.info(`Not allowing status ${response.status}`);
      return false;
    }
    return true;
  };
}

export function allowContentType(allowedContentType: RegExp, logger?: Logger) {
  return function allowContentType({ response }: WithResponse): boolean {
    const headers = response.headers.raw();
    const contentType = headers['content-type'];
    if (!contentType || !allowedContentType.test(contentType?.[0] ?? contentType)) {
      logger?.info(`Not allowing content type ${contentType}`);
      return false;
    }
    return true;
  };
}

export function allowHtml(logger?: Logger) {
  return allowContentType(/text\/html;?.*/, logger);
}

export function allowHosts(allowedHosts: string[], logger?: Logger) {
  return function allowHosts({ location }: WithURL): boolean {
    if (allowedHosts.indexOf(location.host) === -1) {
      logger?.info(`Host not allowed ${location.host}`);
      return false;
    }
    return true;
  };
}

export function allowProtocols(allowedProtocols: string[], logger?: Logger) {
  const transformedProtocols = allowedProtocols.map((protocol) => `${protocol}:`);
  return function allowProtocols({ location }: WithURL): boolean {
    if (transformedProtocols.indexOf(location.protocol) === -1) {
      logger?.info(`Protocol not allowed ${location.protocol}`);
      return false;
    }
    return true;
  };
}
