import type { StorageClient } from "@supabase/storage-js";
import { type BucketSettings, STORAGE_BUCKET_SETTINGS } from "./storage-buckets.js";

export type BucketSetup = "created" | "updated" | "unchanged";

interface StoredBucket {
  name: string;
  public: boolean;
  file_size_limit?: number | string | null;
  allowed_mime_types?: string[] | null;
}

const sameTypes = (stored: string[] | null | undefined, wanted: string[]) =>
  JSON.stringify([...(stored ?? [])].sort()) === JSON.stringify([...wanted].sort());

/** Whether a stored bucket already is as the settings say. */
export function matchesSettings(stored: StoredBucket, settings: BucketSettings): boolean {
  return (
    stored.public === settings.isPublic &&
    // Compared as a number, in case a Storage version gives the column as text.
    Number(stored.file_size_limit) === settings.fileSizeLimitBytes &&
    sameTypes(stored.allowed_mime_types, settings.allowedMimeTypes)
  );
}

/**
 * Creates each bucket that is missing and updates each one that differs from its settings, so
 * running it again changes nothing. Needs the service_role key. Rejects on the first failure,
 * with the provider's error as the cause.
 */
export async function setupStorageBuckets(
  client: StorageClient,
  buckets: BucketSettings[] = Object.values(STORAGE_BUCKET_SETTINGS),
): Promise<Map<string, BucketSetup>> {
  const { data: stored, error } = await client.listBuckets();
  if (error) {
    throw new Error("Storage bucket listing failed", { cause: error });
  }
  const results = new Map<string, BucketSetup>();
  for (const settings of buckets) {
    const options = {
      public: settings.isPublic,
      fileSizeLimit: settings.fileSizeLimitBytes,
      allowedMimeTypes: settings.allowedMimeTypes,
    };
    const existing = stored.find((bucket) => bucket.name === settings.name);
    if (existing && matchesSettings(existing, settings)) {
      results.set(settings.name, "unchanged");
      continue;
    }
    const { error: failure } = existing
      ? await client.updateBucket(settings.name, options)
      : await client.createBucket(settings.name, options);
    if (failure) {
      throw new Error(`Storage setup of bucket ${settings.name} failed`, { cause: failure });
    }
    results.set(settings.name, existing ? "updated" : "created");
  }
  return results;
}
