import { chain, allowRegex, ignoreDoubles } from "crawler-ts/src";
import { crawl, allowHtml, allowProtocols } from "crawler-ts-htmlparser2/src";

async function main() {
  // Ignore search parameters
  const urlToStringWithoutQuery = (url: URL) =>
    `${url.protocol}//${url.host}${url.pathname}`;

  const allowPathnameRegex = allowRegex<URL>(urlToStringWithoutQuery);
  const ignorePathnameDoubles = ignoreDoubles<URL>(urlToStringWithoutQuery);

  // Only parse text/html
  const shouldParse = allowHtml();

  // Only queue links with
  // - ignore already visited
  const shouldQueue = chain(
    // Protocol http or https
    allowProtocols(["http", "https"]),
    // Allow news pages
    allowPathnameRegex([/\/mars\.nasa\.gov\/news\/[\d]+\//]),
    // Ignore already visited
    ignorePathnameDoubles()
  );

  // Yield news pages
  const shouldYield = allowPathnameRegex([/\/mars\.nasa\.gov\/news\/[\d]+\//]);

  const crawler = crawl({
    shouldParse,
    shouldQueue,
    shouldYield: (result) => shouldYield(result.url),
  });

  const root = new URL("https://mars.nasa.gov/news");
  for await (const result of crawler(root)) {
    // Do something with the crawled result
    console.log(result.url.href);
  }
}

main();
