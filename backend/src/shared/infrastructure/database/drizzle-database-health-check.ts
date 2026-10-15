import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DatabaseHealthCheck } from "../../application/database-health-check.js";
import { DrizzleClient } from "./drizzle.client.js";

/** Checks reachability with a trivial query. */
@Injectable()
export class DrizzleDatabaseHealthCheck extends DatabaseHealthCheck {
  constructor(private readonly client: DrizzleClient) {
    super();
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.client.db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  }
}
