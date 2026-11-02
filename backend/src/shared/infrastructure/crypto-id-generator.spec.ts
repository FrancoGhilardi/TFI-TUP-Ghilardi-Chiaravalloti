import { CryptoIdGenerator } from "./crypto-id-generator.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("CryptoIdGenerator", () => {
  const generator = new CryptoIdGenerator();

  it("generates UUID v4 ids", () => {
    expect(generator.next()).toMatch(UUID_V4);
  });

  it("generates a different id on every call", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generator.next()));

    expect(ids.size).toBe(1000);
  });
});
