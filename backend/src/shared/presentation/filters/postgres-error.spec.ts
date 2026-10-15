import { extractSqlState } from "./postgres-error.js";

function pgError(code: string): Error & { code: string } {
  return Object.assign(new Error("pg error"), { code });
}

function wrapped(cause: unknown): Error {
  return new Error("Failed query", { cause });
}

describe("extractSqlState", () => {
  it.each(["23505", "23503", "23514"])("extracts %s from a direct pg error", (code) => {
    expect(extractSqlState(pgError(code))).toBe(code);
  });

  it.each(["23505", "23503", "23514"])("extracts %s from a wrapped query error", (code) => {
    expect(extractSqlState(wrapped(pgError(code)))).toBe(code);
  });

  it("returns undefined when no error in the chain has a SQLSTATE", () => {
    expect(extractSqlState(new Error("plain"))).toBeUndefined();
    expect(extractSqlState(wrapped(new Error("inner")))).toBeUndefined();
  });

  it("ignores codes that are not 5 characters long", () => {
    expect(extractSqlState(Object.assign(new Error(), { code: "ECONNREFUSED" }))).toBeUndefined();
    expect(extractSqlState({ code: 23505 })).toBeUndefined();
  });

  it("skips system error codes and keeps looking down the chain", () => {
    const system = Object.assign(new Error("denied"), { code: "EPERM", cause: pgError("23505") });

    expect(extractSqlState(system)).toBe("23505");
  });

  it.each([null, undefined, "23505", 42, {}])("returns undefined for %o", (value) => {
    expect(extractSqlState(value)).toBeUndefined();
  });

  it("stops on circular causes", () => {
    const a: { cause?: unknown } = {};
    const b: { cause?: unknown } = { cause: a };
    a.cause = b;
    expect(extractSqlState(a)).toBeUndefined();
  });

  it("gives up on chains deeper than the limit", () => {
    let error: unknown = pgError("23505");
    for (let i = 0; i < 10; i++) error = wrapped(error);
    expect(extractSqlState(error)).toBeUndefined();
  });
});
