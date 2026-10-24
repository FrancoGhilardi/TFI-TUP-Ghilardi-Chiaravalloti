import { stackWithCauses } from "./error-stack.js";

describe("stackWithCauses", () => {
  it("is the stack alone when nothing caused the error", () => {
    const error = new Error("boom");

    expect(stackWithCauses(error)).toBe(error.stack);
  });

  it("appends the stack of every cause, in order", () => {
    const root = new Error("ECONNRESET");
    const middle = new Error("socket hang up", { cause: root });
    const error = new Error("mail failed", { cause: middle });

    expect(stackWithCauses(error)).toBe(
      `${error.stack}\nCaused by: ${middle.stack}\nCaused by: ${root.stack}`,
    );
  });

  it("writes a cause that is not an error as text", () => {
    expect(stackWithCauses(new Error("a", { cause: "timeout" }))).toContain("Caused by: timeout");
    expect(stackWithCauses(new Error("b", { cause: { name: "quota", code: 429 } }))).toContain(
      'Caused by: {"name":"quota","code":429}',
    );
  });

  it("lists every error grouped in an AggregateError, with their own causes", () => {
    const quota = new Error("daily_quota_exceeded");
    const mail = new Error("mail failed", { cause: quota });
    const database = new Error("pool exhausted");
    const error = new AggregateError([mail, database], "both failed", { cause: database });

    const stack = stackWithCauses(error);

    expect(stack).toContain(`Including: ${mail.stack}\nCaused by: ${quota.stack}`);
    expect(stack).toContain(`Including: ${database.stack}`);
  });

  it("stops at a cause it already wrote, so a cycle cannot loop forever", () => {
    const first = new Error("first");
    const second = new Error("second", { cause: first });
    first.cause = second;

    expect(stackWithCauses(first)).toBe(
      `${first.stack}\nCaused by: ${second.stack}\nCaused by: [the same error again]`,
    );
  });

  it("leaves out causes past a depth no real chain reaches", () => {
    let error = new Error("root");
    for (let i = 0; i < 20; i++) {
      error = new Error(`level ${i}`, { cause: error });
    }

    const stack = stackWithCauses(error);

    expect(stack).toContain("[more causes left out]");
    expect(stack).not.toContain("Error: root");
  });
});
