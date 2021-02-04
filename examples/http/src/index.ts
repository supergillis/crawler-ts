import { chain, allowRegex, ignoreDoubles } from 'crawler-ts/src';
import { crawl, allowHtml, allowProtocols } from 'crawler-ts-htmlparser2/src';

async function main() {
  const nasaMarsBlogRegex = /\/mars\.nasa\.gov\/news\/([\d]+)\//;

  const allowUrlRegex = allowRegex<URL>((url) => url.href);

  // In this case we find the ":id" piece in the URL and use it to detect duplicates
  const ignoreMarsNewsDoubles = ignoreDoubles<URL>((url) => {
    const match = url.pathname.match(/news\/([\d]+)\//);
    const newsId = match?.[1];
    return newsId ?? '';
  });

  // Only parse text/html
  const shouldParse = allowHtml();

  // Only queue links with
  // - ignore already visited
  const shouldQueue = chain(
    allowProtocols(['http', 'https']),
    // Allow news pages
    allowUrlRegex([nasaMarsBlogRegex]),
    // Ignore already visited
    ignoreMarsNewsDoubles(),
  );

  const crawler = crawl({
    shouldParse,
    shouldQueue,
    shouldYield: () => true,
  });

  const root = new URL('https://mars.nasa.gov/news');
  for await (const { location, parsed } of crawler(root)) {
    // Do something with the crawled result
    console.log(location.href, parsed.length);
  }
}

main();
