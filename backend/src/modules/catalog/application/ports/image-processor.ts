/** The version of an image the store shows, as a WebP file. */
export interface PublicImageVersion {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/** Turns an uploaded original into its public version; rejects a file it cannot read. */
export abstract class ImageProcessor {
  abstract toPublicVersion(original: Uint8Array): Promise<PublicImageVersion>;
}
