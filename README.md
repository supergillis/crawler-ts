# crawler-ts

Crawl the web with TypeScript.

## Installation

```sh
npm install --save crawler-ts crawler-ts-fetch crawler-ts-htmlparser2
```

## Usage

```typescript
import { allowHosts, allowHtml, allowProtocols, chain, ignoreDoubles, regex } from "crawler-ts";
import { createRequester } from "crawler-ts-fetch";
import { crawl } from "crawler-ts-htmlparser2";

async function main() {
  // Only parse text/html
  const shouldParse = allowHtml;

  // Only queue links with
  // - protocol http and https;
  // - host twitter.com;
  // - ignore already visited
  const shouldQueue = chain(
    allowProtocols(["http", "https"]),
    allowHosts(["twitter.com"]),
    ignoreDoubles()
  );

  // Only yield links matching the regex
  const shouldYield = regex(/\/twitter\.com\/.*\/status\/\d+/);

  const crawler = crawl({
    requester: createRequester(),
    shouldParse,
    shouldQueue,
    shouldYield: (result) => shouldYield(result.url),
  });

  const root = new URL("https://twitter.com");
  for await (const result of crawler(root)) {
    // Do something with the crawled result
    console.log(result.url);
  }
}

main();
```
