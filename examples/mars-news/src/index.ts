import { selectOne } from 'css-select';
import { getText } from 'domutils';
import { chain, allowRegex, ignoreDoubles } from 'crawler-ts/src';
import { createCrawler, allowHtml, allowProtocols } from 'crawler-ts-htmlparser2/src';

async function main() {
  const nasaMarsBlogRegex = /\/mars\.nasa\.gov\/news\/([\d]+)\//;

  const allowUrlRegex = allowRegex<URL>((url) => url.href);

  // In this case we find the ":id" piece in the URL and use it to detect duplicates
  const ignoreMarsNewsDoubles = ignoreDoubles<URL>((url) => {
    const match = url.href.match(nasaMarsBlogRegex);
    const newsId = match?.[1];
    return newsId ?? '';
  });

  // Only parse text/html
  const parseFilter = allowHtml();

  // Only queue links with
  // - ignore already visited
  const followFilter = chain(
    allowProtocols(['http', 'https']),
    // Allow news pages
    allowUrlRegex([nasaMarsBlogRegex]),
    // Ignore already visited
    ignoreMarsNewsDoubles(),
  );

  const crawler = createCrawler({
    parseFilter,
    followFilter,
  });

  const root = new URL('https://mars.nasa.gov/news');
  for await (const { location, parsed } of crawler(root)) {
    // Do something with the crawled result
    const titleElement = selectOne('h1', parsed);
    const title = titleElement ? getText(titleElement).trim() : 'N/A';
    console.log(location.href, title);
  }
}

main();
