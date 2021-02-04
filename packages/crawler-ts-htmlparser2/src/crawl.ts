import { selectAll } from 'css-select';
import { parseDocument } from 'htmlparser2';
import { Document, Element } from 'domhandler';
import { createCrawler as createCrawlerBase, Options as OptionsBase } from 'crawler-ts';
import { createRequester as createFetchRequester } from 'crawler-ts-fetch';
import { Response } from './filter';

export type Parsed = Document;

export function createRequester(delayMilliseconds?: number) {
  const requester = createFetchRequester(delayMilliseconds);

  return async (url: URL): Promise<Response> => {
    const response = await requester(url.href);
    const body = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  };
}

export async function parser<R extends Response>({ response }: { response: R }): Promise<Parsed> {
  return parseDocument(response.body);
}

export async function* follower({ location, parsed }: { location: URL; parsed: Parsed }): AsyncGenerator<URL> {
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

export type Options = Omit<OptionsBase<URL, Response, Parsed>, 'follower' | 'parser' | 'requester'>;

export function createCrawler(options: Options) {
  return createCrawlerBase({
    ...options,
    parser,
    follower,
    requester: createRequester(),
  });
}
