import * as fs from 'fs';
import * as path from 'path';
import { createCrawler as createCrawlerBase, Options as OptionsBase, Logger } from 'crawler-ts';

export type Response = fs.Stats;
export type Parsed = fs.Stats;

/**
 * Requester that requests file system stats for the path.
 */
export async function requester(location: string): Promise<Response> {
  return fs.statSync(location);
}

export async function parser({ response }: { response: Response }): Promise<Parsed> {
  return response;
}

/**
 * Follower that follows all paths inside a directory.
 */
export const createFollower = (logger?: Logger) =>
  async function* follower({ location, parsed }: { location: string; parsed: Parsed }) {
    if (parsed.isDirectory()) {
      logger?.info(`Following directory "${location}"`);
      const entries = fs.readdirSync(location);
      yield* entries.map((e) => path.resolve(location, e));
    } else {
      logger?.info(`Not following non-directory "${location}"`);
    }
  };

export type Options = Omit<OptionsBase<string, Response, Parsed>, 'follower' | 'parser' | 'requester'>;

export function createCrawler(options: Options) {
  return createCrawlerBase({
    ...options,
    parser,
    requester,
    follower: createFollower(),
  });
}
