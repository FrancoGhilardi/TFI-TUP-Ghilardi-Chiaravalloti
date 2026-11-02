/** The private space keeps uploaded originals; the public one, what the store shows. */
export enum StorageBucket {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
}

/** Keeps files by key. Every failure rejects, with the provider's error as the cause. */
export abstract class FileStorage {
  abstract upload(
    bucket: StorageBucket,
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<void>;

  /** The file's content; a key that is not there is a failure. */
  abstract download(bucket: StorageBucket, key: string): Promise<Uint8Array>;

  /** Removing a key that is not there is not a failure. */
  abstract remove(bucket: StorageBucket, keys: string[]): Promise<void>;

  /**
   * Temporary links to private files, in the order of `keys`, in one call; a key that cannot
   * be signed, such as a missing file, gets `null`.
   */
  abstract signedUrls(keys: string[], expiresInSeconds: number): Promise<(string | null)[]>;

  /** The lasting address of a file in the public space; it is not checked to exist. */
  abstract publicUrl(key: string): string;
}
