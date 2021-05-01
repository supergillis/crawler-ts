import chalk from 'chalk';
import type { Element } from 'domhandler';
import { selectAll } from 'css-select';
import { getAttributeValue, getText } from 'domutils';
import { chain, ignoreDoubles } from 'crawler-ts/src';
import { allowRegex, allowHtml, allowProtocols, createCrawler, allowHttpOk } from 'crawler-ts-htmlparser2/src';

async function main() {
  const hackerNewsPageRegex = /\/news\.ycombinator\.com\/news\?p=([\d]+)/;

  // In this case we find the "?p=:page" piece in the URL and use it to detect duplicates
  const ignorePageDoubles = ignoreDoubles((location: URL) => {
    const match = location.href.match(hackerNewsPageRegex);
    const pageId = match?.[1];
    return pageId ?? '';
  });

  const parseFilter = chain(
    allowHttpOk(),
    // Allow text/html
    allowHtml(),
  );

  const followFilter = chain(
    allowProtocols(['http', 'https']),
    // Allow news pages
    allowRegex([hackerNewsPageRegex]),
    // Ignore already visited
    ignorePageDoubles(),
  );

  const crawler = createCrawler({
    parseFilter,
    followFilter,
  });

  const root = new URL('https://news.ycombinator.com/news');
  for await (const { location, parsed } of crawler(root)) {
    // Do something with the crawled result
    const titleElements = selectAll('a.storylink', parsed);
    const titles: Title[] = titleElements.map((e) => ({
      value: getText(e),
      href: getAttributeValue(e as Element, 'href'),
      location,
    }));

    // Log all titles
    titles.forEach(log);
  }
}

interface Title {
  value: string;
  href: string | undefined;
  location: URL;
}

function log({ value, href, location }: Title) {
  const resolved = new URL(href ?? '', location).href;
  console.log(chalk.bold(value), chalk.dim(resolved));
}

main();
