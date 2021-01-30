import * as fs from 'fs';
import * as path from 'path';
import { crawl, chain, allowExtensions, ignoreDoubles, ignoreRegex } from 'crawler-ts/src';

interface FsEntry {
  stat: fs.Stats;
  path: string;
}

const entryIsFile = (entry: FsEntry) => entry.stat.isFile();

// Create filters for paths and FsEntry
const entryIgnoreExtensions = allowExtensions<FsEntry>((entry) => entry.path);
const pathIgnoreRegex = ignoreRegex();
const pathIgnoreDoubles = ignoreDoubles();

/**
 * File crawler that finds all ".ts" files.
 */
const fileCrawler = () =>
  crawl<string, FsEntry, FsEntry>({
    // Use the file system to request paths
    requester: fileRequester(),
    // Ignore .git, dist and node_module files
    shouldParse: pathIgnoreRegex([/\/\.git$/, /\/dist$/, /\/node_modules$/]),
    // No need for parsing, just return the response as result
    parser: (_url, response) => response,
    // Only yield paths with extension ".ts" that are files
    shouldYield: chain(entryIsFile, entryIgnoreExtensions(['ts'])),
    // Follow files in a directory
    follower: fileFollower(),
    // Ignore doubles
    shouldQueue: pathIgnoreDoubles(),
  });

/**
 * Requester that requests file system stats for the path.
 */
const fileRequester = () => async (path: string): Promise<FsEntry> => {
  return {
    stat: fs.statSync(path),
    path,
  };
};

/**
 * Follower that follows all paths inside a directory.
 */
const fileFollower = () =>
  async function* (entry: FsEntry) {
    if (entry.stat.isDirectory()) {
      const entries = fs.readdirSync(entry.path);
      yield* entries.map((e) => path.resolve(entry.path, e));
    }
  };

async function main() {
  const root = process.argv?.[2] ?? process.cwd();
  const crawler = fileCrawler();

  for await (const result of crawler(root)) {
    // Do something with the crawled result
    console.log(result.path);
  }
}

main();
