import { ApiError } from "./api-error";

/** How long a page waits for data it can do without, so a slow API does not hold it. */
export const OPTIONAL_READ_TIMEOUT_MS = 3000;

/**
 * Reads data a page can render without: an API failure (including a timeout) gives `fallback`.
 * Any other error is a bug and is rethrown.
 */
export async function recoverFromApiError<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ApiError) {
      return fallback;
    }
    throw error;
  }
}
