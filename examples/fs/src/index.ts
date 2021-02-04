import * as fs from 'fs';
import * as path from 'path';
import { crawl, allowExtensions, ignoreDoubles, ignoreRegex, Logger } from 'crawler-ts/src';

const entryIsFile = ({ parsed }: { parsed: fs.Stats }) => parsed.isFile();

// Create filters for paths and FsEntry
const allowTypeScript = allowExtensions()(['ts']);
const pathIgnoreRegex = ignoreRegex();
const pathIgnoreDoubles = ignoreDoubles();

/**
 * File crawler that finds all ".ts" files.
 */
const fileCrawler = () =>
  crawl<string, fs.Stats, fs.Stats>({
    // Use the file system to request paths
    requester: fileRequester(),
    // Ignore .git, dist and node_module files
    shouldParse: pathIgnoreRegex([/\/\.git$/, /\/dist$/, /\/node_modules$/]),
    // No need for parsing, just return the response
    parser: ({ response }) => response,
    // Only yield paths with extension ".ts" that are files
    shouldYield: ({ location, parsed }) => entryIsFile({ parsed }) && allowTypeScript({ location }),
    // Follow files in a directory
    follower: fileFollower(),
    // Ignore doubles
    shouldQueue: pathIgnoreDoubles(),
  });

/**
 * Requester that requests file system stats for the path.
 */
const fileRequester = () => async (location: string): Promise<fs.Stats> => fs.statSync(location);

/**
 * Follower that follows all paths inside a directory.
 */
const fileFollower = (logger?: Logger) =>
  async function* ({ location, parsed }: { location: string; parsed: fs.Stats }) {
    if (parsed.isDirectory()) {
      logger?.info(`Following directory "${location}"`);
      const entries = fs.readdirSync(location);
      yield* entries.map((e) => path.resolve(location, e));
    } else {
      logger?.info(`Not following non-directory "${location}"`);
    }
  };

async function main() {
  const root = process.argv?.[2] ?? process.cwd();
  const crawler = fileCrawler();

  for await (const { location, parsed } of crawler(root)) {
    // Do something with the crawled result
    console.log(location, parsed.size);
  }
}

main();
