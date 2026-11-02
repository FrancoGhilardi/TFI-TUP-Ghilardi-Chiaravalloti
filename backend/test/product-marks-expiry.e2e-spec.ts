import { type INestApplication, Logger } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import type { Pool } from "pg";
import type { App } from "supertest/types.js";
import {
  PRODUCT_MARKS_EXPIRY_JOB,
  ProductMarksExpiryScheduler,
} from "./../src/modules/catalog/presentation/schedulers/product-marks-expiry.scheduler.js";
import { Clock } from "./../src/shared/application/clock.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, insertProductWithDeps, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

// Midnight in Argentina, when the job runs, and the next one.
const FIRST_RUN = new Date("2026-10-28T03:00:00.000Z");
const SECOND_RUN = new Date("2026-10-29T03:00:00.000Z");

/** A clock the test moves forward by hand. */
class SimulatedClock extends Clock {
  current = FIRST_RUN;

  now(): Date {
    return this.current;
  }
}

interface Marks {
  [column: string]: unknown;
  is_on_sale: boolean;
  sale_price: string | null;
  sale_ends_at: Date | null;
  is_new: boolean;
  new_until: Date | null;
}

describe("Clearing ended sales and new marks (e2e)", () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let clock: SimulatedClock;
  let scheduler: ProductMarksExpiryScheduler;
  let logged: string[];

  beforeAll(() => {
    pool = adminPool();
  });

  beforeEach(async () => {
    await truncateAll(pool);
    clock = new SimulatedClock();
    app = await createTestApp({ overrides: [{ provide: Clock, useValue: clock }] });
    scheduler = app.get(ProductMarksExpiryScheduler);
    logged = [];
    vi.spyOn(Logger.prototype, "log").mockImplementation((message: unknown) => {
      logged.push(String(message));
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  /** A product on sale until `saleEndsAt` and marked as new until `newUntil`. */
  async function marked(title: string, saleEndsAt: Date | null, newUntil: Date | null) {
    const { id } = await insertProductWithDeps(pool, { title });
    await pool.query(
      `UPDATE libreria.products
       SET is_on_sale = true, sale_price = '5.00', sale_ends_at = $2, is_new = true, new_until = $3
       WHERE id = $1`,
      [id, saleEndsAt, newUntil],
    );
    return id;
  }

  async function marksOf(id: string): Promise<Marks> {
    const { rows } = await pool.query<Marks>(
      `SELECT is_on_sale, sale_price, sale_ends_at, is_new, new_until
       FROM libreria.products WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  const SALE_CLEARED = { is_on_sale: false, sale_price: null, sale_ends_at: null };
  const NEW_CLEARED = { is_new: false, new_until: null };

  // createTestApp stops the job; it stays registered with its schedule.
  it("registers the job to run at the next midnight in Argentina", () => {
    const job = app.get(SchedulerRegistry).getCronJob(PRODUCT_MARKS_EXPIRY_JOB);
    const next = job.nextDate().toJSDate();

    expect(job.isActive).toBe(false);
    expect(next.getUTCHours()).toBe(3);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });

  it("clears at each run what ended by then, and nothing more when run again", async () => {
    const endedBefore = await marked(
      "Vencido antes",
      new Date("2026-10-27T15:00:00.000Z"),
      new Date("2026-10-28T02:59:59.999Z"),
    );
    const endsDuringTheDay = await marked(
      "Vence en el dia",
      new Date("2026-10-28T18:00:00.000Z"),
      new Date("2026-10-29T03:00:00.000Z"),
    );
    const endsLater = await marked(
      "Vence despues",
      new Date("2026-11-30T03:00:00.000Z"),
      new Date("2026-11-30T03:00:00.000Z"),
    );
    const open = await marked("Sin vencimiento", null, null);

    await scheduler.run();

    await expect(marksOf(endedBefore)).resolves.toMatchObject({ ...SALE_CLEARED, ...NEW_CLEARED });
    await expect(marksOf(endsDuringTheDay)).resolves.toMatchObject({
      is_on_sale: true,
      is_new: true,
    });

    clock.current = SECOND_RUN;
    await scheduler.run();

    await expect(marksOf(endsDuringTheDay)).resolves.toMatchObject({
      ...SALE_CLEARED,
      ...NEW_CLEARED,
    });
    await expect(marksOf(endsLater)).resolves.toMatchObject({ is_on_sale: true, is_new: true });
    await expect(marksOf(open)).resolves.toMatchObject({ is_on_sale: true, is_new: true });

    const settled = await Promise.all([endsLater, open].map(marksOf));
    await scheduler.run();

    await expect(Promise.all([endsLater, open].map(marksOf))).resolves.toEqual(settled);
    expect(logged).toEqual([
      "Cleared 1 ended sales and 1 ended new marks",
      "Cleared 1 ended sales and 1 ended new marks",
      "Cleared 0 ended sales and 0 ended new marks",
    ]);
  });
});
