import { EventEmitter2 } from "@nestjs/event-emitter";
import { NestEventPublisher } from "./nest-event-publisher.js";

describe("NestEventPublisher", () => {
  const event = { name: "thing.happened", id: "1" };

  it("delivers the event to the listeners of its name", async () => {
    const emitter = new EventEmitter2();
    const received: unknown[] = [];
    emitter.on("thing.happened", (payload) => received.push(payload));

    await new NestEventPublisher(emitter).publish(event);

    expect(received).toEqual([event]);
  });

  it("rejects when a listener fails", async () => {
    const emitter = new EventEmitter2();
    // An async listener, as the @OnEvent handlers are; the emitter waits for its promise.
    const failing = (): Promise<void> => Promise.reject(new Error("listener failed"));
    emitter.on("thing.happened", failing as () => void);

    await expect(new NestEventPublisher(emitter).publish(event)).rejects.toThrow("listener failed");
  });

  it("resolves when nobody listens", async () => {
    await expect(
      new NestEventPublisher(new EventEmitter2()).publish(event),
    ).resolves.toBeUndefined();
  });
});
