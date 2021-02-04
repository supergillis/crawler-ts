import type { Element } from 'domhandler';
import { selectAll } from 'css-select';
import { getAttributeValue, getText } from 'domutils';
import { chain, allowRegex, ignoreDoubles } from 'crawler-ts/src';
import { createCrawler, allowHtml, allowProtocols } from 'crawler-ts-htmlparser2/src';

async function main() {
  const hackerNewsPageRegex = /\/news\.ycombinator\.com\/news\?p=([\d]+)/;

  const allowUrlRegex = allowRegex<URL>((url) => url.href);

  // In this case we find the "?p=:page" piece in the URL and use it to detect duplicates
  const ignorePageDoubles = ignoreDoubles<URL>((url) => {
    const match = url.href.match(hackerNewsPageRegex);
    const pageId = match?.[1];
    return pageId ?? '';
  });

  // Only parse text/html
  const shouldParse = allowHtml();

  // Only queue links with
  // - ignore already visited
  const shouldQueue = chain(
    allowProtocols(['http', 'https']),
    // Allow news pages
    allowUrlRegex([hackerNewsPageRegex]),
    // Ignore already visited
    ignorePageDoubles(),
  );

  const crawler = createCrawler({
    shouldParse,
    shouldQueue,
    shouldYield: () => true,
  });

  const root = new URL('https://news.ycombinator.com/news');
  for await (const { location, parsed } of crawler(root)) {
    // Do something with the crawled result
    const titleElements = selectAll('a.storylink', parsed);
    const titles = titleElements.map((e) => ({
      value: getText(e),
      href: getAttributeValue(e as Element, 'href'),
    }));
    // Log all titles
    titles.forEach((title) => console.log(title.href, title.value));
  }
}

main();
