import { Password } from "../domain/value-objects/password.js";
import { Argon2PasswordHasher } from "./argon2-password-hasher.js";

describe("Argon2PasswordHasher", () => {
  const hasher = new Argon2PasswordHasher();
  const password = Password.create("secret-password");

  it("produces an argon2id hash different from the plain password", async () => {
    const hash = await hasher.hash(password);

    expect(hash).not.toBe("secret-password");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies the right password and rejects another one", async () => {
    const hash = await hasher.hash(password);

    await expect(hasher.verify(hash, "secret-password")).resolves.toBe(true);
    await expect(hasher.verify(hash, "other-password")).resolves.toBe(false);
  });

  it("hashes the text as typed, without the placeholder used when printing it", async () => {
    const hash = await hasher.hash(password);

    await expect(hasher.verify(hash, "[REDACTED]")).resolves.toBe(false);
  });

  it("handles the longest password the policy allows, counted in code points", async () => {
    const longest = "🔒".repeat(Password.MAX_LENGTH);
    const hash = await hasher.hash(Password.create(longest));

    await expect(hasher.verify(hash, longest)).resolves.toBe(true);
    await expect(hasher.verify(hash, longest.slice(0, -2))).resolves.toBe(false);
  });

  it("salts every hash", async () => {
    const [first, second] = await Promise.all([hasher.hash(password), hasher.hash(password)]);

    expect(first).not.toBe(second);
  });

  it("only hashes passwords that went through the policy", () => {
    type HashInput = Parameters<Argon2PasswordHasher["hash"]>[0];

    expectTypeOf<HashInput>().toEqualTypeOf<Password>();
    expectTypeOf<HashInput>().not.toEqualTypeOf<string>();
  });
});
