import { randomInt } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { TemporaryPasswordGenerator } from "../../application/ports/temporary-password-generator.js";

const LENGTH = 12;
// Letters and digits without the ones easy to mix up when copied from a mail: 0 and O, 1, l and I.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 12 characters drawn with a cryptographically secure generator, about 70 bits. */
@Injectable()
export class CryptoTemporaryPasswordGenerator extends TemporaryPasswordGenerator {
  generate(): string {
    return Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  }
}
