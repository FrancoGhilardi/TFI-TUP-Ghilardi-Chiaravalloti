/** Something that happened in the application, told to whoever listens for its `name`. */
export interface ApplicationEvent {
  readonly name: string;
}

/** Tells the listeners of an event, once the change it reports is committed. */
export abstract class EventPublisher {
  abstract publish(event: ApplicationEvent): Promise<void>;
}
