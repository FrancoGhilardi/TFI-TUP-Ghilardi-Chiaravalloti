import { StorageBucket } from "../../application/file-storage.js";

/** The buckets as created in Supabase. */
export const STORAGE_BUCKETS: Record<StorageBucket, string> = {
  [StorageBucket.PRIVATE]: "product-originals",
  [StorageBucket.PUBLIC]: "product-images",
};

export interface BucketSettings {
  name: string;
  /** Whether anyone can read its files by their public address; nothing else is ever open. */
  isPublic: boolean;
  fileSizeLimitBytes: number;
  allowedMimeTypes: string[];
}

const TEN_MIB = 10 * 1024 * 1024;

/**
 * How each bucket must be, wherever it runs. `pnpm storage:setup` applies it to a Supabase
 * project; locally, supabase/config.toml declares the same and a test checks they agree.
 */
export const STORAGE_BUCKET_SETTINGS: Record<StorageBucket, BucketSettings> = {
  // Uploaded originals of the product images; only the backend reads them.
  [StorageBucket.PRIVATE]: {
    name: STORAGE_BUCKETS[StorageBucket.PRIVATE],
    isPublic: false,
    fileSizeLimitBytes: TEN_MIB,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  // Processed versions the store shows.
  [StorageBucket.PUBLIC]: {
    name: STORAGE_BUCKETS[StorageBucket.PUBLIC],
    isPublic: true,
    fileSizeLimitBytes: TEN_MIB,
    allowedMimeTypes: ["image/webp"],
  },
};
