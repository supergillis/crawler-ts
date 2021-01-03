import select from 'css-select';
import { Parser } from 'htmlparser2';
import { DomHandler, Node, Element } from 'domhandler';
import { crawl as crawlBase, Config as ConfigBase, IResponse, IUrl } from 'crawler-ts';

export type Root = Node[];

export interface Parsed {
  url: IUrl;
  root: Root;
}

export async function parser<Res extends IResponse>(url: IUrl, response: Res): Promise<Parsed> {
  return new Promise<Parsed>((resolve, reject) => {
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

export async function* follower(parsed: Parsed): AsyncGenerator<IUrl> {
  const links = select
    .selectAll('a', parsed.root)
    .map(node => node as Element)
    .map(node => node.attribs['href'])
    .filter(link => !!link);
  for (const link of links) {
    const url =  new URL(link, parsed.url.href);
    url.username = "";
    url.password = "";
    url.hash = "";
    yield url;
  }
}

export type Config<Res extends IResponse> = Omit<ConfigBase<Res, Parsed>, 'follower' | 'parser'>;

export function crawl<Res extends IResponse>(config: Config<Res>) {
  return crawlBase({
    ...config,
    parser,
    follower,
  });
}
