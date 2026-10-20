import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { IdGenerator } from "../application/id-generator.js";

/** Random UUID v4 ids, the same kind the database generates for `uuid` primary keys. */
@Injectable()
export class CryptoIdGenerator extends IdGenerator {
  next(): string {
    return randomUUID();
  }
}
