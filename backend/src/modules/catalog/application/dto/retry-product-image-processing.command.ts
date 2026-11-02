/** An image whose processing failed, to be processed again. */
export interface RetryProductImageProcessingCommand {
  productId: string;
  imageId: string;
}
