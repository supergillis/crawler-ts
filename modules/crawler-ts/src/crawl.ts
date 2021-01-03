import { allowHttpOk, allowHtml, chain, IResponse } from "./filter";

export interface Config<Response extends IResponse, Result> {
  requester(url: URL): Promise<Response>;
  parser(url: URL, response: Response): Promise<Result>;
  follower(result: Result): AsyncGenerator<URL>;
  shouldParse(url: URL, response: Response): boolean;
  shouldQueue(url: URL): boolean;
  shouldYield(result: Result): boolean;
}

export const defaultParseFilter = chain(allowHttpOk, allowHtml);

export function crawl<Response extends IResponse, Result>(
  config: Config<Response, Result>
): (url: URL) => AsyncGenerator<Result> {
  const {
    requester,
    parser,
    follower,
    shouldParse = defaultParseFilter,
    shouldQueue,
    shouldYield,
  } = config;

  return async function* gen(url: URL): AsyncGenerator<Result> {
    try {
      console.debug(`Requesting ${url.href}`);
      const response = await requester(url);
      if (shouldParse(url, response)) {
        console.debug(`Parsing ${url.href}`);
        const result = await parser(url, response);

        if (shouldYield(result)) {
          console.debug(`Yielding ${url.href}`);
          yield result;
        }

        for await (const link of follower(result)) {
          try {
            if (shouldQueue(link)) {
              console.debug(`Queueing ${link.href}`);
              yield* gen(link);
            }
          } catch (e) {
            console.error(`Cannot queue ${link}`);
            console.error(e);
          }
        }
      }
    } catch (e) {
      console.error(`Cannot visit ${url.href}`);
      console.error(e);
    }
  };
}
