export interface DeleteUserCommand {
  /** The admin deleting the user, recorded as its author. */
  actorId: string;
  userId: string;
}
