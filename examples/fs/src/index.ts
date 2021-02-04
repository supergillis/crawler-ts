import * as fs from 'fs';
import { allowExtensions, ignoreDoubles, ignoreRegex, Logger } from 'crawler-ts/src';
import { createCrawler } from 'crawler-ts-fs/src';

const entryIsFile = ({ parsed }: { parsed: fs.Stats }) => parsed.isFile();

// Create filters for paths and FsEntry
const allowTypeScript = allowExtensions()(['ts']);
const pathIgnoreRegex = ignoreRegex();
const pathIgnoreDoubles = ignoreDoubles();

/**
 * File crawler that finds all ".ts" files.
 */
const createTypeScriptCrawler = () =>
  createCrawler({
    // Ignore .git, dist and node_module files
    shouldParse: pathIgnoreRegex([/\/\.git$/, /\/dist$/, /\/node_modules$/]),
    // Only yield paths with extension ".ts" that are files
    shouldYield: ({ location, parsed }) => entryIsFile({ parsed }) && allowTypeScript({ location }),
    // Ignore doubles
    shouldQueue: pathIgnoreDoubles(),
  });

async function main() {
  const root = process.argv?.[2] ?? process.cwd();
  const crawler = createTypeScriptCrawler();

  for await (const { location, parsed } of crawler(root)) {
    // Do something with the crawled result
    console.log(location, parsed.size);
  }
}

main();
