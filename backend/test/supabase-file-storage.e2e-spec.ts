import { randomUUID } from "node:crypto";
import { StorageClient } from "@supabase/storage-js";
import { StorageBucket } from "./../src/shared/application/file-storage.js";
import {
  fetchWithTimeout,
  SupabaseFileStorage,
} from "./../src/shared/infrastructure/storage/supabase-file-storage.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function clientFor(key: string) {
  const url = new URL("/storage/v1", process.env.SUPABASE_URL);
  return new StorageClient(
    url.toString(),
    { apikey: key, Authorization: `Bearer ${key}` },
    fetchWithTimeout,
  );
}

describe("SupabaseFileStorage (e2e)", () => {
  const storage = new SupabaseFileStorage(clientFor(process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""));
  const keys: string[] = [];
  const newKey = () => {
    const key = `test/${randomUUID()}.jpg`;
    keys.push(key);
    return key;
  };

  afterAll(async () => {
    await storage.remove(StorageBucket.PRIVATE, keys);
  });

  it("uploads a private file that only a signed link reads", async () => {
    const key = newKey();

    await storage.upload(StorageBucket.PRIVATE, key, JPEG, "image/jpeg");

    const [link] = await storage.signedUrls([key], 60);
    const response = await fetch(link ?? "");
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG);
    const publicUrl = new URL(
      `/storage/v1/object/public/product-originals/${key}`,
      process.env.SUPABASE_URL,
    );
    expect((await fetch(publicUrl)).ok).toBe(false);
  });

  it("never overwrites a key", async () => {
    const key = newKey();
    await storage.upload(StorageBucket.PRIVATE, key, JPEG, "image/jpeg");

    await expect(storage.upload(StorageBucket.PRIVATE, key, JPEG, "image/jpeg")).rejects.toThrow(
      `Storage upload of ${key} failed`,
    );
  });

  it("refuses a format the bucket does not take, keeping the provider error", async () => {
    await expect(
      storage.upload(StorageBucket.PRIVATE, newKey(), JPEG, "text/plain"),
    ).rejects.toMatchObject({ cause: expect.anything() as unknown });
  });

  it("removes files, also keys that are not there", async () => {
    const key = newKey();
    await storage.upload(StorageBucket.PRIVATE, key, JPEG, "image/jpeg");

    await storage.remove(StorageBucket.PRIVATE, [key, `test/${randomUUID()}.jpg`]);

    await expect(storage.signedUrls([key], 60)).resolves.toEqual([null]);
  });

  it("signs several files in one call, in order, and none for no keys", async () => {
    const first = newKey();
    const second = newKey();
    await storage.upload(StorageBucket.PRIVATE, first, JPEG, "image/jpeg");
    await storage.upload(StorageBucket.PRIVATE, second, JPEG, "image/jpeg");

    const links = await storage.signedUrls([second, first], 60);

    expect(links[0]).toContain(second);
    expect(links[1]).toContain(first);
    await expect(storage.signedUrls([], 60)).resolves.toEqual([]);
  });

  it("rejects every call with a wrong key", async () => {
    const intruder = new SupabaseFileStorage(clientFor("not-a-key"));

    await expect(
      intruder.upload(StorageBucket.PRIVATE, newKey(), JPEG, "image/jpeg"),
    ).rejects.toThrow("Storage upload");
  });
});
