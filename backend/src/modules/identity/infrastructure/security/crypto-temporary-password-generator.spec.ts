import { Password } from "../../domain/value-objects/password.js";
import { CryptoTemporaryPasswordGenerator } from "./crypto-temporary-password-generator.js";

describe("CryptoTemporaryPasswordGenerator", () => {
  const generator = new CryptoTemporaryPasswordGenerator();
  const samples = Array.from({ length: 200 }, () => generator.generate());

  it("generates 12 letters and digits, without the ones easy to mix up", () => {
    for (const sample of samples) {
      expect(sample).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
    }
  });

  it("meets the password policy, so it can be hashed", () => {
    expect(() => Password.create(generator.generate())).not.toThrow();
  });

  it("does not repeat itself", () => {
    expect(new Set(samples).size).toBe(samples.length);
  });

  it("uses the whole alphabet", () => {
    expect(new Set(samples.join("")).size).toBe(57);
  });
});
