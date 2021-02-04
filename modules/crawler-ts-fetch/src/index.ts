import fetch, { Response } from 'node-fetch';
export { Response } from 'node-fetch';

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createRequester(delayMilliseconds: number = 50) {
  return async (href: string): Promise<Response> => {
    await delay(delayMilliseconds);
    return fetch(href);
  };
}
