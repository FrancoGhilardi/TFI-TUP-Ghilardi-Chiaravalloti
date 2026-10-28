/** A new original file for an image; its alt text stays. */
export interface ReplaceProductImageFileCommand {
  productId: string;
  imageId: string;
  /** The file as received; its format is read from its first bytes. */
  bytes: Uint8Array;
}
