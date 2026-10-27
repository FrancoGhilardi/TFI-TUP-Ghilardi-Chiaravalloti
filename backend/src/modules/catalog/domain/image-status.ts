/** Where an image is in its processing; values match the `image_status` database enum. */
export enum ImageStatus {
  PENDING = "PENDING",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
}
