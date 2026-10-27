import type { StorageClient } from "@supabase/storage-js";
import { FileStorage, StorageBucket } from "../../application/file-storage.js";

/** The buckets as created in Supabase; locally, in supabase/config.toml. */
export const STORAGE_BUCKETS: Record<StorageBucket, string> = {
  [StorageBucket.PRIVATE]: "product-originals",
  [StorageBucket.PUBLIC]: "product-images",
};

/** Longest wait for any Storage call, so a stalled provider never holds a request. */
export const STORAGE_TIMEOUT_MS = 30_000;

/** A fetch that gives up after the Storage timeout, for the Storage client. */
export const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) });

/**
 * Supabase Storage. The client answers with `{ error }` instead of rejecting, so each error is
 * turned into a rejection that keeps it as the cause.
 */
export class SupabaseFileStorage extends FileStorage {
  constructor(private readonly client: StorageClient) {
    super();
  }

  async upload(
    bucket: StorageBucket,
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<void> {
    // Never overwrites: every key names one file.
    const { error } = await this.client
      .from(STORAGE_BUCKETS[bucket])
      .upload(key, body, { contentType, upsert: false });
    if (error) {
      throw new Error(`Storage upload of ${key} failed`, { cause: error });
    }
  }

  async remove(bucket: StorageBucket, keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    const { error } = await this.client.from(STORAGE_BUCKETS[bucket]).remove(keys);
    if (error) {
      throw new Error(`Storage removal of ${keys.join(", ")} failed`, { cause: error });
    }
  }

  async signedUrls(keys: string[], expiresInSeconds: number): Promise<(string | null)[]> {
    if (keys.length === 0) {
      return [];
    }
    const { data, error } = await this.client
      .from(STORAGE_BUCKETS[StorageBucket.PRIVATE])
      .createSignedUrls(keys, expiresInSeconds);
    if (error) {
      throw new Error(`Storage signing of ${keys.join(", ")} failed`, { cause: error });
    }
    const byKey = new Map(data.map((entry) => [entry.path, entry.error ? null : entry.signedUrl]));
    return keys.map((key) => byKey.get(key) ?? null);
  }

  /** Built by the client, with no call to Storage. */
  publicUrl(key: string): string {
    return this.client.from(STORAGE_BUCKETS[StorageBucket.PUBLIC]).getPublicUrl(key).data.publicUrl;
  }
}
