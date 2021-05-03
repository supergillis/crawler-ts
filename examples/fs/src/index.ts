import * as fs from 'fs';
import { allowExtensions, ignoreDoubles, ignoreRegex } from 'crawler-ts/src';
import { createCrawler, Location } from 'crawler-ts-fs/src';

const entryIsFile = ({ parsed }: { parsed: fs.Stats }) => parsed.isFile();

const locationToString = (value: Location) => value;

// Create filters for paths and FsEntry
const allowTypeScript = allowExtensions(locationToString)(['ts']);
const pathIgnoreRegex = ignoreRegex(locationToString);
const pathIgnoreDoubles = ignoreDoubles(locationToString);

/**
 * File crawler that finds all ".ts" files.
 */
const createTypeScriptCrawler = () =>
  createCrawler({
    // Ignore .git, dist and node_module files
    requestFilter: pathIgnoreRegex([/\/\.git$/, /\/dist$/, /\/node_modules$/]),
    // Only yield paths with extension ".ts" that are files
    yieldFilter: (options) => entryIsFile(options) && allowTypeScript(options),
    // Ignore doubles
    followFilter: pathIgnoreDoubles(),
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
