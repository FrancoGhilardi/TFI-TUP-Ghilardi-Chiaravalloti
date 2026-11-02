import { inspect } from "node:util";
import { InvalidPasswordError } from "../errors/invalid-password-error.js";
import { Password } from "./password.js";

const EMOJI = "🔒"; // Two UTF-16 code units, one code point.

describe("Password", () => {
  describe("length", () => {
    it.each([
      ["the minimum", "a".repeat(8)],
      ["the maximum", "a".repeat(128)],
    ])("accepts %s length", (_label, plain) => {
      expect(Password.create(plain).reveal()).toBe(plain);
    });

    it.each([
      ["an empty password", ""],
      ["one character below the minimum", "a".repeat(7)],
      ["one character above the maximum", "a".repeat(129)],
    ])("rejects %s", (_label, plain) => {
      expect(() => Password.create(plain)).toThrow(InvalidPasswordError);
    });

    it("exposes the limits of the policy", () => {
      expect(Password.MIN_LENGTH).toBe(8);
      expect(Password.MAX_LENGTH).toBe(128);
    });
  });

  describe("character counting", () => {
    it("counts each emoji as one character", () => {
      expect(EMOJI.repeat(8)).toHaveLength(16);

      expect(Password.create(EMOJI.repeat(8)).reveal()).toBe(EMOJI.repeat(8));
      expect(Password.create(EMOJI.repeat(128)).reveal()).toBe(EMOJI.repeat(128));
      expect(() => Password.create(EMOJI.repeat(129))).toThrow(InvalidPasswordError);
    });

    it("does not let four emojis pass as eight characters", () => {
      expect(() => Password.create(EMOJI.repeat(4))).toThrow(InvalidPasswordError);
    });

    it("keeps leading and trailing spaces", () => {
      expect(Password.create("  secret  ").reveal()).toBe("  secret  ");
    });

    it("counts spaces as characters", () => {
      expect(() => Password.create("   abc  ")).not.toThrow();
      expect(() => Password.create(" ".repeat(7))).toThrow(InvalidPasswordError);
    });

    it("does not normalize the text", () => {
      const composed = "café-secret";
      const decomposed = "café-secret";

      expect(Password.create(composed).reveal()).toBe(composed);
      expect(Password.create(decomposed).reveal()).toBe(decomposed);
      expect(Password.create(composed).reveal()).not.toBe(Password.create(decomposed).reveal());
    });

    it("counts code points, not what the user sees", () => {
      // A decomposed "é" is two code points; a joined family emoji is five.
      expect(() => Password.create("caféabc")).not.toThrow();
      expect(() => Password.create("👨‍👩‍👧-xy")).not.toThrow();
      expect(() => Password.create("👨‍👩‍👧-x")).toThrow(InvalidPasswordError);
      expect([..."👨‍👩‍👧"]).toHaveLength(5);
    });
  });

  describe("malformed text", () => {
    it.each([
      ["a lone high surrogate", "aaaaaaa\ud800"],
      ["a lone low surrogate", "aaaaaaa\udfff"],
      ["a lone surrogate in the middle", "aaaa\ud800aaaa"],
      ["surrogates in the wrong order", "aaaaaaa\udfff\ud800"],
    ])("rejects text with %s", (_label, plain) => {
      expect(() => Password.create(plain)).toThrow(
        expect.objectContaining({
          code: "INVALID_PASSWORD",
          reason: "characters",
          message: "La contraseña tiene caracteres no válidos.",
        }),
      );
    });

    it("accepts a well formed surrogate pair", () => {
      expect(Password.create("aaaaaaa🔒").reveal()).toBe("aaaaaaa🔒");
    });

    it("reports malformed text even when the length is also wrong", () => {
      expect(() => Password.create("\ud800")).toThrow(
        expect.objectContaining({ reason: "characters" }),
      );
    });
  });

  describe("leaks", () => {
    const password = Password.create("super-secret-value");

    it.each([
      ["String()", () => String(password)],
      ["JSON.stringify", () => JSON.stringify({ password })],
      ["util.inspect", () => inspect(password, { showHidden: true, depth: null })],
      ["util.inspect inside an object", () => inspect({ user: { password } }, { depth: null })],
    ])("does not expose the text through %s", (_label, render) => {
      expect(render()).not.toContain("super-secret-value");
    });

    it("renders as a fixed placeholder", () => {
      expect(String(password)).toBe("[REDACTED]");
      expect(JSON.stringify({ password })).toBe('{"password":"[REDACTED]"}');
    });

    it("only gives the text back through reveal", () => {
      expect(password.reveal()).toBe("super-secret-value");
    });
  });

  it("rejects a wrong length with a stable code and a user-facing message", () => {
    expect(() => Password.create("short")).toThrow(
      expect.objectContaining({
        code: "INVALID_PASSWORD",
        reason: "length",
        message: "La contraseña debe tener entre 8 y 128 caracteres.",
      }),
    );
  });
});
