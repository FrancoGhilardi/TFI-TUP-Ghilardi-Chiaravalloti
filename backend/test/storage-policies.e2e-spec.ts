import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { StorageBucket } from "./../src/shared/application/file-storage.js";
import { findOpenStorageAccess } from "./../src/shared/infrastructure/storage/find-open-storage-access.js";
import {
  type BucketSettings,
  STORAGE_BUCKETS,
} from "./../src/shared/infrastructure/storage/storage-buckets.js";
import {
  createStorageClient,
  SupabaseFileStorage,
} from "./../src/shared/infrastructure/storage/supabase-file-storage.js";
import { adminPool } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const ORIGINALS = STORAGE_BUCKETS[StorageBucket.PRIVATE];
const IMAGES = STORAGE_BUCKETS[StorageBucket.PUBLIC];

const clientFor = (key: string) => createStorageClient(process.env.SUPABASE_URL ?? "", key);

/** The backend, with service_role, puts the files; anyone else only has the anon key. */
describe("Storage access for anyone (e2e)", () => {
  const backend = new SupabaseFileStorage(clientFor(process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""));
  const anyone = clientFor(process.env.SUPABASE_ANON_KEY ?? "");
  const folder = `test/${randomUUID()}`;
  const original = `${folder}/original.jpg`;
  const image = `${folder}/image.webp`;

  beforeAll(async () => {
    expect(process.env.SUPABASE_ANON_KEY).toBeTruthy();
    await backend.upload(StorageBucket.PRIVATE, original, JPEG, "image/jpeg");
    await backend.upload(StorageBucket.PUBLIC, image, WEBP, "image/webp");
  });

  afterAll(async () => {
    await backend.remove(StorageBucket.PRIVATE, [original, `${folder}/intruder.jpg`]);
    await backend.remove(StorageBucket.PUBLIC, [image, `${folder}/intruder.webp`]);
  });

  describe("the originals", () => {
    it("are not listed", async () => {
      const { data, error } = await anyone.from(ORIGINALS).list(folder);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("cannot be downloaded nor signed", async () => {
      const download = await anyone.from(ORIGINALS).download(original);
      const signed = await anyone.from(ORIGINALS).createSignedUrl(original, 60);

      // Hidden by the row policies: a wrong key fails otherwise.
      expect(download.error?.message).toBe("Object not found");
      expect(signed.error?.message).toBe("Object not found");
    });

    it("are not served at a public address", async () => {
      const url = anyone.from(ORIGINALS).getPublicUrl(original).data.publicUrl;

      expect((await fetch(url)).ok).toBe(false);
    });

    it("cannot be uploaded nor removed", async () => {
      const upload = await anyone
        .from(ORIGINALS)
        .upload(`${folder}/intruder.jpg`, JPEG, { contentType: "image/jpeg" });
      await anyone.from(ORIGINALS).remove([original]);

      // Turned down by the row policies, so the key itself is valid.
      expect(upload.error?.message).toMatch(/row-level security/);
      await expect(backend.download(StorageBucket.PRIVATE, original)).resolves.toEqual(JPEG);
    });
  });

  describe("the processed images", () => {
    it("are served to anyone at their public address", async () => {
      const response = await fetch(backend.publicUrl(image));

      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(WEBP);
    });

    it("cannot be uploaded nor removed", async () => {
      const upload = await anyone
        .from(IMAGES)
        .upload(`${folder}/intruder.webp`, WEBP, { contentType: "image/webp" });
      await anyone.from(IMAGES).remove([image]);

      expect(upload.error?.message).toMatch(/row-level security/);
      expect((await fetch(backend.publicUrl(image))).status).toBe(200);
    });
  });

  it("sees no bucket", async () => {
    const { data, error } = await anyone.listBuckets();

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("findOpenStorageAccess (e2e)", () => {
  const admin = clientFor(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const anyone = clientFor(process.env.SUPABASE_ANON_KEY ?? "");

  it("finds nothing open on the buckets as they are", async () => {
    await expect(findOpenStorageAccess(admin, anyone)).resolves.toEqual([]);
  });

  it("rejects when the anon key is turned down, since nothing could be checked", async () => {
    await expect(findOpenStorageAccess(admin, clientFor("not-a-key"))).rejects.toMatchObject({
      message: "Storage check with the anon key failed",
    });
  });

  describe("on a bucket with a policy that opens it to anyone", () => {
    const settings: BucketSettings = {
      name: `test-${randomUUID()}`,
      isPublic: false,
      fileSizeLimitBytes: 1024 * 1024,
      allowedMimeTypes: ["image/webp"],
    };
    const policy = `test_open_${randomUUID().replaceAll("-", "_")}`;
    let pool: Pool;

    beforeAll(async () => {
      pool = adminPool();
      const { error } = await admin.createBucket(settings.name, {
        public: settings.isPublic,
        allowedMimeTypes: settings.allowedMimeTypes,
      });
      expect(error).toBeNull();
      await pool.query(
        `CREATE POLICY ${policy} ON storage.objects FOR ALL TO anon
         USING (bucket_id = '${settings.name}') WITH CHECK (bucket_id = '${settings.name}')`,
      );
    });

    afterAll(async () => {
      await pool.query(`DROP POLICY IF EXISTS ${policy} ON storage.objects`);
      await pool.end();
      await admin.emptyBucket(settings.name);
      const { error } = await admin.deleteBucket(settings.name);
      expect(error).toBeNull();
    });

    it("tells everything anyone can do there, leaving no probe behind", async () => {
      await expect(findOpenStorageAccess(admin, anyone, [settings])).resolves.toEqual([
        `anyone lists the files of ${settings.name}`,
        `anyone downloads the files of ${settings.name}`,
        `anyone uploads files to ${settings.name}`,
        `anyone removes the files of ${settings.name}`,
      ]);
      const { data } = await admin.from(settings.name).list("storage-check");
      expect(data).toEqual([]);
    });
  });
});
