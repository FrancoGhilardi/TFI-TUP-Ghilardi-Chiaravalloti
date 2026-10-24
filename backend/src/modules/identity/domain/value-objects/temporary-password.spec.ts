import { TemporaryPassword } from "./temporary-password.js";

describe("TemporaryPassword", () => {
  const expiresAt = new Date("2026-10-17T12:00:00.000Z");
  const temporary = new TemporaryPassword("hash", expiresAt);

  it("is issued with the expiry of its lifetime, and starts its cooldown then", () => {
    const now = new Date("2026-10-17T11:30:00.000Z");

    const issued = TemporaryPassword.issue("hash", now, 30);

    expect(issued).toEqual(new TemporaryPassword("hash", expiresAt));
    expect(issued.isInCooldown(now, 30, 5)).toBe(true);
    expect(issued.isInCooldown(new Date("2026-10-17T11:35:00.000Z"), 30, 5)).toBe(false);
  });

  it("is not expired before its expiry", () => {
    expect(temporary.isExpired(new Date("2026-10-17T11:59:59.999Z"))).toBe(false);
  });

  it("is expired at its expiry", () => {
    expect(temporary.isExpired(expiresAt)).toBe(true);
  });

  it("is expired after its expiry", () => {
    expect(temporary.isExpired(new Date("2026-10-17T12:00:00.001Z"))).toBe(true);
  });

  describe("cooldown", () => {
    // Issued at 11:30 with a 30 minute lifetime and a 5 minute cooldown.
    const TTL = 30;
    const COOLDOWN = 5;
    const inCooldownAt = (iso: string) => temporary.isInCooldown(new Date(iso), TTL, COOLDOWN);

    it("is in cooldown right after it was issued", () => {
      expect(inCooldownAt("2026-10-17T11:30:00.000Z")).toBe(true);
    });

    it("is in cooldown until just before the cooldown ends", () => {
      expect(inCooldownAt("2026-10-17T11:34:59.999Z")).toBe(true);
    });

    it("is no longer in cooldown when the cooldown ends", () => {
      expect(inCooldownAt("2026-10-17T11:35:00.000Z")).toBe(false);
    });

    it("is no longer in cooldown once it expired", () => {
      expect(inCooldownAt("2026-10-17T12:10:00.000Z")).toBe(false);
    });

    it("stays in cooldown for its whole life when the cooldown is longer than the lifetime", () => {
      expect(temporary.isInCooldown(new Date("2026-10-17T11:59:00.000Z"), TTL, 60)).toBe(true);
    });
  });
});
