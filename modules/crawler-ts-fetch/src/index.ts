import fetch from "node-fetch";
import type { IResponse, IUrl } from "crawler-ts";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createRequester(delayMilliseconds: number = 50) {
  return async (url: IUrl): Promise<IResponse> => {
    await delay(delayMilliseconds);
    const response = await fetch(url.href);
    const body = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  };
}
