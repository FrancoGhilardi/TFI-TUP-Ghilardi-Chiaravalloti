import { StorageClient } from "@supabase/storage-js";
import { FileStorage, StorageBucket } from "../../application/file-storage.js";
import { STORAGE_BUCKETS } from "./storage-buckets.js";

/** Longest wait for any Storage call, so a stalled provider never holds a request. */
export const STORAGE_TIMEOUT_MS = 30_000;

/** A fetch that gives up after the Storage timeout, for the Storage client. */
export const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) });

/** A Storage client of the project at `url` that acts with `key`, under the Storage timeout. */
export function createStorageClient(url: string, key: string): StorageClient {
  const base = new URL(url);
  // Keeps a path the project URL may have, as a self-hosted one behind a prefix.
  base.pathname = `${base.pathname.replace(/\/$/, "")}/storage/v1`;
  return new StorageClient(
    base.toString(),
    { apikey: key, Authorization: `Bearer ${key}` },
    fetchWithTimeout,
  );
}

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

  async download(bucket: StorageBucket, key: string): Promise<Uint8Array> {
    const { data, error } = await this.client.from(STORAGE_BUCKETS[bucket]).download(key);
    if (error) {
      throw new Error(`Storage download of ${key} failed`, { cause: error });
    }
    return new Uint8Array(await data.arrayBuffer());
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
