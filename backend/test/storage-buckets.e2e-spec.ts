import { randomUUID } from "node:crypto";
import {
  matchesSettings,
  setupStorageBuckets,
} from "./../src/shared/infrastructure/storage/setup-storage-buckets.js";
import {
  type BucketSettings,
  STORAGE_BUCKET_SETTINGS,
} from "./../src/shared/infrastructure/storage/storage-buckets.js";
import { createStorageClient } from "./../src/shared/infrastructure/storage/supabase-file-storage.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const client = createStorageClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

async function storedBucket(name: string) {
  const { data, error } = await client.getBucket(name);
  if (error) {
    throw error;
  }
  return data;
}

describe("Storage buckets setup (e2e)", () => {
  it.each(Object.values(STORAGE_BUCKET_SETTINGS))(
    "finds the local $name bucket as the code defines it",
    async (settings) => {
      expect(matchesSettings(await storedBucket(settings.name), settings)).toBe(true);
    },
  );

  describe("on a bucket that is missing or differs", () => {
    const settings: BucketSettings = {
      name: `test-${randomUUID()}`,
      isPublic: false,
      fileSizeLimitBytes: 1024 * 1024,
      allowedMimeTypes: ["image/webp"],
    };

    afterAll(async () => {
      const { error } = await client.deleteBucket(settings.name);
      expect(error).toBeNull();
    });

    it("creates it, puts it back after a change, and then changes nothing", async () => {
      await expect(setupStorageBuckets(client, [settings])).resolves.toEqual(
        new Map([[settings.name, "created"]]),
      );
      expect(matchesSettings(await storedBucket(settings.name), settings)).toBe(true);

      await client.updateBucket(settings.name, { public: true, allowedMimeTypes: null });
      await expect(setupStorageBuckets(client, [settings])).resolves.toEqual(
        new Map([[settings.name, "updated"]]),
      );
      expect(matchesSettings(await storedBucket(settings.name), settings)).toBe(true);

      await expect(setupStorageBuckets(client, [settings])).resolves.toEqual(
        new Map([[settings.name, "unchanged"]]),
      );
    });
  });

  it("rejects with the provider's error when the key cannot manage buckets", async () => {
    const intruder = createStorageClient(process.env.SUPABASE_URL ?? "", "not-a-key");

    await expect(setupStorageBuckets(intruder)).rejects.toMatchObject({
      message: "Storage bucket listing failed",
      cause: expect.anything() as unknown,
    });
  });
});
