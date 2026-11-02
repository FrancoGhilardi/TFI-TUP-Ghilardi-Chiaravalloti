import type { Password } from "../../domain/value-objects/password.js";
import { PasswordHasher } from "../ports/password-hasher.js";
import { TemporaryPasswordGenerator } from "../ports/temporary-password-generator.js";
import { TemporaryPasswordFactory } from "./temporary-password-factory.js";

class FixedGenerator extends TemporaryPasswordGenerator {
  constructor(private readonly value: string) {
    super();
  }

  generate(): string {
    return this.value;
  }
}

class FakeHasher extends PasswordHasher {
  hash(password: Password): Promise<string> {
    return Promise.resolve(`hashed:${password.reveal()}`);
  }

  verify(): Promise<boolean> {
    return Promise.reject(new Error("Not used"));
  }

  verifyAgainstNothing(): Promise<false> {
    return Promise.reject(new Error("Not used"));
  }
}

describe("TemporaryPasswordFactory", () => {
  it("gives the generated password and its hash", async () => {
    const factory = new TemporaryPasswordFactory(
      new FixedGenerator("Tmp2Pass3Key"),
      new FakeHasher(),
    );

    await expect(factory.create()).resolves.toEqual({
      plain: "Tmp2Pass3Key",
      hash: "hashed:Tmp2Pass3Key",
    });
  });

  it("refuses a generated password that breaks the policy", async () => {
    const factory = new TemporaryPasswordFactory(new FixedGenerator("short"), new FakeHasher());

    await expect(factory.create()).rejects.toThrow("La contraseña debe tener entre 8 y 128");
  });
});
