/** Base of all entities: two entities are equal when they share the same id. */
export abstract class Entity {
  protected constructor(protected readonly id: string) {}

  getId(): string {
    return this.id;
  }

  equals(other: Entity): boolean {
    return other.constructor === this.constructor && other.id === this.id;
  }
}
