import { expect } from "vitest";

/** The access token lives in memory only: nothing the panel does may leave it in the browser. */
export function expectNoStoredSession(): void {
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
  expect(document.cookie).toBe("");
}
