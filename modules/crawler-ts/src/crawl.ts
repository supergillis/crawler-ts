import { allowHttpOk, allowHtml, chain, IResponse, IUrl } from "./filter";

export interface Config<Res extends IResponse, Parsed> {
  requester(url: IUrl): Promise<Res>;
  parser(url: IUrl, res: Res): Promise<Parsed>;
  follower(parsed: Parsed): AsyncGenerator<IUrl>;
  shouldParse(url: IUrl, res: Res): boolean;
  shouldQueue(url: IUrl): boolean;
  shouldYield(parsed: Parsed): boolean;
}

export const defaultParseFilter = chain(allowHttpOk, allowHtml);

export function crawl<Res extends IResponse, Parsed>(
  config: Config<Res, Parsed>
): (url: IUrl) => AsyncGenerator<Parsed> {
  const {
    requester,
    parser,
    follower,
    shouldParse = defaultParseFilter,
    shouldQueue,
    shouldYield,
  } = config;

  return async function* gen(url: IUrl): AsyncGenerator<Parsed> {
    try {
      console.debug(`Requesting ${url.href}`);
      const response = await requester(url);
      if (shouldParse(url, response)) {
        console.debug(`Parsing ${url.href}`);
        const parsed = await parser(url, response);

        if (shouldYield(parsed)) {
          console.debug(`Yielding ${url.href}`);
          yield parsed;
        }

        for await (const link of follower(parsed)) {
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
