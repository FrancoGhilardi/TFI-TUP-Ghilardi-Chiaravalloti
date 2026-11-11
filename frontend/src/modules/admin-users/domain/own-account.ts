/** Whether a user of the list is the one signed in to the panel. */
export const isOwnAccount = (sessionUserId: string | null | undefined, userId: string): boolean =>
  sessionUserId !== null && sessionUserId !== undefined && sessionUserId === userId;
