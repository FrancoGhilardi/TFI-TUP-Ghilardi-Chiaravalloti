export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Plain objects and arrays are sent as JSON; anything `fetch` accepts is sent as is. */
export type RequestBody = BodyInit | object;

const JSON_CONTENT_TYPE = "application/json";

export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  if (!path.startsWith("/")) {
    throw new TypeError(`API paths must start with "/", got "${path}"`);
  }
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Instance headers first, then the request's own, which win on conflict. */
export function mergeHeaders(...sources: (HeadersInit | undefined)[]): Headers {
  const headers = new Headers();
  for (const source of sources) {
    new Headers(source).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

function isJsonBody(body: RequestBody): boolean {
  if (Array.isArray(body)) {
    return true;
  }
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(body);
  return prototype === Object.prototype || prototype === null;
}

/** Serializes the body and adjusts `headers` to match it. */
export function buildBody(body: RequestBody | undefined, headers: Headers): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }
  // The runtime writes the multipart boundary into the Content-Type; a given one would lack it.
  if (body instanceof FormData) {
    headers.delete("Content-Type");
    return body;
  }
  if (isJsonBody(body)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", JSON_CONTENT_TYPE);
    }
    return JSON.stringify(body);
  }
  return body as BodyInit;
}
