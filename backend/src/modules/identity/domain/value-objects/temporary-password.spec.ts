import { TemporaryPassword } from "./temporary-password.js";

describe("TemporaryPassword", () => {
  const expiresAt = new Date("2026-10-17T12:00:00.000Z");
  const temporary = new TemporaryPassword("hash", expiresAt);

  it("is not expired before its expiry", () => {
    expect(temporary.isExpired(new Date("2026-10-17T11:59:59.999Z"))).toBe(false);
  });

  it("is expired at its expiry", () => {
    expect(temporary.isExpired(expiresAt)).toBe(true);
  });

  it("is expired after its expiry", () => {
    expect(temporary.isExpired(new Date("2026-10-17T12:00:00.001Z"))).toBe(true);
  });
});
