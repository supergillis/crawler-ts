import select from 'css-select';
import { Parser } from 'htmlparser2';
import { DomHandler, Node, Element } from 'domhandler';
import { crawl as crawlBase, Config as ConfigBase } from 'crawler-ts';
import { createRequester as createFetchRequester } from 'crawler-ts-fetch';
import { Response } from './filter';

export type Root = Node[];

export interface Result {
  url: URL;
  root: Root;
}

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

export async function parser<R extends Response>(url: URL, response: R): Promise<Result> {
  return new Promise<Result>((resolve, reject) => {
    const handler = new DomHandler((e, root) => {
      if (e) {
        reject(e);
      } else {
        resolve({
          url,
          root,
        });
      }
    });

    const parser = new Parser(handler);
    parser.write(response.body);
    parser.end();
  });
}

export async function* follower(result: Result): AsyncGenerator<URL> {
  const links = select
    .selectAll('a', result.root)
    .map((node) => node as Element)
    .map((node) => node.attribs['href'])
    .filter((link) => !!link);
  for (const link of links) {
    const url = new URL(link, result.url.href);
    url.username = '';
    url.password = '';
    url.hash = '';
    yield url;
  }
}

export type Config = Omit<ConfigBase<URL, Response, Result>, 'follower' | 'parser' | 'requester'>;

export function crawl(config: Config) {
  return crawlBase({
    ...config,
    parser,
    follower,
    requester: createRequester(),
  });
}
