import { createPool, toSslConfig } from "./create-pool.js";

const URL = "postgresql://libreria_app:libreria_app@127.0.0.1:54322/postgres";

describe("toSslConfig", () => {
  it("disables SSL for disable", () => {
    expect(toSslConfig("disable")).toBe(false);
  });

  it("encrypts without verifying the server for require", () => {
    expect(toSslConfig("require")).toEqual({ rejectUnauthorized: false });
  });

  it("verifies the server against the CA for verify-full", () => {
    expect(toSslConfig("verify-full", "CA")).toEqual({ ca: "CA", rejectUnauthorized: true });
  });
});

describe("createPool", () => {
  it("applies the max size and registers an error listener", async () => {
    const pool = createPool({ url: URL, sslMode: "disable", max: 3 });

    expect(pool.options.max).toBe(3);
    expect(pool.listenerCount("error")).toBe(1);
    await pool.end();
  });

  it("forwards idle errors to the given handler", async () => {
    const onIdleError = vi.fn();
    const pool = createPool({ url: URL, sslMode: "disable", onIdleError });
    const error = new Error("connection dropped");

    pool.emit("error", error);

    expect(onIdleError).toHaveBeenCalledWith(error);
    await pool.end();
  });

  it("logs idle errors when no handler is given", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const pool = createPool({ url: URL, sslMode: "disable" });

    pool.emit("error", new Error("connection dropped"));

    expect(log).toHaveBeenCalledWith("Idle database client error: connection dropped");
    log.mockRestore();
    await pool.end();
  });

  it("defaults the max size to 10", async () => {
    const pool = createPool({ url: URL, sslMode: "disable" });

    expect(pool.options.max).toBe(10);
    await pool.end();
  });
});
