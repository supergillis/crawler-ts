import select from 'css-select';
import { Parser } from 'htmlparser2';
import { DomHandler, Node, Element } from 'domhandler';
import { crawl as crawlBase, Config as ConfigBase } from 'crawler-ts';
import { createRequester as createFetchRequester } from 'crawler-ts-fetch';
import { Response } from './filter';

export type Parsed = Node[];

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
  return new Promise<Parsed>((resolve, reject) => {
    const handler = new DomHandler((e, root) => {
      if (e) {
        reject(e);
      } else {
        resolve(root);
      }
    });

    const parser = new Parser(handler);
    parser.write(response.body);
    parser.end();
  });
}

export async function* follower({ location, parsed }: { location: URL; parsed: Parsed }): AsyncGenerator<URL> {
  const links = select
    .selectAll('a', parsed)
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

export type Config = Omit<ConfigBase<URL, Response, Parsed>, 'follower' | 'parser' | 'requester'>;

export function crawl(config: Config) {
  return crawlBase({
    ...config,
    parser,
    follower,
    requester: createRequester(),
  });
}
