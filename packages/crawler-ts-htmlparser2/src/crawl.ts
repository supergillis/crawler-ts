import { selectAll } from 'css-select';
import { parseDocument } from 'htmlparser2';
import { Document, Element } from 'domhandler';
import * as crawler from 'crawler-ts';
import * as crawlerFetch from 'crawler-ts-fetch';

export type Location = URL;
export type Response = crawlerFetch.Response;
export type Parsed = Document;

export type Requester = crawler.Requester<Location, Response>;
export type RequesterOptions = crawler.RequesterOptions<Location>;
export type Parser = crawler.Parser<Location, Response, Parsed>;
export type ParserOptions = crawler.ParserOptions<Location, Response>;
export type Follower = crawler.Follower<Location, Response, Parsed>;
export type FollowerOptions = crawler.FollowerOptions<Location, Response, Parsed>;

export function createDefaultRequester(delayMilliseconds?: number) {
  const requester = crawlerFetch.createRequester(delayMilliseconds);

  return async (options: RequesterOptions): Promise<ParserOptions | undefined> => {
    console.log();
    const response = await requester(options.location.href);
    return {
      ...options,
      response,
    };
  };
}

export async function defaultParser(options: ParserOptions): Promise<FollowerOptions | undefined> {
  const body = await options.response.text();
  return {
    ...options,
    parsed: parseDocument(body),
  };
}

export async function* defaultFollower({ location, parsed }: FollowerOptions): AsyncGenerator<Location> {
  const links = selectAll('a', parsed)
    .map((node) => node as Element)
    .map((node) => node.attribs['href'])
    .filter((link) => !!link);
  for (const link of links) {
    const url = new URL(link, location.href);
    url.username = '';
    url.password = '';
    url.hash = '';
    yield url;
  }
}

export interface HtmlCrawlerOptions
  extends Omit<crawler.FilteredCrawlerOptions<URL, Response, Parsed>, 'follower' | 'parser' | 'requester'> {
  delayMilliseconds?: number;
}

export function createCrawler(options: HtmlCrawlerOptions): crawler.Crawler<Location, Response, Parsed> {
  return crawler.createFilteredCrawler({
    ...options,
    requester: createDefaultRequester(options.delayMilliseconds),
    parser: defaultParser,
    follower: defaultFollower,
  });
}
