import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { type ApplicationEvent, EventPublisher } from "../../application/event-publisher.js";

/** Events inside the same process, delivered to the `@OnEvent` listeners of their name. */
@Injectable()
export class NestEventPublisher extends EventPublisher {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  async publish(event: ApplicationEvent): Promise<void> {
    // Waits for the listeners, so their failure reaches the caller instead of being lost.
    await this.emitter.emitAsync(event.name, event);
  }
}
