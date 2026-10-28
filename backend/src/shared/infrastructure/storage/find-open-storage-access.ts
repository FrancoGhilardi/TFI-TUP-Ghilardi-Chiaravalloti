import { randomUUID } from "node:crypto";
import type { StorageClient } from "@supabase/storage-js";
import { type BucketSettings, STORAGE_BUCKET_SETTINGS } from "./storage-buckets.js";

/** Where the probe files go; they are removed before the check ends. */
const PROBE_FOLDER = "storage-check";

/**
 * What anyone with the project's anon key can do on the buckets beyond reading the public
 * address of a processed image; empty when only the backend can touch the files. The backend
 * (`admin`, with the service_role key) puts one probe file in each bucket and removes it
 * afterwards. Rejects when the anon key itself is turned down, since nothing could be checked.
 */
export async function findOpenStorageAccess(
  admin: StorageClient,
  anyone: StorageClient,
  buckets: BucketSettings[] = Object.values(STORAGE_BUCKET_SETTINGS),
): Promise<string[]> {
  const { data: visible, error } = await anyone.listBuckets();
  if (error) {
    throw new Error("Storage check with the anon key failed", { cause: error });
  }
  const problems =
    visible.length > 0 ? [`anyone sees the buckets ${visible.map((b) => b.name).join(", ")}`] : [];
  for (const settings of buckets) {
    problems.push(...(await probeBucket(admin, anyone, settings)));
  }
  return problems;
}

async function probeBucket(
  admin: StorageClient,
  anyone: StorageClient,
  settings: BucketSettings,
): Promise<string[]> {
  const contentType = settings.allowedMimeTypes[0];
  const probe = `${PROBE_FOLDER}/${randomUUID()}`;
  const intruder = `${PROBE_FOLDER}/${randomUUID()}`;
  const body = Uint8Array.from([0]);
  const { error: uploadError } = await admin
    .from(settings.name)
    .upload(probe, body, { contentType, upsert: false });
  if (uploadError) {
    throw new Error(`Storage check of bucket ${settings.name} failed`, { cause: uploadError });
  }

  const problems: string[] = [];
  try {
    const bucket = anyone.from(settings.name);
    const listed = await bucket.list(PROBE_FOLDER);
    if ((listed.data ?? []).length > 0) {
      problems.push(`anyone lists the files of ${settings.name}`);
    }
    // A public bucket serves its files to anyone, which is what it is for.
    if (!settings.isPublic && !(await bucket.download(probe)).error) {
      problems.push(`anyone downloads the files of ${settings.name}`);
    }
    if (!(await bucket.upload(intruder, body, { contentType, upsert: false })).error) {
      problems.push(`anyone uploads files to ${settings.name}`);
    }
    await bucket.remove([probe]);
    if ((await admin.from(settings.name).download(probe)).error) {
      problems.push(`anyone removes the files of ${settings.name}`);
    }
  } finally {
    const { error: cleanupError } = await admin.from(settings.name).remove([probe, intruder]);
    if (cleanupError) {
      // The check itself still holds; only the probe files may be left behind.
      problems.push(`the probe files in ${settings.name}/${PROBE_FOLDER} could not be removed`);
    }
  }
  return problems;
}
