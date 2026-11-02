import { Session, type SessionProps } from "./session.js";

const NOW = new Date("2026-10-20T12:00:00.000Z");
const EXPIRES_AT = new Date("2026-10-27T12:00:00.000Z");

const started = (overrides: Partial<{ expiresAt: Date; userAgent: string }> = {}) =>
  Session.start({
    id: "session-1",
    userId: "user-1",
    refreshTokenHash: "token-hash",
    expiresAt: EXPIRES_AT,
    userAgent: "Mozilla/5.0",
    now: NOW,
    ...overrides,
  });

describe("Session", () => {
  describe("start", () => {
    it("starts active, unrevoked and dated now", () => {
      const session = started();

      expect(session.getId()).toBe("session-1");
      expect(session).toMatchObject({
        userId: "user-1",
        refreshTokenHash: "token-hash",
        expiresAt: EXPIRES_AT,
        userAgent: "Mozilla/5.0",
        createdAt: NOW,
        revokedAt: undefined,
      });
      expect(session.isActive(NOW)).toBe(true);
    });

    it("does not require a user agent", () => {
      const session = Session.start({
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "token-hash",
        expiresAt: EXPIRES_AT,
        now: NOW,
      });

      expect(session.userAgent).toBeUndefined();
    });

    it.each([
      ["at the moment it starts", NOW],
      ["before it starts", new Date("2026-10-20T11:59:59.999Z")],
    ])("rejects a session that would expire %s", (_label, expiresAt) => {
      expect(() => started({ expiresAt })).toThrow("A session must expire after it starts");
    });
  });

  describe("isActive", () => {
    it("is active until just before it expires", () => {
      expect(started().isActive(new Date(EXPIRES_AT.getTime() - 1))).toBe(true);
    });

    it("is no longer active when it expires", () => {
      expect(started().isActive(EXPIRES_AT)).toBe(false);
    });

    it("is no longer active once revoked, even before it expires", () => {
      const session = started();

      session.revoke(NOW);

      expect(session.isActive(NOW)).toBe(false);
      expect(session.isRevoked()).toBe(true);
    });
  });

  describe("isExpired", () => {
    it("is not expired until just before its expiry", () => {
      expect(started().isExpired(new Date(EXPIRES_AT.getTime() - 1))).toBe(false);
    });

    it.each([
      ["when it expires", EXPIRES_AT],
      ["after it expires", new Date(EXPIRES_AT.getTime() + 1)],
    ])("is expired %s", (_label, now) => {
      expect(started().isExpired(now)).toBe(true);
    });

    it("does not depend on the revocation", () => {
      const session = started();

      session.revoke(NOW);

      expect(session.isExpired(NOW)).toBe(false);
    });
  });

  describe("revoke", () => {
    it("records when it was revoked", () => {
      const session = started();

      session.revoke(NOW);

      expect(session.revokedAt).toBe(NOW);
    });

    it("keeps the first revocation time when revoked again", () => {
      const session = started();
      const later = new Date("2026-10-21T00:00:00.000Z");

      session.revoke(NOW);
      session.revoke(later);

      expect(session.revokedAt).toBe(NOW);
    });
  });

  describe("rotate", () => {
    it("revokes the session and marks it as replaced by a refresh", () => {
      const session = started();

      session.rotate(NOW);

      expect(session.revokedAt).toBe(NOW);
      expect(session.rotatedAt).toBe(NOW);
      expect(session.isRotated()).toBe(true);
      expect(session.isActive(NOW)).toBe(false);
    });

    it("refuses a session that is already revoked", () => {
      const session = started();
      session.revoke(NOW);

      expect(() => session.rotate(NOW)).toThrow("Only an unrevoked session can be rotated");
      expect(session.isRotated()).toBe(false);
    });

    it("is not rotated when it is only revoked", () => {
      const session = started();

      session.revoke(NOW);

      expect(session.isRotated()).toBe(false);
      expect(session.rotatedAt).toBeUndefined();
    });
  });

  describe("reconstitute", () => {
    it("rebuilds a stored session, revoked or not", () => {
      const props: SessionProps = {
        id: "session-2",
        userId: "user-1",
        refreshTokenHash: "token-hash",
        expiresAt: EXPIRES_AT,
        revokedAt: NOW,
        createdAt: new Date("2026-10-19T12:00:00.000Z"),
      };
      const session = Session.reconstitute(props);

      props.revokedAt = undefined;

      expect(session.isRevoked()).toBe(true);
      expect(session.getId()).toBe("session-2");
    });

    it("rebuilds an expired session without rejecting it", () => {
      const session = Session.reconstitute({
        id: "session-3",
        userId: "user-1",
        refreshTokenHash: "token-hash",
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
        createdAt: new Date("2025-12-25T00:00:00.000Z"),
      });

      expect(session.isActive(NOW)).toBe(false);
    });
  });
});
