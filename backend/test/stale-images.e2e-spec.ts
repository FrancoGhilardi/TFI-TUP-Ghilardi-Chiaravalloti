import type { INestApplication } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import type { Pool } from "pg";
import sharp from "sharp";
import type { App } from "supertest/types.js";
import {
  STALE_IMAGES_JOB,
  StaleImagesScheduler,
} from "./../src/modules/catalog/presentation/schedulers/stale-images.scheduler.js";
import { BackgroundTasks } from "./../src/shared/application/background-tasks.js";
import { Clock } from "./../src/shared/application/clock.js";
import { StorageBucket } from "./../src/shared/application/file-storage.js";
import type { LoggingBackgroundTasks } from "./../src/shared/infrastructure/logging-background-tasks.js";
import {
  createStorageClient,
  SupabaseFileStorage,
} from "./../src/shared/infrastructure/storage/supabase-file-storage.js";
import { createTestApp } from "./create-test-app.js";
import {
  adminPool,
  insertImage,
  insertProductWithDeps,
  truncateAll,
} from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

// When the stalled image started to wait; the job takes it 10 minutes later.
const STALLED_AT = new Date("2026-10-29T12:00:00.000Z");
const minutesAfter = (minutes: number) => new Date(STALLED_AT.getTime() + minutes * 60_000);

/** A clock the test moves forward by hand. */
class SimulatedClock extends Clock {
  current = minutesAfter(0);

  now(): Date {
    return this.current;
  }
}

interface ImageRow {
  [column: string]: unknown;
  id: string;
  status: string;
  original_key: string;
  public_key: string | null;
  pending_since: Date | null;
}

describe("Reprocessing of stalled images (e2e)", () => {
  const storage = new SupabaseFileStorage(
    createStorageClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    ),
  );
  const apps: INestApplication<App>[] = [];
  let pool: Pool;
  let clock: SimulatedClock;
  let photo: Buffer;

  beforeAll(async () => {
    pool = adminPool();
    photo = await sharp({
      create: { width: 1000, height: 1000, channels: 3, background: { r: 10, g: 10, b: 200 } },
    })
      .jpeg()
      .toBuffer();
  });

  beforeEach(async () => {
    await truncateAll(pool);
    clock = new SimulatedClock();
  });

  afterEach(async () => {
    for (const app of apps.splice(0)) {
      await idle(app);
      await app.close();
    }
    const rows = await allImages();
    await storage.remove(
      StorageBucket.PRIVATE,
      rows.map((row) => row.original_key),
    );
    await storage.remove(
      StorageBucket.PUBLIC,
      rows.flatMap((row) => (row.public_key ? [row.public_key] : [])),
    );
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function start(): Promise<INestApplication<App>> {
    const app = await createTestApp({ overrides: [{ provide: Clock, useValue: clock }] });
    apps.push(app);
    // The run at startup is over before the test runs its own: they never overlap.
    await idle(app);
    return app;
  }

  const idle = (app: INestApplication<App>) =>
    app.get<BackgroundTasks, LoggingBackgroundTasks>(BackgroundTasks).idle();

  const allImages = async () =>
    (
      await pool.query<ImageRow>(
        `SELECT id, status, original_key, public_key, pending_since
         FROM libreria.product_images ORDER BY created_at, position`,
      )
    ).rows;

  /** An image left pending since `STALLED_AT`, with its original really stored. */
  async function stalledImage(): Promise<string> {
    await insertProductWithDeps(pool);
    const [row] = (await allImages()).filter((image) => image.status === "PENDING").slice(-1);
    await storage.upload(StorageBucket.PRIVATE, row.original_key, photo, "image/jpeg");
    await pool.query("UPDATE libreria.product_images SET pending_since = $2 WHERE id = $1", [
      row.id,
      STALLED_AT,
    ]);
    return row.id;
  }

  const statusOf = async (id: string) =>
    (await allImages()).find((image) => image.id === id)?.status;

  it("leaves a recent one alone and processes it once it has waited 10 minutes", async () => {
    const id = await stalledImage();
    const app = await start();
    const scheduler = app.get(StaleImagesScheduler);

    clock.current = minutesAfter(9);
    await scheduler.run();
    await expect(statusOf(id)).resolves.toBe("PENDING");

    clock.current = minutesAfter(10);
    await scheduler.run();
    const [image] = await allImages();
    expect(image).toMatchObject({ id, status: "PROCESSED", pending_since: null });
    expect(image.public_key).toMatch(/\.webp$/);
  });

  it("changes nothing when run again, nor touches images processed or failed", async () => {
    const id = await stalledImage();
    const { id: productId } = await insertProductWithDeps(pool);
    await insertImage(pool, productId, 2);
    await pool.query(
      `UPDATE libreria.product_images SET status = 'FAILED' WHERE product_id = $1 AND position = 2`,
      [productId],
    );
    await pool.query(
      `UPDATE libreria.product_images SET pending_since = $2 WHERE product_id = $1 AND position = 1`,
      [productId, minutesAfter(30)],
    );
    const app = await start();
    const scheduler = app.get(StaleImagesScheduler);
    clock.current = minutesAfter(15);

    await scheduler.run();
    const settled = await allImages();
    await scheduler.run();

    await expect(allImages()).resolves.toEqual(settled);
    expect(settled.find((image) => image.id === id)?.status).toBe("PROCESSED");
    expect(settled.map((image) => image.status).sort()).toEqual(["FAILED", "PENDING", "PROCESSED"]);
  });

  it("keeps an image waiting through storage failures, and leaves it failed after 3 attempts", async () => {
    // Its original was never stored: to the job, the storage keeps failing.
    await insertProductWithDeps(pool);
    const [image] = await allImages();
    await pool.query("UPDATE libreria.product_images SET pending_since = $2 WHERE id = $1", [
      image.id,
      STALLED_AT,
    ]);
    const app = await start();
    const scheduler = app.get(StaleImagesScheduler);
    const attemptsOf = async () =>
      (
        await pool.query<{ status: string; processing_attempts: number; pending_since: Date }>(
          "SELECT status, processing_attempts, pending_since FROM libreria.product_images WHERE id = $1",
          [image.id],
        )
      ).rows[0];

    for (const [minutes, attempts] of [
      [10, 1],
      [20, 2],
      [30, 3],
    ]) {
      clock.current = minutesAfter(minutes);
      await scheduler.run();
      // Postponed from now on: the next run 10 minutes later tries again.
      await expect(attemptsOf()).resolves.toEqual({
        status: "PENDING",
        processing_attempts: attempts,
        pending_since: minutesAfter(minutes),
      });
    }

    clock.current = minutesAfter(40);
    await scheduler.run();
    await expect(attemptsOf()).resolves.toMatchObject({ status: "FAILED", pending_since: null });
  });

  it("recovers a stalled image when the app starts", async () => {
    const id = await stalledImage();
    clock.current = minutesAfter(60);

    await start();

    await expect(statusOf(id)).resolves.toBe("PROCESSED");
  });

  it("registers the job every 5 minutes", async () => {
    const app = await start();
    const job = app.get(SchedulerRegistry).getCronJob(STALE_IMAGES_JOB);
    const next = job.nextDate().toJSDate();

    expect(next.getUTCMinutes() % 5).toBe(0);
    expect(next.getUTCSeconds()).toBe(0);
  });
});
