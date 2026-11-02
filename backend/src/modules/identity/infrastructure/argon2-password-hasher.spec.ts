import { Logger } from "@nestjs/common";
import argon2 from "argon2";
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

  it.each(["hash", "", "$argon2id$broken"])(
    "rejects the password instead of failing when the stored hash cannot be read (%o)",
    async (stored) => {
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

      await expect(hasher.verify(stored, "secret-password")).resolves.toBe(false);
      expect(warn).toHaveBeenCalledWith("Stored password hash could not be verified");
      warn.mockRestore();
    },
  );

  it("reports a decoy that could not be built when it is used, not before", async () => {
    const hashSpy = vi.spyOn(argon2, "hash").mockRejectedValueOnce(new Error("out of memory"));

    const broken = new Argon2PasswordHasher();

    await expect(broken.verifyAgainstNothing("typed")).rejects.toThrow("out of memory");
    hashSpy.mockRestore();
  });

  describe("verifyAgainstNothing", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it.each(["secret-password", "", "[REDACTED]", "a".repeat(1024)])(
      "never succeeds, whatever is typed (%#)",
      async (plain) => {
        await expect(hasher.verifyAgainstNothing(plain)).resolves.toBe(false);
      },
    );

    it("runs a real Argon2 check against a hash built with the same parameters", async () => {
      const verify = vi.spyOn(argon2, "verify");
      const real = await hasher.hash(password);

      await hasher.verifyAgainstNothing("typed-password");

      const [decoy, plain] = verify.mock.calls[0] ?? [];
      // $argon2id$v=19$m=…,t=…,p=… : algorithm, version and cost must match a real hash.
      const parameters = (hash: string) => hash.split("$").slice(1, 4).join("$");
      expect(plain).toBe("typed-password");
      expect(parameters(String(decoy))).toBe(parameters(real));
    });

    it("reuses the same decoy instead of hashing on every call", async () => {
      const hashSpy = vi.spyOn(argon2, "hash");
      const verify = vi.spyOn(argon2, "verify");

      await hasher.verifyAgainstNothing("first");
      await hasher.verifyAgainstNothing("second");

      expect(hashSpy).not.toHaveBeenCalled();
      expect(verify.mock.calls[0]?.[0]).toBe(verify.mock.calls[1]?.[0]);
    });
  });

  it("only hashes passwords that went through the policy", () => {
    type HashInput = Parameters<Argon2PasswordHasher["hash"]>[0];

    expectTypeOf<HashInput>().toEqualTypeOf<Password>();
    expectTypeOf<HashInput>().not.toEqualTypeOf<string>();
  });
});
