import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { stackWithCauses } from "../../../../shared/application/error-stack.js";
import { ProductImageUploadedEvent } from "../../application/events/product-image-uploaded.event.js";
import { ProcessProductImageUseCase } from "../../application/use-cases/process-product-image.use-case.js";

/**
 * Processes each image as soon as it is uploaded. It never rejects: the image is already
 * marked failed by then, and whoever published the event goes on with the next one.
 */
@Injectable()
export class ProductImageUploadedListener {
  private readonly logger = new Logger(ProductImageUploadedListener.name);

  constructor(private readonly processProductImage: ProcessProductImageUseCase) {}

  @OnEvent(ProductImageUploadedEvent.NAME)
  async handle(event: ProductImageUploadedEvent): Promise<void> {
    try {
      const result = await this.processProductImage.execute(event.imageId);
      this.logger.log(`Image ${event.imageId} ${result}`);
    } catch (error) {
      // A single text, so the logger never takes the details for its context.
      this.logger.error(`Processing image ${event.imageId} went wrong\n${stackWithCauses(error)}`);
    }
  }
}
