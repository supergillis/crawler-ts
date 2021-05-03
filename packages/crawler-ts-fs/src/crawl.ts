import * as fs from 'fs';
import * as path from 'path';
import * as crawler from 'crawler-ts';

export type Location = string;
export type Response = fs.Stats;
export type Parsed = fs.Stats;

export type RequesterOptions = crawler.RequesterOptions<Location>;
export type ParserOptions = crawler.ParserOptions<Location, Response>;
export type FollowerOptions = crawler.FollowerOptions<Location, Response, Parsed>;

/**
 * Requester that requests file system stats for the path.
 */
export function defaultRequester(options: RequesterOptions): ParserOptions | undefined {
  return {
    ...options,
    response: fs.statSync(options.location),
  };
}

export function defaultParser(options: ParserOptions): FollowerOptions | undefined {
  return {
    ...options,
    parsed: options.response,
  };
}

/**
 * Follower that follows all paths inside a directory.
 */
export const createDefaultFollower = (logger?: crawler.Logger) =>
  async function* follower(options: FollowerOptions): AsyncGenerator<Location> {
    const { parsed, location } = options;
    if (parsed.isDirectory()) {
      logger?.info(`Following directory "${location}"`);

      const entries = fs.readdirSync(location);
      for (const entry of entries) {
        yield path.resolve(location, entry);
      }
    } else {
      logger?.info(`Not following non-directory "${location}"`);
    }
  };

export type Options = Omit<
  crawler.FilteredCrawlerOptions<Location, Response, Parsed>,
  'follower' | 'parser' | 'requester'
>;

export function createCrawler(options: Options): crawler.Crawler<Location, Response, Parsed> {
  return crawler.createFilteredCrawler({
    ...options,
    requester: defaultRequester,
    parser: defaultParser,
    follower: createDefaultFollower(options.logger),
  });
}
