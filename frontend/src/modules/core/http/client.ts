import axios, { type AxiosError, type InternalAxiosRequestConfig, isAxiosError } from "axios";

import { publicConfig } from "../config/env";
import { abortable } from "./abortable";
import type { ErrorMessageOverrides } from "./error-messages";
import { toApiError, unexpectedResponse } from "./to-api-error";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    /** Token the request went out with, to tell a renewed session apart from a stale token. */
    sentToken?: string;
    /** Set once a 401 has been retried, so a request is never retried twice. */
    retried?: boolean;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Plain objects and arrays are sent as JSON; `FormData`, `Blob` and other bodies as they are. */
export type RequestBody = BodyInit | object;

export type RequestHeaders = Record<string, string>;

export interface RequestOptions {
  /** Appended as a query string; `undefined` values are left out. */
  query?: QueryParams;
  body?: RequestBody;
  headers?: RequestHeaders;
  signal?: AbortSignal;
  /** Covers the whole call: token, session renewal and retry included. */
  timeoutMs?: number;
  credentials?: RequestCredentials;
  /** Next.js caching of the request on the server (`fetch` options). */
  cache?: RequestCache;
  next?: RequestInit["next"];
  /** User-facing messages per error code, replacing the default ones. */
  errorMessages?: ErrorMessageOverrides;
}

export interface ApiClientOptions {
  baseUrl?: string;
  /** Sent with every request; a request's own headers win on conflict. */
  headers?: RequestHeaders;
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
  /** Replaces the global `fetch`, for tests. */
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

function toWithCredentials(credentials: RequestCredentials | undefined): boolean | undefined {
  if (credentials === undefined || credentials === "same-origin") {
    return undefined;
  }
  return credentials === "include";
}

/**
 * axios labels any POST, PUT or PATCH body without its own type as a form, which would hide a
 * Blob's real type (`fetch` alone would use it), so the Blob's type is sent explicitly. A
 * `FormData` gets no type at all (`false` keeps axios from setting one): `fetch` then writes the
 * `multipart/form-data` one with the boundary that separates its parts.
 */
function bodyHeaders(body: RequestBody | undefined): Record<string, string | false> | undefined {
  if (body instanceof FormData) {
    return { "Content-Type": false };
  }
  return body instanceof Blob && body.type ? { "Content-Type": body.type } : undefined;
}

function assertApiPath(path: string): void {
  if (!path.startsWith("/")) {
    throw new TypeError(`API paths must start with "/", got "${path}"`);
  }
}

/** Creates a client for the API; the shop uses `apiClient`, the admin panel its own instance. */
export function createApiClient({
  baseUrl = publicConfig.apiBaseUrl,
  headers,
  credentials,
  getAccessToken,
  onUnauthorized,
  fetch: fetchImpl,
}: ApiClientOptions = {}): ApiClient {
  const http = axios.create({
    baseURL: baseUrl,
    // The fetch adapter calls the global fetch on each request, which Next extends on the server
    // with its data cache: `next` and `cache` travel in `fetchOptions`.
    adapter: "fetch",
    headers: { Accept: "application/json", ...headers },
    withCredentials: toWithCredentials(credentials),
    ...(fetchImpl && { env: { fetch: fetchImpl } }),
  });

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

  const signalOf = (config: InternalAxiosRequestConfig) => config.signal as AbortSignal;

  if (getAccessToken) {
    http.interceptors.request.use(async (config) => {
      const token = await abortable(getAccessToken, signalOf(config));
      config.sentToken = token;
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
      return config;
    });

    const canRetry = async (config: InternalAxiosRequestConfig): Promise<boolean> => {
      const signal = signalOf(config);
      const current = await abortable(getAccessToken, signal);
      // Another request already renewed the session while this one was in flight.
      if (current && current !== config.sentToken) {
        return true;
      }
      try {
        return await abortable(renewSession, signal);
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        return false;
      }
    };

    http.interceptors.response.use(undefined, async (error: AxiosError) => {
      const config = error.config;
      const isFirstRejectedSession =
        isAxiosError(error) &&
        error.response?.status === 401 &&
        config?.sentToken !== undefined &&
        !config.retried;
      if (!isFirstRejectedSession || !(await canRetry(config))) {
        throw error;
      }
      config.retried = true;
      return http.request(config);
    });
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    assertApiPath(path);
    const { signal: callerSignal, timeoutMs = DEFAULT_TIMEOUT_MS, errorMessages } = options;
    // One deadline for the whole call, retry included, instead of axios's per-attempt timeout.
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;

    try {
      const response = await http.request<unknown>({
        method,
        url: path,
        params: options.query,
        data: options.body,
        headers: { ...bodyHeaders(options.body), ...options.headers },
        signal,
        withCredentials: toWithCredentials(options.credentials),
        fetchOptions: { cache: options.cache, next: options.next },
      });
      if (response.data === "") {
        return undefined as T;
      }
      // The API only answers JSON objects or arrays: text here is a body axios could not parse.
      if (typeof response.data === "string") {
        throw unexpectedResponse(response, errorMessages);
      }
      return response.data as T;
    } catch (error) {
      // A cancellation asked for by the caller is not a failure to report.
      if (callerSignal?.aborted) {
        throw callerSignal.reason;
      }
      throw toApiError(error, { timedOut: timeout.aborted }, errorMessages);
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
