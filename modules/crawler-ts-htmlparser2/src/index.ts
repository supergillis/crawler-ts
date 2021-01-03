import select from 'css-select';
import { Parser } from 'htmlparser2';
import { DomHandler, Node, Element } from 'domhandler';
import { crawl as crawlBase, Config as ConfigBase, IResponse } from 'crawler-ts';

export type Root = Node[];

export interface Result {
  url: URL;
  root: Root;
}

export async function parser<Response extends IResponse>(url: URL, response: Response): Promise<Result> {
  return new Promise<Result>((resolve, reject) => {
    const handler = new DomHandler((e, root) => {
      if (e) {
        reject(e)
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
    .map(node => node as Element)
    .map(node => node.attribs['href'])
    .filter(link => !!link);
  for (const link of links) {
    const url =  new URL(link, result.url.href);
    url.username = "";
    url.password = "";
    url.hash = "";
    yield url;
  }
}

export type Config<Response extends IResponse> = Omit<ConfigBase<Response, Result>, 'follower' | 'parser'>;

export function crawl<Response extends IResponse>(config: Config<Response>) {
  return crawlBase({
    ...config,
    parser,
    follower,
  });
}
