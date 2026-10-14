import { Argon2PasswordHasher } from "./argon2-password-hasher.js";

describe("Argon2PasswordHasher", () => {
  const hasher = new Argon2PasswordHasher();

  it("produces an argon2id hash different from the plain password", async () => {
    const hash = await hasher.hash("secret-password");

    expect(hash).not.toBe("secret-password");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies the right password and rejects another one", async () => {
    const hash = await hasher.hash("secret-password");

    await expect(hasher.verify(hash, "secret-password")).resolves.toBe(true);
    await expect(hasher.verify(hash, "other-password")).resolves.toBe(false);
  });

  it("salts every hash", async () => {
    const [first, second] = await Promise.all([
      hasher.hash("secret-password"),
      hasher.hash("secret-password"),
    ]);

    expect(first).not.toBe(second);
  });
});
