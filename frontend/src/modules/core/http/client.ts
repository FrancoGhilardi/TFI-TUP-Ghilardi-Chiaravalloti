import { publicConfig } from "../config/env";
import { abortable } from "./abortable";
import {
  buildBody,
  buildUrl,
  mergeHeaders,
  type QueryParams,
  type RequestBody,
} from "./build-request";
import type { ErrorMessageOverrides } from "./error-messages";
import { fromRequestFailure, fromResponse, unexpectedResponse } from "./to-api-error";

const DEFAULT_TIMEOUT_MS = 30_000;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  /** Appended as a query string; `undefined` values are left out. */
  query?: QueryParams;
  body?: RequestBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Covers the whole call: token, session renewal and retry included. */
  timeoutMs?: number;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  next?: RequestInit["next"];
  /** User-facing messages per error code, replacing the default ones. */
  errorMessages?: ErrorMessageOverrides;
}

export interface ApiClientOptions {
  baseUrl?: string;
  /** Sent with every request; a request's own headers win on conflict. */
  headers?: HeadersInit;
  /** Default for every request, such as `include` to send the API's cookies. */
  credentials?: RequestCredentials;
  /** Token sent as `Authorization: Bearer`; none means an anonymous request. */
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  /**
   * Called when an authenticated request gets a 401. Resolving `true` means the session was
   * renewed and the request is sent once more; `false` or a rejection lets the 401 reach the
   * caller. Concurrent 401s share a single call.
   */
  onUnauthorized?: () => Promise<boolean>;
  fetch?: typeof fetch;
}

type Request = <T>(path: string, options?: RequestOptions) => Promise<T>;

export interface ApiClient {
  get: Request;
  post: Request;
  put: Request;
  patch: Request;
  delete: Request;
}

async function discard(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

/** Creates a client for the API; the shop uses `apiClient`, the admin panel its own instance. */
export function createApiClient({
  baseUrl = publicConfig.apiBaseUrl,
  headers: defaultHeaders,
  credentials: defaultCredentials,
  getAccessToken,
  onUnauthorized,
  // Resolved on each call: on the server Next replaces the global fetch to add its caching.
  fetch: fetchImpl = (input, init) => fetch(input, init),
}: ApiClientOptions = {}): ApiClient {
  // The API rotates refresh tokens and revokes every session when one is reused, so parallel
  // 401s must never trigger parallel renewals.
  let pendingRenewal: Promise<boolean> | undefined;
  const renewSession = (): Promise<boolean> => {
    if (!onUnauthorized) {
      return Promise.resolve(false);
    }
    pendingRenewal ??= Promise.resolve()
      .then(onUnauthorized)
      .finally(() => {
        pendingRenewal = undefined;
      });
    return pendingRenewal;
  };

  async function request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = buildUrl(baseUrl, path, options.query);
    const { signal: callerSignal, timeoutMs = DEFAULT_TIMEOUT_MS, errorMessages } = options;
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;

    /** Bounds `operation` by the signal and turns its failures into an `ApiError`. */
    const run = async <R>(operation: () => R | Promise<R>): Promise<R> => {
      try {
        return await abortable(operation, signal);
      } catch (error) {
        // A cancellation asked for by the caller is not a failure to report.
        if (callerSignal?.aborted) {
          throw error;
        }
        throw fromRequestFailure(error, { timedOut: timeout.aborted }, errorMessages);
      }
    };

    const readToken = () => run(() => getAccessToken?.());

    const send = (token: string | undefined): Promise<Response> => {
      const headers = mergeHeaders(defaultHeaders, options.headers);
      headers.set("Accept", "application/json");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return run(() =>
        fetchImpl(url, {
          method,
          headers,
          body: buildBody(options.body, headers),
          signal,
          credentials: options.credentials ?? defaultCredentials,
          cache: options.cache,
          next: options.next,
        }),
      );
    };

    const canRetry = async (rejectedToken: string): Promise<boolean> => {
      const current = await readToken();
      // Another request already renewed the session while this one was in flight.
      if (current && current !== rejectedToken) {
        return true;
      }
      try {
        return await run(renewSession);
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        return false;
      }
    };

    let token = await readToken();
    let response = await send(token);
    if (response.status === 401 && token && (await canRetry(token))) {
      await discard(response);
      token = await readToken();
      response = await send(token);
    }

    if (!response.ok) {
      const failed = response;
      throw await run(() => fromResponse(failed, errorMessages));
    }
    const ok = response;
    const text = await run(() => ok.text());
    if (text === "") {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw unexpectedResponse(response.status, errorMessages);
    }
  }

  return {
    get: (path, options) => request("GET", path, options),
    post: (path, options) => request("POST", path, options),
    put: (path, options) => request("PUT", path, options),
    patch: (path, options) => request("PATCH", path, options),
    delete: (path, options) => request("DELETE", path, options),
  };
}

/** Anonymous client for the public endpoints. */
export const apiClient = createApiClient();
