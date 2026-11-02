import { Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { SkuGenerator } from "../../application/ports/sku-generator.js";
import { Sku } from "../../domain/value-objects/sku.js";

/** The database sequence behind the SKU column default; a rolled back insert leaves a gap. */
@Injectable()
export class DrizzleSkuGenerator extends SkuGenerator {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  async next(): Promise<Sku> {
    const { rows } = await this.executor
      .current()
      .execute<{ sku: string }>(sql`SELECT libreria.next_product_sku() AS sku`);
    return Sku.fromValue(rows[0].sku);
  }
}
