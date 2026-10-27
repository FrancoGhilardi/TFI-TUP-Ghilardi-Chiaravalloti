import type { ApplicationEvent } from "../../../../shared/application/event-publisher.js";

/** An image is waiting to be processed: just added, replaced or retried. */
export class ProductImageUploadedEvent implements ApplicationEvent {
  static readonly NAME = "product-image.uploaded";
  readonly name = ProductImageUploadedEvent.NAME;

  constructor(readonly imageId: string) {}
}
