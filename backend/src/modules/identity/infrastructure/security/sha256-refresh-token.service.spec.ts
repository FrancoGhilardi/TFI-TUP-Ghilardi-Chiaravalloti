import { Sha256RefreshTokenService } from "./sha256-refresh-token.service.js";

describe("Sha256RefreshTokenService", () => {
  const service = new Sha256RefreshTokenService();

  describe("generate", () => {
    it("generates 32 random bytes as URL-safe base64, ready for a cookie", () => {
      const token = service.generate();

      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    });

    it("generates a different token every time", () => {
      const tokens = new Set(Array.from({ length: 1000 }, () => service.generate()));

      expect(tokens.size).toBe(1000);
    });
  });

  describe("hash", () => {
    it("hashes with SHA-256, as 64 hex characters", () => {
      expect(service.hash("token")).toBe(
        "3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0",
      );
    });

    it("is deterministic, so a token can be looked up by its hash", () => {
      const token = service.generate();

      expect(service.hash(token)).toBe(service.hash(token));
    });

    it("never returns the token itself and differs between tokens", () => {
      const first = service.generate();
      const second = service.generate();

      expect(service.hash(first)).not.toBe(first);
      expect(service.hash(first)).not.toBe(service.hash(second));
    });
  });
});
